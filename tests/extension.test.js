import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { repoRoot } from "./helpers.js";

const extensionPath = join(repoRoot, "extensions", "pstack.js");

/**
 * Run the extension the way Pi does: call its factory with a recording API
 * stub, then drive the handlers directly. No Pi install and no model needed.
 */
async function load() {
  const { default: factory } = await import(pathToFileURL(extensionPath).href);
  const handlers = new Map();
  const entries = [];
  const commands = new Map();
  const statuses = [];
  const notifications = [];
  const sent = [];
  // The stub mirrors where Pi actually puts each method: sendUserMessage and
  // appendEntry are on the extension API, not on a handler's ctx. Getting this
  // wrong makes a broken call pass here and fail in a real session.
  const pi = {
    on: (event, handler) => handlers.set(event, handler),
    appendEntry: (customType, data) => entries.push({ type: "custom", customType, data }),
    registerCommand: (name, command) => commands.set(name, command),
    sendUserMessage: (text, options) => sent.push({ text, options }),
  };
  factory(pi);
  const ctx = {
    mode: "tui",
    hasUI: true,
    ui: {
      setStatus: (key, value) => statuses.push([key, value]),
      notify: (text) => notifications.push(text),
    },
  };
  const turn = (sections = {}) => {
    const event = { systemPromptOptions: { sections } };
    handlers.get("before_agent_start")(event);
    return event.systemPromptOptions.sections;
  };
  const command = commands.get("pstack");
  return { handlers, entries, statuses, notifications, sent, ctx, turn, command };
}

const branchOf = (...entries) => ({ sessionManager: { getBranch: () => entries } });

test("the extension registers every hook the mode needs", async () => {
  const { handlers, command } = await load();
  for (const event of ["session_start", "input", "before_agent_start"]) {
    assert.equal(typeof handlers.get(event), "function", `${event} has a handler`);
  }
  assert.equal(typeof command?.handler, "function", "/pstack is a registered command");
  assert.match(command.description, /off/, "the description names the way out");
});

test("the writing rules go into a section on every turn, mode or not", async () => {
  const { turn } = await load();
  const sections = turn();
  assert.equal(Object.keys(sections).join(), "prose_rules");

  const name = "prose_rules";
  // Pi throws on a section name that is not `^[a-z][a-z0-9_-]*$` or that is
  // "preamble", and it throws inside the handler, so a bad name would report an
  // extension error on every turn.
  assert.match(name, /^[a-z][a-z0-9_-]*$/);
  assert.notEqual(name, "preamble");

  const bullets = sections[name].split("\n").filter((line) => line.startsWith("- "));
  assert.ok(bullets.length >= 10, `the rule list survived intact (${bullets.length} bullets)`);
  assert.match(sections[name], /No em dashes/);
  assert.match(sections[name], /Active voice/);
  assert.match(sections[name], /did not watch you work/, "the plain-speech rules are on by default");
  assert.doesNotMatch(sections[name], /\*\*|—/, "the injected text does not break its own rules");

  for (const skill of ["pstack-unslop", "pstack-technical-writing"]) {
    const path = join(repoRoot, "skills", skill, "SKILL.md");
    assert.ok(existsSync(path), `${skill} ships with the package`);
    assert.ok(sections[name].includes(path), `the section names the absolute path to ${skill}`);
  }
});

test("the mode section is absent until the mode is on, then present, then gone", async () => {
  const { turn, command, ctx } = await load();

  assert.equal(turn().pstack_mode, undefined, "a fresh session carries no mode reminder");

  await command.handler("", ctx);
  const on = turn();
  assert.match(on.pstack_mode, /pstack mode is on/);
  assert.ok(
    on.pstack_mode.includes(join(repoRoot, "skills", "pstack", "SKILL.md")),
    "the reminder names the entry skill by absolute path, so the model can read it",
  );
  assert.match(on.prose_rules, /No em dashes/, "turning the mode on does not drop the writing rules");

  await command.handler("off", ctx);
  assert.equal(turn().pstack_mode, undefined, "turning the mode off removes the section");
});

test("the reminder stays small instead of resending the entry skill", async () => {
  const { turn, command, ctx } = await load();
  await command.handler("", ctx);
  const text = turn().pstack_mode;
  assert.ok(text.length < 2000, `the reminder stays short (${text.length} chars)`);
  assert.match(text, /Evidence, not assertion/, "the every-turn rules apply without loading the skill");
  assert.match(text, /do not read it again/, "the skill is read once, not every turn");
  assert.doesNotMatch(text, /^# |\n## /, "the skill body is not pasted into the prompt");
});

test("/pstack <task> turns the mode on and runs the entry skill in one step", async () => {
  const { command, ctx, sent, entries } = await load();
  await command.handler("fix the retry regression", ctx);

  assert.deepEqual(sent, [
    {
      text: "/skill:pstack fix the retry regression",
      options: { expandPromptTemplates: true },
    },
  ]);
  assert.deepEqual(
    entries.map((entry) => entry.data),
    [{ enabled: true }],
    "the mode is persisted so a resume brings it back",
  );
});

test("naming /pstack off is not treated as a task", async () => {
  const { command, ctx, sent, notifications } = await load();
  for (const word of ["off", "OFF", "disable", "stop", "exit"]) {
    await command.handler(word, ctx);
    assert.equal(sent.length, 0, `"${word}" does not run a task`);
  }
  assert.equal(notifications.length, 5, "each one reports the mode is off");
});

test("a resumed session restores the mode from the branch, and the last entry wins", async () => {
  const { handlers, turn, statuses } = await load();
  const start = handlers.get("session_start");

  start({}, { ui: { setStatus: (k, v) => statuses.push([k, v]) } });
  assert.equal(turn().pstack_mode, undefined, "no entry means the mode is off");

  const on = { type: "custom", customType: "pstack-mode", data: { enabled: true } };
  const off = { type: "custom", customType: "pstack-mode", data: { enabled: false } };

  start({}, { ui: { setStatus: () => {} }, ...branchOf({ type: "message" }, on) });
  assert.match(turn().pstack_mode, /pstack mode is on/, "an enabled entry restores the mode");

  start({}, { ui: { setStatus: () => {} }, ...branchOf(on, { type: "message" }, off) });
  assert.equal(turn().pstack_mode, undefined, "a later disable wins");

  start({}, { ui: { setStatus: () => {} }, ...branchOf(on, { type: "message" }, off, on) });
  assert.match(turn().pstack_mode, /pstack mode is on/, "turning it back on is remembered");
});

test("typing the entry skill the usual way also enters the mode", async () => {
  const { handlers, turn, entries } = await load();
  const input = handlers.get("input");

  input({ text: "/skill:pstack fix this", source: "interactive" });
  assert.match(turn().pstack_mode, /pstack mode is on/);
  assert.equal(entries.length, 1, "the direct route is persisted too");

  // /pstack <task> sends this same text itself, after already setting the flag.
  // Re-entering on that echo would append a second, pointless session entry.
  const echo = await load();
  echo.handlers.get("input")({ text: "/skill:pstack fix this", source: "extension" });
  assert.equal(echo.entries.length, 0, "the extension's own message does not re-enter the mode");

  for (const text of ["/skill:pstack-how what does X do", "tell me about /skill:pstack"]) {
    const fresh = await load();
    fresh.handlers.get("input")({ text, source: "interactive" });
    assert.equal(
      fresh.turn().pstack_mode,
      undefined,
      `"${text}" is a different skill or a mention, not the entry`,
    );
  }
});

test("a session that cannot be read leaves the mode off instead of throwing", async () => {
  const { handlers, turn } = await load();
  const broken = {
    sessionManager: {
      getBranch: () => {
        throw new Error("no session");
      },
    },
    ui: { setStatus: () => {} },
  };
  assert.doesNotThrow(() => handlers.get("session_start")({}, broken));
  assert.equal(turn().pstack_mode, undefined);
});

test("re-injecting on later turns is idempotent, so Pi's section diff skips the resend", async () => {
  const { turn, command, ctx } = await load();
  await command.handler("", ctx);
  const first = turn();
  const second = turn();
  assert.deepEqual(second, first);
});

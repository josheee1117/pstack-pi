import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { repoRoot, skillsDir } from "./helpers.js";

const extensionPath = join(repoRoot, "extensions", "pstack.js");
const ENTRY_SKILL = join(skillsDir, "poteto-mode", "SKILL.md");

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
  const read = (path) =>
    handlers.get("tool_result")({
      toolName: "read",
      input: { path },
      content: [{ type: "text", text: "file body" }],
      isError: false,
    });
  const command = commands.get("pstack");
  return { handlers, entries, statuses, notifications, sent, ctx, turn, read, command };
}

const branchOf = (...entries) => ({ sessionManager: { getBranch: () => entries } });
const custom = (customType, data) => ({ type: "custom", customType, data });

test("the extension registers every hook it needs", async () => {
  const { handlers, command } = await load();
  for (const event of ["session_start", "input", "tool_result", "before_agent_start"]) {
    assert.equal(typeof handlers.get(event), "function", `${event} has a handler`);
  }
  assert.equal(typeof command?.handler, "function", "/pstack is a registered command");
  assert.match(command.description, /off/, "the description names the way out");
});

test("the writing rules go into a section on every turn, and nothing else does until pstack is used", async () => {
  const { turn } = await load();
  const sections = turn();
  assert.deepEqual(Object.keys(sections), ["prose_rules"], "a session that never touches pstack pays for the rules only");

  // Pi throws on a section name that is not `^[a-z][a-z0-9_-]*$` or that is
  // "preamble", inside the handler, so a bad name would fail every turn.
  for (const name of ["prose_rules", "pstack_adapter", "pstack_mode"]) {
    assert.match(name, /^[a-z][a-z0-9_-]*$/);
  }

  const text = sections.prose_rules;
  const bullets = text.split("\n").filter((line) => line.startsWith("- "));
  assert.ok(bullets.length >= 10, `the rule list survived intact (${bullets.length} bullets)`);
  assert.match(text, /did not watch you work/, "the plain-speech rules are on by default");
  assert.match(text, /No em dashes/);
  assert.doesNotMatch(text, /\*\*|—/, "the injected text does not break its own rules");
  for (const skill of ["unslop", "technical-writing"]) {
    const path = join(skillsDir, skill, "SKILL.md");
    assert.ok(existsSync(path), `${skill} ships with the package`);
    assert.ok(text.includes(path), `the section names the absolute path to ${skill}`);
  }
});

test("any pstack skill command turns the adapter on, and it stays on", async () => {
  for (const text of ["/skill:pstack fix it", "/skill:pstack-how what does X do", "/skill:pstack-principle-fix-root-causes"]) {
    const { handlers, turn, entries } = await load();
    handlers.get("input")({ text, source: "interactive" });
    const sections = turn();
    assert.ok(sections.pstack_adapter, `"${text}" injects the adapter`);
    assert.ok(turn().pstack_adapter, "and it stays on later turns");
    assert.ok(entries.some((e) => e.customType === "pstack-adapter"), "the adapter flag is persisted");
  }

  for (const text of ["tell me about /skill:pstack", "/skill:pstackish", "/skill:other-skill"]) {
    const { handlers, turn } = await load();
    handlers.get("input")({ text, source: "interactive" });
    assert.equal(turn().pstack_adapter, undefined, `"${text}" is not a pstack skill command`);
  }
});

test("the adapter carries the overrides and the platform map with every path filled in", async () => {
  const { handlers, turn } = await load();
  handlers.get("input")({ text: "/skill:pstack-how x", source: "interactive" });
  const text = turn().pstack_adapter;

  assert.match(text, /^# Operator overrides/, "the overrides come first, so they frame the map");
  assert.match(text, /Fix only what the request needs/);
  assert.match(text, /# pstack on Pi/);
  assert.doesNotMatch(text, /\{\{\w+\}\}/, "no placeholder is left unfilled");

  const paths = [...text.matchAll(/(\/[^\s`,;)]+\.md)\b/g)]
    .map((m) => m[1])
    .filter((p) => p.startsWith(`${repoRoot}/`) && !p.includes("<"));
  assert.ok(paths.length >= 5, `the map names the package's own files (${paths.length} found)`);
  for (const path of paths) assert.ok(existsSync(path), `${path} exists`);
});

test("the first read of a pstack skill file carries the adapter; later reads keep only the overrides", async () => {
  const { read, turn, entries, handlers } = await load();

  assert.equal(read("/etc/hosts"), undefined, "a file outside the package is untouched");
  assert.equal(read(join(repoRoot, "..", "skills", "how", "SKILL.md")), undefined, "a look-alike path outside the package is untouched");

  const first = read(join(skillsDir, "how", "SKILL.md"));
  assert.equal(first.content[0].text, "file body", "the file's own content is kept first");
  assert.match(first.content[1].text, /Operator overrides/, "the adapter rides along in the same result");
  assert.ok(entries.some((e) => e.customType === "pstack-adapter"));

  const later = read(join(skillsDir, "why", "SKILL.md"));
  assert.match(later.content.at(-1).text, /Operator overrides/, "a later skill read still ends with the overrides");
  assert.doesNotMatch(later.content.at(-1).text, /# pstack on Pi/, "a later skill read does not repeat the platform map");
  assert.equal(handlers.get("tool_result")({
    toolName: "read",
    input: { path: join(skillsDir, "why", "SKILL.md") },
    content: later.content,
    isError: false,
  }), undefined, "the override is not appended again onto itself");
  assert.ok(turn().pstack_adapter, "from the next prompt on, the adapter is a section");
});

test("a pstack skill command ends with the overrides once, after Pi would expand the skill", async () => {
  const { handlers } = await load();
  const first = handlers.get("input")({ text: "/skill:pstack fix the March total", source: "interactive" });
  assert.equal(first.action, "transform");
  assert.match(first.text, /^\/skill:pstack fix the March total\n\n# Operator overrides/);
  assert.doesNotMatch(first.text, /# pstack on Pi/);
  assert.match(first.text, /already accepted/);
  const again = handlers.get("input")({ text: first.text, source: "extension" });
  assert.equal(again, undefined, "a second pass does not stack another copy");

  const other = handlers.get("input")({ text: "/skill:pstack-how what does X do", source: "interactive" });
  assert.equal(other.action, "transform");
  assert.match(other.text, /# Operator overrides/);
  assert.equal(handlers.get("input")({ text: "tell me about /skill:pstack", source: "interactive" }), undefined);
});

test("a relative read path is resolved against the session's cwd", async () => {
  const { handlers } = await load();
  const result = handlers.get("tool_result")(
    { toolName: "read", input: { path: "skills/how/SKILL.md" }, content: [], isError: false },
    { cwd: repoRoot },
  );
  assert.match(result.content[0].text, /Operator overrides/);
});

test("a failed read is left alone", async () => {
  const { handlers } = await load();
  const result = handlers.get("tool_result")({
    toolName: "read",
    input: { path: join(skillsDir, "how", "SKILL.md") },
    content: [{ type: "text", text: "ENOENT" }],
    isError: true,
  });
  assert.equal(result, undefined);
});

test("the mode section is absent until the mode is on, then present, then gone", async () => {
  const { turn, command, ctx } = await load();
  assert.equal(turn().pstack_mode, undefined, "a fresh session carries no mode reminder");

  await command.handler("", ctx);
  const on = turn();
  assert.match(on.pstack_mode, /pstack mode is on/);
  assert.ok(on.pstack_mode.includes(ENTRY_SKILL), "the reminder names the entry skill by absolute path");
  assert.ok(existsSync(ENTRY_SKILL));
  assert.ok(on.pstack_adapter, "the mode brings the adapter with it");
  assert.ok(on.prose_rules, "turning the mode on does not drop the writing rules");

  await command.handler("off", ctx);
  const off = turn();
  assert.equal(off.pstack_mode, undefined, "turning the mode off removes the reminder");
  assert.ok(off.pstack_adapter, "the adapter stays: the session already used pstack");
});

test("the reminder stays small instead of resending the entry skill", async () => {
  const { turn, command, ctx } = await load();
  await command.handler("", ctx);
  const text = turn().pstack_mode;
  assert.ok(text.length < 1000, `the reminder stays short (${text.length} chars)`);
  assert.match(text, /after compaction/, "read again when compaction removed the skill, not every turn");
  assert.doesNotMatch(text, /^# |\n## /, "the skill body is not pasted into the prompt");
});

test("/pstack <task> turns the mode on and runs the entry skill in one step", async () => {
  const { command, ctx, sent, entries } = await load();
  await command.handler("fix the retry regression", ctx);

  assert.deepEqual(sent, [
    { text: "/skill:pstack fix the retry regression", options: { expandPromptTemplates: true } },
  ]);
  assert.deepEqual(
    entries.map((entry) => [entry.customType, entry.data]),
    [
      ["pstack-mode", { enabled: true }],
      ["pstack-adapter", { enabled: true }],
    ],
    "both flags are persisted so a resume brings them back",
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

test("a resumed session restores both flags from the branch, and the last mode entry wins", async () => {
  const { handlers, turn } = await load();
  const start = handlers.get("session_start");
  const ui = { ui: { setStatus: () => {} } };
  const on = custom("pstack-mode", { enabled: true });
  const off = custom("pstack-mode", { enabled: false });
  const adapter = custom("pstack-adapter", { enabled: true });

  start({}, ui);
  assert.deepEqual(Object.keys(turn()), ["prose_rules"], "no entries means neither is on");

  start({}, { ...ui, ...branchOf({ type: "message" }, adapter) });
  assert.ok(turn().pstack_adapter, "an adapter entry restores the adapter");
  assert.equal(turn().pstack_mode, undefined);

  start({}, { ...ui, ...branchOf(on) });
  assert.match(turn().pstack_mode, /pstack mode is on/, "an enabled entry restores the mode");

  start({}, { ...ui, ...branchOf(on, { type: "message" }, off) });
  assert.equal(turn().pstack_mode, undefined, "a later disable wins");

  start({}, { ...ui, ...branchOf(on, off, on) });
  assert.match(turn().pstack_mode, /pstack mode is on/, "turning it back on is remembered");
});

test("typing the entry skill the usual way also enters the mode", async () => {
  const { handlers, turn, entries } = await load();
  handlers.get("input")({ text: "/skill:pstack fix this", source: "interactive" });
  assert.match(turn().pstack_mode, /pstack mode is on/);
  assert.equal(entries.filter((e) => e.customType === "pstack-mode").length, 1);

  // /pstack <task> sends this same text itself, after already setting the flags.
  const echo = await load();
  await echo.command.handler("fix this", echo.ctx);
  const count = echo.entries.length;
  echo.handlers.get("input")({ text: "/skill:pstack fix this", source: "extension" });
  assert.equal(echo.entries.length, count, "the extension's own message does not re-enter the mode");

  const other = await load();
  other.handlers.get("input")({ text: "/skill:pstack-how what does X do", source: "interactive" });
  assert.equal(other.turn().pstack_mode, undefined, "another pstack skill is not the entry");
});

test("a session that cannot be read leaves both off instead of throwing", async () => {
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
  assert.deepEqual(Object.keys(turn()), ["prose_rules"]);
});

test("re-injecting on later turns is idempotent, so Pi's section diff skips the resend", async () => {
  const { turn, command, ctx } = await load();
  await command.handler("", ctx);
  assert.deepEqual(turn(), turn());
});

test("original Pi systemPrompt API stays stable and removes mode on exit", async () => {
  const { handlers, command, ctx } = await load();
  const start = handlers.get("before_agent_start");
  const fresh = start({ systemPrompt: "Existing host instructions" }).systemPrompt;
  assert.ok(fresh.startsWith("Existing host instructions"));
  assert.doesNotMatch(fresh, /<pstack_mode>/);
  assert.equal(start({ systemPrompt: fresh }).systemPrompt, fresh, "replay does not append duplicate blocks");
  await command.handler("", ctx);
  const on = start({ systemPrompt: fresh }).systemPrompt;
  assert.match(on, /<pstack_mode>/);
  await command.handler("off", ctx);
  const off = start({ systemPrompt: on }).systemPrompt;
  assert.doesNotMatch(off, /<pstack_mode>/);
  assert.equal((off.match(/<pstack-runtime>/g) ?? []).length, 1);
});

test("structured prompts remove a stale mode section and retain other extensions", async () => {
  const { turn, command, ctx } = await load();
  await command.handler("", ctx);
  const sections = turn({ other_extension: "keep me" });
  await command.handler("off", ctx);
  turn(sections);
  assert.equal(sections.pstack_mode, undefined);
  assert.equal(sections.other_extension, "keep me");
});

test("direct platform reads resolve paths even without prior skill entry", async () => {
  const { handlers } = await load();
  const result = handlers.get("tool_result")({
    toolName: "read", input: { path: join(repoRoot, "adapter", "platform.md") },
    content: [{ type: "text", text: "{{skills}}/how/SKILL.md {{agentDir}}" }],
  });
  assert.ok(result.content[0].text.includes(join(skillsDir, "how", "SKILL.md")));
  assert.doesNotMatch(result.content[0].text, /\{\{/);
});

test("original Pi receives its actual session path without a bash environment variable", async () => {
  const { handlers, command, ctx } = await load();
  await command.handler("", ctx);
  const event = { systemPromptOptions: { sections: {} } };
  handlers.get("before_agent_start")(event, { sessionManager: { getSessionFile: () => "/custom project/sessions/current.jsonl" } });
  assert.match(event.systemPromptOptions.sections.pstack_adapter, /\/custom project\/sessions\/current\.jsonl/);
});

test("a command queued by another extension still loads the adapter", async () => {
  const { handlers, turn } = await load();
  handlers.get("input")({ text: "/skill:pstack-why why?", source: "extension" });
  assert.ok(turn().pstack_adapter);
  assert.equal(turn().pstack_mode, undefined);
});

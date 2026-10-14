import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { loadPi, repoRoot, skillsDir } from "./helpers.js";

const extensionPath = join(repoRoot, "extensions", "pstack.js");
const ENTRY_SKILL = join(skillsDir, "poteto-mode", "SKILL.md");

/**
 * Run the extension the way Pi does: call its factory with a recording API
 * stub, then drive the handlers directly. No Pi install and no model needed.
 */
async function load(skillDirs) {
  const module = await import(pathToFileURL(extensionPath).href + (skillDirs ? "?missing-skill-roots" : ""));
  if (skillDirs) module.SKILL_DIRS.splice(0, module.SKILL_DIRS.length, ...skillDirs);
  const factory = module.default;
  const handlers = new Map();
  const entries = [];
  const commands = new Map();
  const statuses = [];
  const notifications = [];
  const sent = [];
  const tools = new Map();
  let activeTools = ["read", "bash", "edit", "write"];
  const widgets = [];
  // The stub mirrors where Pi actually puts each method: sendUserMessage and
  // appendEntry are on the extension API, not on a handler's ctx. Getting this
  // wrong makes a broken call pass here and fail in a real session.
  const pi = {
    on: (event, handler) => handlers.set(event, handler),
    appendEntry: (customType, data) => entries.push({ type: "custom", customType, data }),
    registerCommand: (name, command) => commands.set(name, command),
    sendUserMessage: (text, options) => sent.push({ text, options }),
    registerTool: (tool) => {
      tools.set(tool.name, tool);
      if (tool.defaultActive !== false) activeTools = [...activeTools, tool.name];
    },
    getActiveTools: () => activeTools,
    setActiveTools: (names) => { activeTools = names; },
  };
  factory(pi);
  const ctx = {
    mode: "tui",
    hasUI: true,
    ui: {
      setStatus: (key, value) => statuses.push([key, value]),
      notify: (text) => notifications.push(text),
      setWidget: (key, lines) => widgets.push([key, lines]),
    },
  };
  const widget = () => widgets.at(-1)?.[1];
  const active = () => activeTools;
  const plan = (params) => tools.get("pstack_plan").execute("call-1", params, undefined, undefined, ctx);
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
  return { handlers, entries, statuses, notifications, sent, ctx, turn, read, command, widget, active, plan };
}

const branchOf = (...entries) => ({ sessionManager: { getBranch: () => entries } });
const custom = (customType, data) => ({ type: "custom", customType, data });

test("missing skill roots do not block reads or indexing of the remaining root", async () => {
  const missing = join(repoRoot, "no-such-skill-root");
  const { handlers, turn, widget, ctx } = await load([missing, skillsDir, `${missing}-last`]);
  const result = handlers.get("tool_result")({
    toolName: "read",
    input: { path: join(skillsDir, "how", "SKILL.md") },
    content: [{ type: "text", text: "skill body" }],
    isError: false,
  }, ctx);
  assert.match(result.content.at(-1).text, /# pstack on Pi/);
  assert.ok(turn().pstack_adapter);
  assert.ok(widget().some((line) => line.includes("正在用 how")), "the surviving root is indexed for the skill label");
});

test("the injected adapter resolves the local report path and keeps its final reply rule", async () => {
  const { handlers, turn } = await load();
  handlers.get("input")({ text: "/skill:pstack-how x", source: "interactive" });
  const text = turn().pstack_adapter;
  const reportPath = join(repoRoot, "local-skills", "pstack-report", "SKILL.md");
  assert.ok(text.includes(`its final reply follows ${reportPath}. Read it before writing that reply.`));
  assert.doesNotMatch(text, /\{\{root\}\}/);
});

test("the extension registers every hook it needs", async () => {
  const { handlers, command } = await load();
  for (const event of ["session_start", "input", "tool_result", "before_agent_start", "agent_settled"]) {
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

test("Pi expands transformed skill commands with or without arguments", async (t) => {
  const pi = await loadPi();
  if (!pi) return t.skip("the Pi package is not installed on this machine");
  const skills = { skills: [skillsDir, join(repoRoot, "local-skills")].flatMap((dir) => pi.loadSkillsFromDir({ dir, source: "pstack-pi" }).skills) };
  const context = {
    resourceLoader: { getSkills: () => skills },
    _extensionRunner: { emitError: (event) => { throw new Error(event.error); } },
  };

  for (const skill of skills.skills) {
    for (const suffix of ["", " explain this", "\nexplain this"]) {
      const { handlers } = await load();
      const input = `/skill:${skill.name}${suffix}`;
      const transformed = handlers.get("input")({ text: input, source: "interactive" }).text;
      const expanded = pi.AgentSession.prototype._expandSkillCommand.call(context, transformed);
      assert.ok(expanded.startsWith(`<skill name="${skill.name}" `), `${JSON.stringify(input)} expands`);
      const args = expanded.slice(expanded.indexOf("</skill>\n\n") + "</skill>\n\n".length);
      assert.ok(args.startsWith(suffix.trim()), "the task stays after the skill body");
      assert.equal((args.match(/# Operator overrides/g) ?? []).length, 1);
      assert.ok(expanded.endsWith(transformed.slice(transformed.indexOf("# Operator overrides"))));
      assert.equal(handlers.get("input")({ text: transformed, source: "extension" }), undefined);
    }
  }
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
  assert.match(text, /pstack_plan/, "the reminder keeps the console plan current");
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

test("tree navigation restores branch flags, status and prompts without adding entries", async () => {
  const { handlers, turn, entries, command, ctx, statuses, notifications } = await load();
  await command.handler("", ctx);
  const count = entries.length;
  const sections = turn({ other_extension: "keep me" });
  const before = handlers.get("before_agent_start");
  let prompt = before({ systemPrompt: "Host instructions" }, ctx).systemPrompt;
  const adapter = custom("pstack-adapter", { enabled: true });
  const on = custom("pstack-mode", { enabled: true });
  const off = custom("pstack-mode", { enabled: false });

  for (const [branch, mode, adapted] of [
    [[], false, false],
    [[adapter], false, true],
    [[adapter, on], true, true],
    [[adapter, on, off], false, true],
  ]) {
    handlers.get("session_tree")({ type: "session_tree" }, { ...ctx, ...branchOf(...branch) });
    turn(sections);
    prompt = before({ systemPrompt: prompt }, ctx).systemPrompt;
    assert.equal(Boolean(sections.pstack_mode), mode);
    assert.equal(Boolean(sections.pstack_adapter), adapted);
    assert.equal(prompt.includes("<pstack_mode>"), mode);
    assert.equal(prompt.includes("<pstack_adapter>"), adapted);
    assert.equal(sections.other_extension, "keep me");
    assert.deepEqual(statuses.at(-1), ["pstack", mode ? "pstack: mode on" : undefined]);
    await command.handler("status", ctx);
    assert.equal(notifications.at(-1), mode ? "pstack mode on." : "pstack mode off.");
    assert.equal(entries.length, count, "navigation does not write flags to the selected branch");
  }
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

const readIn = (handlers, ctx, path) =>
  handlers.get("tool_result")({ toolName: "read", input: { path }, content: [{ type: "text", text: "body" }], isError: false }, ctx);
const widgetResult = (result) => result.content[0].text;
const steps = (...statuses) => statuses.map((status, i) => ({ text: `step ${i + 1}`, status }));

test("the plan tool stays out of the model's tool list until pstack is used, then stays in", async () => {
  const { handlers, active, ctx, turn } = await load();
  turn();
  assert.ok(!active().includes("pstack_plan"), "a session that never uses pstack does not carry the schema");
  handlers.get("input")({ text: "/skill:pstack-how what is this", source: "interactive" }, ctx);
  assert.ok(active().includes("pstack_plan"));
  handlers.get("input")({ text: "/skill:pstack-tdd fix", source: "interactive" }, ctx);
  assert.equal(active().filter((name) => name === "pstack_plan").length, 1, "activation is idempotent");

  const resumed = await load();
  resumed.handlers.get("session_start")({}, { ...resumed.ctx, ...branchOf(custom("pstack-adapter", { enabled: true })) });
  assert.ok(resumed.active().includes("pstack_plan"), "a resumed pstack session gets the tool back");
});

test("a reported plan shows above the editor, windowed on the current step; finishing collapses it and an empty plan clears it", async () => {
  const { plan, widget } = await load();
  const result = await plan({ playbook: "feature", steps: steps("done", "done", "done", "active", "pending", "pending", "pending", "pending", "pending", "pending") });
  const lines = widget();
  assert.equal(lines[0], "pstack · feature · 3/10");
  assert.ok(lines.length <= 10, "Pi shows at most ten widget lines");
  assert.equal(lines[1], "✓ step 3", "one finished step stays in view before the current one");
  assert.equal(lines[2], "▶ step 4");
  assert.match(result.content[0].text, /3\/10/);
  assert.match(result.content[0].text, /Current step: "step 4"\. When it finishes, call pstack_plan again/, "the result asks for the next update while steps remain");
  assert.deepEqual(result.details.steps.length, 10, "the plan is kept in the result for resume");

  await plan({ playbook: "feature", steps: [{ text: "write the pin", status: "skipped", note: "no behavior change" }, { text: "ship", status: "done" }] });
  assert.deepEqual(widget(), ["pstack · feature · 2/2 ✓"], "a finished plan is one line");
  assert.doesNotMatch(widgetResult(await plan({ playbook: "feature", steps: steps("done") })), /call pstack_plan again/, "a finished plan asks for nothing more");

  await plan({ steps: [] });
  assert.equal(widget(), undefined, "an empty plan with no skills in use removes the widget");
});

test("a finished plan leaves the console once Pi stops working, and does not come back on resume", async () => {
  const { handlers, ctx, plan, widget } = await load();
  readIn(handlers, ctx, join(skillsDir, "tdd", "SKILL.md"));
  await plan({ playbook: "bug-fix", steps: steps("done", "active") });
  handlers.get("agent_settled")({ aborted: false }, ctx);
  assert.equal(widget()[0], "pstack · bug-fix · 1/2", "an open plan stays after the run");
  await plan({ playbook: "bug-fix", steps: steps("done", "skipped") });
  assert.equal(widget()[0], "pstack · bug-fix · 2/2 ✓", "the finished plan shows while the reply is written");
  readIn(handlers, ctx, join(skillsDir, "bro", "SKILL.md"));
  assert.match(widget()[1], /^正在用 bro：/, "a finished plan can show the current skill until settling");
  handlers.get("agent_settled")({ aborted: false }, ctx);
  assert.equal(widget(), undefined, "the plan and the skill line both leave");

  const reported = { type: "message", message: { role: "toolResult", toolName: "pstack_plan", details: { playbook: "bug-fix", steps: steps("done", "done") } } };
  handlers.get("session_start")({}, { ...ctx, ...branchOf(reported) });
  assert.equal(widget(), undefined, "a resumed branch whose plan finished shows nothing");
});

test("only reading a skill entry updates the current skill line", async () => {
  const { handlers, ctx, widget } = await load();
  readIn(handlers, ctx, join(skillsDir, "architect", "SKILL.md"));
  assert.match(widget()[0], /^正在用 architect：先设计再实现/, "the user sees the skill's own description");
  const first = widget();

  readIn(handlers, ctx, join(skillsDir, "architect", "references", "design-red-flags.md"));
  assert.deepEqual(widget(), first, "a reference of the same skill changes nothing");

  readIn(handlers, ctx, join(skillsDir, "interrogate", "references", "rubric.md"));
  assert.deepEqual(widget(), first, "a reference of another skill changes nothing");

  readIn(handlers, ctx, join(skillsDir, "poteto-mode", "playbooks", "feature.md"));
  assert.deepEqual(widget(), first, "a playbook changes nothing");
  readIn(handlers, ctx, join(skillsDir, "principle-laziness-protocol", "SKILL.md"));
  assert.deepEqual(widget(), first, "a principle entry changes nothing");
  handlers.get("input")({ text: "/skill:pstack-principle-laziness-protocol", source: "interactive" }, ctx);
  assert.deepEqual(widget(), first, "a principle command changes nothing");

  readIn(handlers, ctx, join(skillsDir, "tdd", "SKILL.md"));
  assert.match(widget()[0], /^正在用 tdd：测试驱动修复/, "a second skill entry replaces the line");

  readIn(handlers, ctx, "/etc/hosts");
  assert.match(widget()[0], /^正在用 tdd：测试驱动修复/, "files outside the package change nothing");
});

test("typing a pstack command names its skill, the entry skill included", async () => {
  const { handlers, ctx, widget } = await load();
  handlers.get("input")({ text: "/skill:pstack fix the total", source: "interactive" }, ctx);
  assert.match(widget()[0], /^正在用 pstack：工程工作流入口/);
  handlers.get("input")({ text: "/skill:pstack-teach-me\nthis module", source: "interactive" }, ctx);
  assert.match(widget()[0], /^正在用 teach-me：把改动或子系统真正讲明白/);
  handlers.get("agent_settled")({ aborted: false }, ctx);
  assert.equal(widget(), undefined, "settling clears the replacement skill too");
});

test("references, playbooks and principles never create a current skill line", async () => {
  const { handlers, ctx, widget } = await load();
  for (const file of [join(skillsDir, "architect", "references", "design-red-flags.md"), join(skillsDir, "poteto-mode", "playbooks", "feature.md"), join(skillsDir, "principle-laziness-protocol", "SKILL.md")]) {
    readIn(handlers, ctx, file);
    assert.equal(widget(), undefined, file);
  }
  handlers.get("input")({ text: "/skill:pstack-principle-laziness-protocol", source: "interactive" }, ctx);
  assert.equal(widget(), undefined, "a principle command also creates no line");
});

for (const aborted of [false, true]) {
  test(`settling a skill command without a plan clears its line (aborted=${aborted})`, async () => {
    const { handlers, ctx, widget, plan } = await load();
    handlers.get("input")({ text: "/skill:pstack-bro", source: "interactive" }, ctx);
    assert.match(widget()[0], /^正在用 bro：/);
    handlers.get("agent_settled")({ aborted }, ctx);
    assert.equal(widget(), undefined);
    await plan({ steps: [] });
    assert.equal(widget(), undefined, "an empty plan cannot revive the previous turn's skill");
  });

  test(`an unfinished plan hides the skill line and survives settling (aborted=${aborted})`, async () => {
    const { handlers, ctx, widget, plan } = await load();
    const list = steps("done", "active");
    list[1].skill = "tdd";
    await plan({ playbook: "bug-fix", steps: list });
    const open = widget();
    assert.equal(open[0], "pstack · bug-fix · 1/2 · 正在用 tdd");
    readIn(handlers, ctx, join(skillsDir, "tdd", "SKILL.md"));
    assert.deepEqual(widget(), open, "a skill read cannot add a second current label");
    assert.ok(!widget().some((line) => line.startsWith("正在用 tdd：")), "the title is the only current skill label");
    handlers.get("agent_settled")({ aborted }, ctx);
    assert.deepEqual(widget(), open, "settling keeps every open step");
    await plan({ steps: [] });
    assert.equal(widget(), undefined, "clearing the plan cannot revive the previous turn's skill");
  });
}

test("a resumed session or branch switch shows that branch's last reported plan", async () => {
  const { handlers, ctx, widget } = await load();
  const reported = (playbook, list) => ({ type: "message", message: { role: "toolResult", toolName: "pstack_plan", details: { playbook, steps: list } } });
  readIn(handlers, ctx, join(skillsDir, "bro", "SKILL.md"));
  handlers.get("session_start")({}, { ...ctx, ...branchOf(reported("bug-fix", steps("done", "active")), reported("bug-fix", steps("done", "done", "active"))) });
  assert.deepEqual(widget(), ["pstack · bug-fix · 2/3", "✓ step 1", "✓ step 2", "▶ step 3"], "a short plan shows every step");

  handlers.get("session_tree")({}, { ...ctx, ...branchOf(reported("bug-fix", steps("active"))) });
  assert.deepEqual(widget(), ["pstack · bug-fix · 0/1", "▶ step 1"]);

  handlers.get("session_tree")({}, { ...ctx, ...branchOf() });
  assert.equal(widget(), undefined, "a branch without a plan shows none");
});

test("an open step is named again after every sixth other tool result, until the model reports the plan", async () => {
  const { handlers, ctx, plan } = await load();
  const result = (toolName = "bash", input = {}) =>
    handlers.get("tool_result")({ toolName, input, content: [{ type: "text", text: "ok" }], isError: false }, ctx);
  const nudged = (r) => r?.content.at(-1).text.includes("still shows step");

  for (let i = 0; i < 6; i += 1) assert.ok(!nudged(result()), "no plan, no reminder");

  await plan({ playbook: "bug-fix", steps: [{ text: "复现问题", status: "active" }, { text: "修复", status: "pending" }] });
  for (let i = 0; i < 5; i += 1) assert.ok(!nudged(result()), "five calls stay quiet");
  const sixth = result();
  assert.ok(nudged(sixth));
  assert.match(sixth.content.at(-1).text, /"复现问题" as current\. If it finished, call pstack_plan/);
  assert.equal(sixth.content[0].text, "ok", "the tool's own output is kept");
  for (let i = 0; i < 5; i += 1) assert.ok(!nudged(result()), "the count starts over after a reminder");

  await plan({ playbook: "bug-fix", steps: [{ text: "复现问题", status: "done" }, { text: "修复", status: "active" }] });
  for (let i = 0; i < 5; i += 1) result();
  const withSkill = result("read", { path: join(skillsDir, "tdd", "SKILL.md") });
  assert.ok(nudged(withSkill), "a report restarts the count");
  assert.ok(withSkill.content.some((b) => b.text.includes("# Operator overrides")), "a skill read keeps its own additions next to the reminder");

  await plan({ playbook: "bug-fix", steps: [{ text: "复现问题", status: "done" }, { text: "修复", status: "done" }] });
  for (let i = 0; i < 12; i += 1) assert.ok(!nudged(result()), "a finished plan asks for nothing");
});

test("an abandoned plan stops reminding after two ignored reminders, and /pstack off clears it for good", async () => {
  const { handlers, ctx, plan, widget, command, entries } = await load();
  const result = () => handlers.get("tool_result")({ toolName: "bash", input: {}, content: [{ type: "text", text: "ok" }], isError: false }, ctx);
  const reminders = (calls) => Array.from({ length: calls }, result).filter((r) => r?.content.at(-1).text.includes("still shows step")).length;

  await plan({ playbook: "feature", steps: [{ text: "建模", status: "active" }] });
  assert.equal(reminders(60), 2, "an unanswered plan is reminded twice, then left alone");
  await plan({ playbook: "feature", steps: [{ text: "建模", status: "active" }] });
  assert.equal(reminders(12), 2, "a new report earns two more reminders");

  await command.handler("off", ctx);
  assert.equal(widget(), undefined, "turning the mode off removes the plan from the console");
  assert.equal(reminders(30), 0, "and stops its reminders");

  const reported = { type: "message", message: { role: "toolResult", toolName: "pstack_plan", details: { playbook: "feature", steps: [{ text: "建模", status: "active" }] } } };
  handlers.get("session_start")({}, { ...ctx, ...branchOf(reported, ...entries) });
  assert.equal(widget(), undefined, "a resumed session does not bring back a plan the user turned off");
  handlers.get("session_start")({}, { ...ctx, ...branchOf(...entries, reported) });
  assert.equal(widget()[0], "pstack · feature · 0/1", "a plan reported after turning off still shows");
});

test("the local report's first read carries the adapter and labels the widget; later reads only append overrides", async () => {
  const { handlers, ctx, turn, widget, entries } = await load();
  const event = {
    toolName: "read", input: { path: join(repoRoot, "local-skills", "pstack-report", "SKILL.md") },
    content: [{ type: "text", text: "report body" }], isError: false,
  };
  const first = handlers.get("tool_result")(event, ctx);
  assert.equal(first.content[0].text, "report body");
  assert.match(first.content[1].text, /# Operator overrides/);
  assert.match(first.content[1].text, /# pstack on Pi/);
  assert.match(widget().at(-1), /^正在用 report：收尾报告/);
  assert.ok(turn().pstack_adapter);
  assert.equal(entries.filter((entry) => entry.customType === "pstack-adapter").length, 1);
  const later = handlers.get("tool_result")(event, ctx);
  assert.match(later.content.at(-1).text, /# Operator overrides/);
  assert.doesNotMatch(later.content.at(-1).text, /# pstack on Pi/);
});

test("the local report command activates the adapter and labels the widget without entering the mode", async () => {
  const { handlers, ctx, turn, widget } = await load();
  const result = handlers.get("input")({ text: "/skill:pstack-report", source: "interactive" }, ctx);
  assert.equal(result.action, "transform");
  assert.match(result.text, /# Operator overrides/);
  assert.ok(turn().pstack_adapter);
  assert.equal(turn().pstack_mode, undefined);
  assert.match(widget().at(-1), /^正在用 report：收尾报告/);
});

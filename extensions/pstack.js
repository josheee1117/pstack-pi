/**
 * The package's one extension. Four concerns, all things a skill
 * cannot carry.
 *
 * 1. Writing rules, always on. They apply to every reply, not to a matched
 *    task, so they live in a system prompt section instead of a skill the
 *    model has to decide to open.
 * 2. The Pi adapter. The skills are upstream pstack text written for Cursor.
 *    adapter/platform.md maps Cursor's tools, paths, and models to Pi, and
 *    adapter/overrides.md holds the behavior rules this package keeps over
 *    upstream. Both are injected once the session uses a pstack skill or the
 *    mode, and not before, so a session that never touches pstack pays nothing.
 * 3. The pstack mode, opt in. Pi has no mode concept, so entering the entry
 *    skill once has to keep applying on later turns. The mode holds a session
 *    flag and injects a short reminder while it is on.
 * 4. A console view of the work. Upstream keeps its playbook steps in Cursor's
 *    todolist, which Pi lacks, so the pstack_plan tool takes that list and a
 *    widget above the editor shows it with the pstack skills in use.
 *
 * Newer Pi versions support structured sections; original Pi versions use
 * the systemPrompt fallback below. Neither path repeats a full skill body.
 *
 * The first rules are plain speech, from the bro skill and the entry skill's
 * "Writing the reply", on by default so nobody has to ask for them.
 * `skills/unslop/SKILL.md` owns the rest and their numbering. The list below is
 * the subset that fires on an ordinary reply; the section points at the full
 * catalog for long-form work. Keep the two in sync.
 */
import { readdirSync, readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SKILLS = join(ROOT, "skills");
export const SKILL_DIRS = [SKILLS, join(ROOT, "local-skills")];
const ADAPTER = join(ROOT, "adapter");
const ENTRY_SKILL = join(SKILLS, "poteto-mode", "SKILL.md");
// Pi's config directory, where user settings, skills, and sessions live.
const AGENT_DIR = process.env.PI_CODING_AGENT_DIR || join(homedir(), ".pi", "agent");

const PROSE_SECTION = "prose_rules";
const ADAPTER_SECTION = "pstack_adapter";
const MODE_SECTION = "pstack_mode";
const MODE_ENTRY = "pstack-mode";
const ADAPTER_ENTRY = "pstack-adapter";

// `/skill:pstack` is the entry skill; every other skill in the package is
// `/skill:pstack-<name>`.
const ENTRY_COMMAND = /^\/skill:pstack(?:\s|$)/;
const ANY_COMMAND = /^\/skill:pstack(?:-[a-z0-9-]+)?(?:\s|$)/;

// Read paths may be relative or reach the package through a symlink. The
// package paths above come from import.meta.url, which Node resolves to the
// real path, so compare real paths. Returns the path inside a skill root, if any.
const skillFile = (path, cwd) => {
  let file;
  try {
    file = realpathSync(resolve(cwd, path));
  } catch {
    return undefined;
  }
  for (const root of SKILL_DIRS) {
    try {
      const child = relative(realpathSync(root), file);
      if (child !== "" && child !== ".." && !child.startsWith(`..${sep}`) && !isAbsolute(child)) return child;
    } catch { continue; }
  }
};

// Registered name and description of every packaged skill, by directory and
// by name. Read once, on the first skill the console has to label.
let skillIndex;
const skillInfo = (key) => {
  if (!skillIndex) {
    skillIndex = new Map();
    for (const root of SKILL_DIRS) {
      let dirs;
      try { dirs = readdirSync(root); } catch { continue; }
      for (const dir of dirs) {
        let head;
        try { head = readFileSync(join(root, dir, "SKILL.md"), "utf8").split("\n---")[0]; } catch { continue; }
        const info = {
          name: head.match(/^name:\s*(.+)$/m)?.[1].trim() ?? dir,
          about: head.match(/^description:\s*"?(.*?)"?\s*$/m)?.[1] ?? "",
        };
        skillIndex.set(dir, info).set(info.name, info);
      }
    }
  }
  return skillIndex.get(key);
};

// What a read of a file inside a skill root tells the user: a playbook of the entry
// skill, or the skill that owns the file (its SKILL.md or a reference).
const asSeen = (info) => info && { name: shortName(info.name), about: info.about };
const skillOfFile = (child) => {
  const [dir, sub, file] = child.split(sep);
  if (dir === "poteto-mode" && sub === "playbooks" && file) return { name: `流程 ${file.replace(/\.md$/, "")}`, about: "" };
  return asSeen(skillInfo(dir));
};

// The console widget. Pi shows at most ten lines of a string widget and wraps
// long ones, so steps are clipped to the terminal width and windowed around
// the current step.
const PLAN_TOOL = "pstack_plan";
const WIDGET = "pstack";
const STEP_LINES = 7;
const NUDGE_EVERY = 6;
const NUDGE_LIMIT = 2;
const FINISHED = new Set(["done", "skipped"]);
const ICON = { done: "✓", active: "▶", pending: "○", skipped: "–" };
// ponytail: counts every non-ASCII character as two columns, so CJK text fits;
// switch to a real display-width table if symbols start clipping early.
const cols = (text) => [...text].reduce((width, ch) => width + (ch.charCodeAt(0) > 0x7f ? 2 : 1), 0);
const lineWidth = () => Math.max(20, (process.stdout.columns || 80) - 4);
const cut = (text, max) => {
  const flat = text.replace(/\s+/g, " ");
  if (cols(flat) <= max) return flat;
  let out = "";
  for (const ch of flat) {
    if (cols(out + ch) > max - 2) return `${out}…`;
    out += ch;
  }
  return out;
};
const clip = (text) => cut(text, lineWidth());

// A step's skill as the model reported it, shown by its short name: the
// registered name without the pstack- or pstack-principle- prefix. Names
// that match no packaged skill keep a "?" so a wrong name stands out.
const BUILT_IN = "流程自带";
const BUILT_IN_WORDS = new Set([BUILT_IN, "playbook", "none", "-"]);
const shortName = (name) => name.replace(/^pstack-(principle-)?/, "");
const skillTag = (skill) =>
  String(skill ?? "")
    .split("+")
    .map((part) => part.trim().replace(/^\/?(skill:)?/, ""))
    .filter(Boolean)
    .map((part) => {
      if (BUILT_IN_WORDS.has(part.toLowerCase())) return BUILT_IN;
      const info = skillInfo(part) ?? skillInfo(`pstack-${part}`) ?? skillInfo(`pstack-principle-${part}`);
      return info ? shortName(info.name) : `${part}?`;
    })
    .join(" + ");

// Steps on the left, their skill in a column on the right. The step text is
// cut first so the skill stays readable on a narrow terminal.
const table = (rows) => {
  const max = lineWidth();
  const tagWidth = Math.min(Math.max(0, ...rows.map(([, tag]) => cols(tag))), Math.floor(max / 2));
  const lefts = rows.map(([left]) => cut(left, tagWidth ? max - tagWidth - 2 : max));
  const at = Math.max(...lefts.map(cols)) + 2;
  return rows.map(([, tag], i) => (tag ? `${lefts[i]}${" ".repeat(at - cols(lefts[i]))}${cut(tag, tagWidth)}` : lefts[i]));
};

function widgetLines(plan, last) {
  const lines = [];
  const { steps } = plan;
  if (steps.length) {
    const finished = steps.filter((s) => FINISHED.has(s.status)).length;
    const title = `pstack · ${plan.playbook || "plan"} · ${finished}/${steps.length}`;
    if (finished === steps.length) {
      lines.push(clip(`${title} ✓`));
    } else {
      const active = steps.findIndex((s) => s.status === "active");
      const at = active >= 0 ? active : steps.findIndex((s) => !FINISHED.has(s.status));
      const using = skillTag(steps[at].skill);
      lines.push(clip(using ? `${title} · 正在用 ${using}` : title));
      const start = Math.max(0, Math.min(at - 1, steps.length - STEP_LINES));
      lines.push(...table(steps.slice(start, start + STEP_LINES).map((s) => [
        `${ICON[s.status] ?? ICON.pending} ${s.text}`,
        s.status === "skipped" ? (s.note ? `跳过：${s.note}` : "跳过") : skillTag(s.skill),
      ])));
    }
  }
  if (last) lines.push(clip(`刚读取 ${last.name}${last.about ? `：${last.about}` : ""}`));
  return lines;
}

const fill = (text) =>
  text
    .replaceAll("{{root}}", ROOT)
    .replaceAll("{{skills}}", SKILLS)
    .replaceAll("{{adapter}}", ADAPTER)
    .replaceAll("{{agentDir}}", AGENT_DIR);

const OVERRIDES_TEXT = fill(readFileSync(join(ADAPTER, "overrides.md"), "utf8")).trim();
const PLATFORM_TEXT = fill(readFileSync(join(ADAPTER, "platform.md"), "utf8")).trim();
const ADAPTER_TEXT = `${OVERRIDES_TEXT}\n\n${PLATFORM_TEXT}`;

const hasOverrides = (text) => String(text ?? "").includes(OVERRIDES_TEXT);

// Pi splits skill names at a literal space, including commands without args.
const appendOverrides = (text) => (hasOverrides(text) ? text : `${text.replace(/^(\S+)(?:\s|$)/, "$1 ")}\n\n${OVERRIDES_TEXT}`);

const RULES = [
  "- Talk like one person explaining to another. Assume the reader did not watch you work.",
  "- Lead with the answer or the outcome, then the evidence. Say what the user will notice before the implementation detail.",
  "- Explain a term the first time it appears, or use the plain word instead. Do not lean on identifiers, internal names, or shorthand you coined during the task.",
  "- Simpler is not vaguer. Keep every number, path, and decision that matters.",
  "- No em dashes. No hyphen, en dash, or parenthesis doing an em dash's job. Use a period or a comma.",
  "- A colon is fine before a list or an example, never as a mid-sentence connector.",
  "- One idea per sentence, short and declarative. If a sentence needs re-reading, split it or drop clauses.",
  "- Write whole sentences with their articles and verbs, not arrow-speak or symbol shorthand.",
  '- Active voice. Name the actor instead of "is/are/was + past participle". Passive only when the actor truly does not matter.',
  '- Plain words win: use, help, many, if. Not utilize, leverage, facilitate, numerous, in the event that. Cut adverbs, or choose a stronger verb.',
  '- Cut filler and hedging: "in order to" to "to", "due to the fact that" to "because", "could potentially" to "may", delete "it is important to note that".',
  '- Say what it does, not how it feels. A sentence that could appear unchanged in another project\'s docs says nothing about this one.',
  '- No forced groups of three, no synonym cycling, no "not just X, but Y", no false "from X to Y" ranges.',
  "- No bold label restating the line it labels. Sentence case headings. No decorative emoji. Straight quotes.",
  '- No chatbot phrases ("I hope this helps", "Of course", "Certainly"), no "great question", no generic closer. State the specific fact or the actual plan.',
  '- English prose: drop AI vocabulary (additionally, crucial, delve, enhance, foster, intricate, landscape, pivotal, showcase, testament, underscore, vibrant) and fancy "is" (serves as, stands as, boasts, features). Metaphor nouns (substrate, wedge, nexus, paradigm, north star, flywheel) become the concrete word.',
].join("\n");

const PROSE_TEXT = [
  "In effect for every reply and every file you write.",
  "",
  RULES,
  "",
  `Long-form writing (a doc, RFC, README, PR description, or commit message): read ${join(SKILLS, "unslop", "SKILL.md")} for the full rule catalog, and ${join(SKILLS, "technical-writing", "SKILL.md")} for document structure.`,
].join("\n");

/**
 * The mode reminder. Upstream's own reminder, with the entry skill's path. The
 * skill body is not re-sent: the model reads it once, when a task needs it.
 */
const MODE_TEXT = [
  "pstack mode is on for this session.",
  "",
  `On a new task, if a playbook matches or the work needs rigor, apply the mode's skill, ${ENTRY_SKILL}. Read it if its text is missing from your current context, including after compaction. Reuse it while present. On a casual turn, or when the user opts out, work normally.`,
  "",
  `While you follow a playbook, the user watches its steps through ${PLAN_TOOL}. Call it again each time a step finishes, before you start the next one.`,
  "",
  "Use `/pstack off` to turn the persistent mode off.",
].join("\n");

const OFF_WORDS = /^(off|disable|stop|exit)$/i;

function sessionNote(ctx) {
  try {
    const file = ctx?.sessionManager?.getSessionFile();
    return file ? `\nCurrent Pi session file: ${JSON.stringify(file)}. Read only this project's records.` : "\nNo persisted session file is available from this context. Do not guess a transcript path.";
  } catch {
    return "\nSession record unavailable. Report that gap instead of searching other projects.";
  }
}

export default function pstack(pi) {
  let modeOn = false;
  let adapterOn = false;
  // The playbook the model reported through pstack_plan, and the pstack skill
  // this session read last. Both feed the console widget.
  let plan = { playbook: "", steps: [] };
  let last;
  // Tool results and reminders since the model last reported the plan. A
  // plan whose reminders go unanswered NUDGE_LIMIT times counts as abandoned.
  let sincePlan = 0;
  let nudges = 0;
  const noPlan = () => ({ playbook: "", steps: [] });
  const resetNudges = () => {
    sincePlan = 0;
    nudges = 0;
  };

  const showMode = (ctx) => {
    if (!ctx?.ui?.setStatus) return;
    ctx.ui.setStatus("pstack", modeOn ? "pstack: mode on" : undefined);
  };

  const showWidget = (ctx) => {
    if (!ctx?.ui?.setWidget) return;
    const lines = widgetLines(plan, last);
    ctx.ui.setWidget(WIDGET, lines.length ? lines : undefined);
  };

  const noteSkill = (skill, ctx) => {
    if (!skill) return;
    last = skill;
    showWidget(ctx);
  };

  // The plan tool stays out of the model's tool list until the session uses
  // pstack, so a session that never does pays nothing for its schema.
  const activatePlan = () => {
    const active = pi.getActiveTools?.();
    if (active && !active.includes(PLAN_TOOL)) pi.setActiveTools([...active, PLAN_TOOL]);
  };

  const useAdapter = () => {
    if (adapterOn) return;
    adapterOn = true;
    pi.appendEntry(ADAPTER_ENTRY, { enabled: true });
    activatePlan();
  };

  pi.registerTool({
    name: PLAN_TOOL,
    label: "pstack plan",
    description:
      "Show the pstack playbook you are following in the user's console. Call it when you open a playbook's todolist, with every playbook step in order, one short label per step in the user's language. Do not merge steps. Call it again with the full list whenever a step starts, finishes, or is skipped. Pass an empty steps list when the work ends.",
    parameters: {
      type: "object",
      properties: {
        playbook: { type: "string", description: "The playbook or workflow name, such as feature or bug-fix." },
        steps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              text: { type: "string", description: "A short label for the step, in the language the user writes in." },
              status: { type: "string", enum: ["pending", "active", "done", "skipped"] },
              skill: { type: "string", description: "The pstack skill this step uses, such as how or tdd. Join several with +. Write 流程自带 when the playbook step itself is the work." },
              note: { type: "string", description: "Optional: why the step was skipped." },
            },
            required: ["text", "status"],
          },
        },
      },
      required: ["steps"],
    },
    defaultActive: false,
    async execute(_id, params, _signal, _onUpdate, ctx) {
      plan = { playbook: params.playbook ?? "", steps: params.steps };
      resetNudges();
      showWidget(ctx);
      const finished = plan.steps.filter((s) => FINISHED.has(s.status)).length;
      const next = plan.steps.find((s) => s.status === "active") ?? plan.steps.find((s) => !FINISHED.has(s.status));
      const text = next
        ? `Plan shown: ${finished}/${plan.steps.length} steps finished. Current step: ${JSON.stringify(next.text)}. When it finishes, call ${PLAN_TOOL} again before you start the next step.`
        : `Plan shown: ${finished}/${plan.steps.length} steps finished.`;
      return { content: [{ type: "text", text }], details: plan };
    },
  });

  // The mode outlives a turn but not by default a session. Persisting it in a
  // custom entry is what makes "enter once" true across a resume, and the flag
  // is rebuilt from the branch rather than from a file this extension owns.
  // The adapter flag rides along the same way, and the plan comes back from
  // the branch's last pstack_plan result unless /pstack off came after it.
  const restoreState = (_event, ctx) => {
    modeOn = false;
    adapterOn = false;
    plan = noPlan();
    resetNudges();
    // ponytail: the last-read skill line starts empty after a resume or branch
    // switch; rebuild it from the branch's read calls if that gap matters.
    last = undefined;
    try {
      for (const entry of ctx.sessionManager.getBranch()) {
        if (entry.type === "message" && entry.message?.role === "toolResult" && entry.message.toolName === PLAN_TOOL) {
          if (Array.isArray(entry.message.details?.steps)) plan = entry.message.details;
        }
        if (entry.type !== "custom") continue;
        if (entry.customType === MODE_ENTRY) {
          modeOn = entry.data?.enabled === true;
          if (!modeOn) plan = noPlan();
        }
        if (entry.customType === ADAPTER_ENTRY) adapterOn = true;
      }
    } catch {
      // A session manager that cannot be read leaves both off; the commands
      // and the first skill read still turn them on for this session.
    }
    if (adapterOn) activatePlan();
    showMode(ctx);
    showWidget(ctx);
  };
  pi.on("session_start", restoreState);
  pi.on("session_tree", restoreState);

  // Direct entry and extension-sent commands share the same idempotent state
  // change, so /pstack's own message does not append the flags twice.
  // Pi expands /skill:pstack after this hook and places the command arguments
  // after the skill body. Ending that text with the operator overrides lets
  // those rules follow the upstream skill instead of being buried by it.
  pi.on("input", (event, ctx) => {
    if (ANY_COMMAND.test(event.text)) {
      useAdapter();
      noteSkill(asSeen(skillInfo(event.text.match(/^\/skill:(\S+)/)[1])), ctx);
    }
    if (ENTRY_COMMAND.test(event.text) && !modeOn) {
      modeOn = true;
      pi.appendEntry(MODE_ENTRY, { enabled: true });
      showMode(ctx);
    }
    if (!ANY_COMMAND.test(event.text) || hasOverrides(event.text)) return;
    return { action: "transform", text: appendOverrides(event.text) };
  });

  // A skill file read without a command (a subagent, or the model following a
  // reference) has not had the adapter yet. The section only lands on the next
  // prompt, so the first such read carries the adapter in its own result.
  const readResult = (event, ctx) => {
    if (event.toolName !== "read" || event.isError) return;
    const path = String(event.input?.path ?? "");
    const cwd = ctx?.cwd ?? process.cwd();
    // A child may read the map directly, without loading this extension's
    // system sections. Resolve only our map's own placeholders in that result.
    if (resolve(cwd, path) === join(ADAPTER, "platform.md")) {
      useAdapter();
      return { content: event.content.map((block) => block.type === "text" ? { ...block, text: fill(block.text) } : block) };
    }
    const child = skillFile(path, cwd);
    if (!child) return;
    noteSkill(skillOfFile(child), ctx);
    if (!adapterOn) {
      useAdapter();
      return { content: [...event.content, { type: "text", text: `\n\n${ADAPTER_TEXT}${sessionNote(ctx)}` }] };
    }
    const seen = event.content.map((block) => block.type === "text" ? block.text : "").join("\n");
    if (hasOverrides(seen)) return;
    return { content: [...event.content, { type: "text", text: `\n\n${OVERRIDES_TEXT}` }] };
  };

  // Models tend to report a plan at its start and end and skip the steps in
  // between. While a step is open, every NUDGE_EVERY-th other tool result
  // reminds the model which step the user sees as current, at most
  // NUDGE_LIMIT times per report, so an abandoned plan stops nagging.
  const planNudge = (event) => {
    if (event.toolName === PLAN_TOOL) return;
    const current = plan.steps.find((s) => s.status === "active") ?? plan.steps.find((s) => !FINISHED.has(s.status));
    if (!current || nudges >= NUDGE_LIMIT || ++sincePlan < NUDGE_EVERY) return;
    sincePlan = 0;
    nudges += 1;
    return `\n\n[pstack] The user's console still shows step ${JSON.stringify(current.text)} as current. If it finished, call ${PLAN_TOOL} before you continue.`;
  };

  pi.on("tool_result", (event, ctx) => {
    const own = readResult(event, ctx);
    const nudge = planNudge(event);
    if (!nudge) return own;
    return { content: [...(own?.content ?? event.content), { type: "text", text: nudge }] };
  });

  pi.on("before_agent_start", (event, ctx) => {
    const own = { [PROSE_SECTION]: PROSE_TEXT };
    if (adapterOn || modeOn) own[ADAPTER_SECTION] = ADAPTER_TEXT + sessionNote(ctx);
    if (modeOn) own[MODE_SECTION] = MODE_TEXT;
    const sections = event.systemPromptOptions?.sections;
    if (sections) {
      for (const key of [PROSE_SECTION, ADAPTER_SECTION, MODE_SECTION]) {
        if (own[key]) sections[key] = own[key];
        else delete sections[key];
      }
      return;
    }
    // Original Pi exposes only systemPrompt, not the fork's structured
    // sections. Rebuild our own block from this turn's base; never accumulate.
    const base = (event.systemPrompt ?? "").replace(/\n*<pstack-runtime>[\s\S]*?<\/pstack-runtime>/g, "");
    const body = Object.entries(own).map(([key, text]) => `<${key}>\n${text}\n</${key}>`).join("\n");
    return { systemPrompt: `${base}\n\n<pstack-runtime>\n${body}\n</pstack-runtime>` };
  });

  pi.registerCommand("pstack", {
    description:
      "Turn pstack mode on for this session, or off. Usage: /pstack [task] | /pstack off | /pstack status",
    handler: async (args, ctx) => {
      const text = args.trim();

      if (OFF_WORDS.test(text)) {
        modeOn = false;
        pi.appendEntry(MODE_ENTRY, { enabled: false });
        plan = noPlan();
        resetNudges();
        showMode(ctx);
        showWidget(ctx);
        ctx.ui.notify("pstack mode off.", "info");
        return;
      }

      if (text === "status") {
        ctx.ui.notify(modeOn ? "pstack mode on." : "pstack mode off.", "info");
        return;
      }

      modeOn = true;
      pi.appendEntry(MODE_ENTRY, { enabled: true });
      useAdapter();
      showMode(ctx);

      if (!text) {
        ctx.ui.notify(
          "pstack mode on. Later turns stay in it; /pstack off leaves.",
          "info",
        );
        return;
      }
      // A task given in the same breath runs the entry skill, so entering the
      // mode and starting the work are one step. sendUserMessage lives on the
      // extension API, not on the handler's ctx.
      pi.sendUserMessage(`/skill:pstack ${text}`, {
        expandPromptTemplates: true,
      });
    },
  });
}

/**
 * The package's one extension. Three prompt concerns, all things a skill
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
 *
 * All three use system prompt sections, never a `systemPrompt` return: Pi
 * diffs sections per turn, so unchanged text is not resent and a section that
 * stops being added is patched out of the prompt.
 *
 * The first rules are plain speech, from the bro skill and the entry skill's
 * "Writing the reply", on by default so nobody has to ask for them.
 * `skills/unslop/SKILL.md` owns the rest and their numbering. The list below is
 * the subset that fires on an ordinary reply; the section points at the full
 * catalog for long-form work. Keep the two in sync.
 */
import { readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SKILLS = join(ROOT, "skills");
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
// real path, so compare real paths.
const inSkills = (path, cwd) => {
  try {
    return realpathSync(resolve(cwd, path)).startsWith(`${SKILLS}/`);
  } catch {
    return false;
  }
};

const fill = (text) =>
  text
    .replaceAll("{{root}}", ROOT)
    .replaceAll("{{skills}}", SKILLS)
    .replaceAll("{{adapter}}", ADAPTER)
    .replaceAll("{{agentDir}}", AGENT_DIR);

const ADAPTER_TEXT = fill(
  [readFileSync(join(ADAPTER, "overrides.md"), "utf8"), readFileSync(join(ADAPTER, "platform.md"), "utf8")].join("\n"),
);

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
  `On a new task, if a playbook matches or the work needs rigor, apply the mode's skill, ${ENTRY_SKILL}. Read it once, unless its text is already in your context, then follow it. On a casual turn, or when the user opts out, work normally.`,
  "",
  "Say `/pstack off`, or just ask to leave the mode, to turn this off.",
].join("\n");

const OFF_WORDS = /^(off|disable|stop|exit)$/i;

export default function pstack(pi) {
  let modeOn = false;
  let adapterOn = false;

  const showMode = (ctx) => {
    if (!ctx?.ui?.setStatus) return;
    ctx.ui.setStatus("pstack", modeOn ? "pstack: mode on" : undefined);
  };

  const useAdapter = () => {
    if (adapterOn) return;
    adapterOn = true;
    pi.appendEntry(ADAPTER_ENTRY, { enabled: true });
  };

  // The mode outlives a turn but not by default a session. Persisting it in a
  // custom entry is what makes "enter once" true across a resume, and the flag
  // is rebuilt from the branch rather than from a file this extension owns.
  // The adapter flag rides along the same way.
  pi.on("session_start", (_event, ctx) => {
    modeOn = false;
    adapterOn = false;
    try {
      for (const entry of ctx.sessionManager.getBranch()) {
        if (entry.type !== "custom") continue;
        if (entry.customType === MODE_ENTRY) modeOn = entry.data?.enabled === true;
        if (entry.customType === ADAPTER_ENTRY) adapterOn = true;
      }
    } catch {
      // A session manager that cannot be read leaves both off; the commands
      // and the first skill read still turn them on for this session.
    }
    showMode(ctx);
  });

  // Entering the entry skill the usual way is entering the mode. Without this
  // the mode only works for people who learned the new command, which is not
  // the habit it is meant to replace. Messages the extension sends itself are
  // skipped: /pstack already set the flag before sending one.
  pi.on("input", (event) => {
    if (event.source === "extension") return;
    if (ANY_COMMAND.test(event.text)) useAdapter();
    if (ENTRY_COMMAND.test(event.text)) {
      modeOn = true;
      pi.appendEntry(MODE_ENTRY, { enabled: true });
    }
  });

  // A skill file read without a command (a subagent, or the model following a
  // reference) has not had the adapter yet. The section only lands on the next
  // prompt, so the first such read carries the adapter in its own result.
  pi.on("tool_result", (event, ctx) => {
    if (adapterOn || event.toolName !== "read" || event.isError) return;
    if (!inSkills(String(event.input?.path ?? ""), ctx?.cwd ?? process.cwd())) return;
    useAdapter();
    return { content: [...event.content, { type: "text", text: `\n\n${ADAPTER_TEXT}` }] };
  });

  pi.on("before_agent_start", (event) => {
    const sections = event.systemPromptOptions.sections;
    sections[PROSE_SECTION] = PROSE_TEXT;
    if (adapterOn || modeOn) sections[ADAPTER_SECTION] = ADAPTER_TEXT;
    if (modeOn) sections[MODE_SECTION] = MODE_TEXT;
  });

  pi.registerCommand("pstack", {
    description:
      "Turn pstack mode on for this session, or off. Usage: /pstack [task] | /pstack off | /pstack status",
    handler: async (args, ctx) => {
      const text = args.trim();

      if (OFF_WORDS.test(text)) {
        modeOn = false;
        pi.appendEntry(MODE_ENTRY, { enabled: false });
        showMode(ctx);
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

/**
 * The package's one extension. Two prompt concerns, both of them things a
 * skill cannot carry.
 *
 * 1. Writing rules, always on. They apply to every reply, not to a matched
 *    task, so they live in a system prompt section instead of a skill the
 *    model has to decide to open.
 * 2. The pstack mode, opt in. Pi has no mode concept, so entering the entry
 *    skill once has to keep applying on later turns. The mode holds a session
 *    flag and injects a short reminder while it is on; the skill body itself
 *    is not re-sent, because the reminder carries its path and the model reads
 *    it when a task actually needs it.
 *
 * Both use system prompt sections, never a `systemPrompt` return: Pi diffs
 * sections per turn, so unchanged text is not resent and a section that stops
 * being added is patched out of the prompt.
 *
 * The first rules are plain speech, from `pstack-bro` and the entry skill's
 * "Writing the reply", on by default so nobody has to ask for them.
 * `skills/pstack-unslop/SKILL.md` owns the rest and their numbering. The list
 * below is the subset that fires on an ordinary reply; the section points at
 * the full catalog for long-form work. Keep the two in sync.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SKILLS = join(dirname(dirname(fileURLToPath(import.meta.url))), "skills");
const ENTRY_SKILL = join(SKILLS, "pstack", "SKILL.md");

const PROSE_SECTION = "prose_rules";
const MODE_SECTION = "pstack_mode";
const MODE_ENTRY = "pstack-mode";

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
  `Long-form writing (a doc, RFC, README, PR description, or commit message): read ${join(SKILLS, "pstack-unslop", "SKILL.md")} for the full rule catalog, and ${join(SKILLS, "pstack-technical-writing", "SKILL.md")} for document structure.`,
].join("\n");

/**
 * The mode reminder. Kept short on purpose: the entry skill is 15 KB, and
 * re-sending that every turn costs more than it buys. This names the path, and
 * says when to spend the read and when to stay out of the way.
 *
 * The non-negotiables are the one part of the entry skill that applies on every
 * turn, including the small ones that never load it, so they are inlined here.
 * `skills/pstack/SKILL.md` owns them. Keep the two in sync.
 */
const MODE_TEXT = [
  "pstack mode is on for this session. On every turn:",
  "",
  "- Evidence, not assertion. A real run (test, build, actual use) is evidence. Reading code and concluding it works is a hypothesis. Label each claim measured, inferred, or guess. Never hand the user a check you could have run.",
  "- State the data shape before writing logic.",
  "- Reply in the language the user writes in.",
  "",
  `When a task needs rigor (it touches more than one file, changes a signature, involves a design call, or has an unknown cause), read ${ENTRY_SKILL} and follow it. It routes to the rest of the workflow. Read it once per session. If its text is already in your context, do not read it again.`,
  "",
  "On a casual turn, a question, or a contained one-file edit, work directly and verify on the real artifact. Do not load the workflow for those.",
  "",
  "Say `/pstack off`, or just ask to leave the mode, to turn this off.",
].join("\n");

const OFF_WORDS = /^(off|disable|stop|exit)$/i;

export default function pstack(pi) {
  let modeOn = false;

  const showMode = (ctx) => {
    if (!ctx?.ui?.setStatus) return;
    ctx.ui.setStatus("pstack", modeOn ? "pstack: mode on" : undefined);
  };

  // The mode outlives a turn but not by default a session. Persisting it in a
  // custom entry is what makes "enter once" true across a resume, and the flag
  // is rebuilt from the branch rather than from a file this extension owns.
  pi.on("session_start", (_event, ctx) => {
    modeOn = false;
    try {
      for (const entry of ctx.sessionManager.getBranch()) {
        if (entry.type === "custom" && entry.customType === MODE_ENTRY) {
          modeOn = entry.data?.enabled === true;
        }
      }
    } catch {
      // A session manager that cannot be read leaves the mode off; the
      // command still turns it on for this session.
    }
    showMode(ctx);
  });

  // Entering the entry skill the usual way is entering the mode. Without this
  // the mode only works for people who learned the new command, which is not
  // the habit it is meant to replace. Messages the extension sends itself are
  // skipped: /pstack already set the flag before sending one.
  pi.on("input", (event) => {
    if (event.source === "extension") return;
    if (/^\/skill:pstack(?:\s|$)/.test(event.text)) {
      modeOn = true;
      pi.appendEntry(MODE_ENTRY, { enabled: true });
    }
  });

  pi.on("before_agent_start", (event) => {
    event.systemPromptOptions.sections[PROSE_SECTION] = PROSE_TEXT;
    if (modeOn) event.systemPromptOptions.sections[MODE_SECTION] = MODE_TEXT;
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

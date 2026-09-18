---
name: pstack-automate-me
disable-model-invocation: true
description: "Draft or revise a personal mode skill that captures how the user actually works, from their own recent session records plus what they tell you. Use for 'automate me', 'create my mode skill', 'turn my preferences into a skill', 'capture my working style', or wanting agents to follow the user's conventions."
---

# Automate me

A guided flow that turns the user's working conventions into a skill agents will follow. The output is one mode skill tailored to them, such as `jay-mode`.

This skill orchestrates the work: an inline mining pass, the authoring rules from `pstack`'s authoring-a-skill playbook, and `pstack-unslop` for prose discipline. It sequences them. It does not replace them.

## Flow

### 0. Check for an existing skill

Look for an existing mode skill for this user: a `*-mode` directory under the project's skill directory or the user's personal skill directory. If one exists, confirm intent with a short set of options (update it, or start fresh), unless they already said "update my skill".

Update mode changes the rest of the flow:

- Step 1 mines only the records from after the skill's last edit (for example `git log -1 --format=%cI <path>`).
- Step 2 asks what changed or is missing, not what to capture from zero.
- Step 4 edits the file in place, preserving sections the user has not contradicted, revising ones with new evidence, and adding a section only for a genuinely new rule.

### 1. Mine their history

Locate the records before searching. Read **only this project's** records: the current session record named by `PI_SESSION_FILE`, the other records in the same project directory, and the project's long-term memory. Do not read other projects' private sessions.

Survey the window for recurring patterns. For a large corpus, split it into two to four slices and run one fresh-context reader per slice ([guard-the-context-window](../pstack/references/principles.md#guard-the-context-window)). Read [`../pstack/references/execution.md`](../pstack/references/execution.md) before that fan-out: the readers are a short bounded investigation, so one slice per fresh context is enough and no independent verdict is involved. Each returns a short structured list of patterns with evidence pointers. Default signals worth hunting:

- Response preferences: length, tone, format, corrections like "dumb it down".
- Delegation habits: subagents, models, specialized workflows, parallelism.
- Verification posture: what "done" means, unit tests versus a live repro, reviewers.
- Code and prose discipline: style, principles cited, lint and format tools.
- Process conventions: worktrees, commits, PRs, review and merge tooling.
- Meta preferences: fixing skills mid-task, proposing new ones.

Cross-check across slices before elevating a signal. A pattern seen in two or more slices is high confidence. A lone signal is weak and usually gets dropped.

### 2. Ask the user directly

Mining misses intent that has not come up yet. Ask with a short list of options rather than making them type from scratch: one or two questions with four to six options each, multiple selections allowed for a category question. Start broad ("which areas matter most?"), then follow up on the selected areas. After the structured rounds, one open question catches what the options missed. Do not ask twenty questions.

### 3. Cluster the findings

Group the combined signals into sections. Use only what applies: response style, autonomy, understand-first, subagents, prose and code discipline, review and verify, process, skills.

`pstack` (the entry skill) shows the shape. Read it for granularity. Do not copy its content: the user's rules are not poteto's rules.

### 4. Draft the skill

Author it per `pstack`'s authoring-a-skill playbook.

- **Path**: preserve an existing mode skill's location. For a new one, put it in the project's skill directory as `<handle>-mode/SKILL.md`, or in the user's personal skill directory if they prefer a personal skill.
- **Handle**: the user's first name or chosen identifier.
- **Frontmatter `description`**: trigger on their name, `/<handle>-mode`, and "work in their style". Not on generic keywords like "write code".
- **`disable-model-invocation`**: decide explicitly. Skipping it means the mode applies whenever the model judges it relevant; setting it means only an explicit invocation loads it. Default to explicit invocation unless the user asks for it always-on.
- Keep the description to one YAML scalar, quoted when punctuation requires it.

### 5. Iterate on the prose

Apply `pstack-unslop` to every line. Show the draft and take feedback. Expect several rounds. Cut ruthlessly. A mode skill is not a manual.

### 6. Land it

Work in a worktree off the trunk branch. Commit. Open a PR only when the user authorized one; otherwise hand them the commit and the path.

## Guardrails

- **Do not overfit to one conversation.** A preference stated once and contradicted later is noise. Require more than one instance before codifying it.
- **Do not be clever.** Restating other skills, inventing metaphors, or writing "poetic" prose for an agent reader is cost without benefit. Keep it operational.
- **Reference, do not inline.** Other skills the user relies on appear as path references, not pasted excerpts.
- **Keep sections minimal.** Add a section only when the user has a specific, non-default rule there. "Communicate clearly" is not a section. "Short paragraphs. Tables when comparing options. Bullets only when items are genuinely parallel." is.
- **Name conventions generically.** Use "the user" in imperatives, not the author's first name.
- **Do not force symmetry.** No process rules worth writing means no process section.

## Evaluation

A mode skill is subjective output, so a benchmark loop is not useful here. Vibe-check with the user: does it read like them, and did it miss anything? Then ship. Run a description-tuning loop only if the skill's trigger accuracy turns out to be a problem in practice.

## When not to use

- The user wants a task-specific skill rather than working conventions: author it directly, no mining.
- The user wants one narrow workflow captured ("how I write commit messages"): that is a regular skill.

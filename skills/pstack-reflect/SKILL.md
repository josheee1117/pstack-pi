---
name: pstack-reflect
description: "Mine the current conversation for durable learnings and route each one to a concrete edit on an existing skill, a backlog item, or a rejection. Use when the user says reflect, or after a long task where the same friction is likely to recur."
---

# Reflect

Mine the current conversation for durable learnings, then route them into skill edits.

Step 2 runs review lenses. Read [`../pstack/references/execution.md`](../pstack/references/execution.md) before that: the lenses need a context that did not write the work, and when no such context exists you say so instead of presenting a self-check as independent.

## When to invoke

Invoke when the user says "reflect". Skip when the conversation is trivial, off topic, or already covered by an existing skill that the parent followed correctly. One-offs are not learnings.

## Process

### 1. Locate the run's records

The current session's record is named by `PI_SESSION_FILE` under Pi, or is the equivalent for this harness. Read only records belonging to this project. Do not read other projects' private sessions. For a long record, reduce it in a subagent or with a script and keep the reduced timeline in the main thread ([guard-the-context-window](../pstack/references/principles.md#guard-the-context-window)). If no record resolves, write a tight digest of the session and pass that instead.

### 2. Run three review lenses

Three reviewers over the same record, each with a different strength, plus one model or session different from the one that did the work when the environment allows. They must not modify anything: they read records, code, and connected sources, then return findings.

| Lens | Prompt | Strength |
|---|---|---|
| Judgment | [`references/judgment-reviewer.md`](references/judgment-reviewer.md) | Names the durable rule behind a specific incident. |
| Tooling | [`references/tooling-reviewer.md`](references/tooling-reviewer.md) | Names the concrete command, flag, or path detail that future agents would otherwise re-derive. |
| Divergent | [`references/divergent-reviewer.md`](references/divergent-reviewer.md) | Finds what the other two miss: second-order effects, skipped verification, decisions that survived by luck. |

Pass each template verbatim, substituting the record path or the digest and the scope the session actually used. Each lens needs its own fresh context that did not do the work being reviewed. **These lenses review conclusions, so a missing backend stops the step rather than collapsing to a self-review.** If no fresh context can be started, run nothing and follow [When a backend is missing](../pstack/references/execution.md#when-a-backend-is-missing): say the lenses are missing and let the operator pick a verified backend or change the requirement.

For this retrospective, the relevant session record or digest is the artifact under review, not a pre-review assessment of the code. Give each fresh reviewer only the project record authorized for this retrospective, the relevant diff, and its lens prompt. Do not include unrelated private records or other reviewers' findings. Keep the lenses separate until synthesis.

### 3. Synthesize

One synthesizer pass, using [`references/synthesizer.md`](references/synthesizer.md) verbatim with each reviewer's full output inlined. It returns a structured Accepted / Rejected / Backlog list.

### 4. Structural enforcement check

For any Accepted item that a lint rule, script, metadata flag, or runtime check would enforce more reliably, move it to Backlog ([encode-lessons-in-structure](../pstack/references/principles.md#encode-lessons-in-structure)).

### 5. Apply

Present the full Accepted / Rejected / Backlog output to the user and wait for explicit approval. Skill changes affect every future run. Do not auto-apply.

For each approved item, follow its routing exactly:

- A trivial existing-skill edit (a one-line bullet, a tightened sentence, a stale fact corrected): do it directly.
- A substantive existing-skill edit (a new section, a new table, more than about ten lines): draft it, then test the new text against the failure it is meant to prevent.
- `tune description: <skill path>`, where the skill existed but did not trigger when it should have: rewrite the description so it fires, and check the new description against the original miss.
- `new skill: <kebab-name>`: check first that no existing skill is a real home, then author it per `pstack`'s authoring-a-skill playbook.

Validate every touched skill afterward: frontmatter has a name and description, referenced files exist, cross-skill paths resolve.

### 6. Summarize

A short list, no preamble:

- Edits applied: `<skill path>`, what changed, one line each.
- Skills created: `<skill path>`, one line each (rare).
- Backlog: `<item>` (`<tags>`), one line each.
- Dropped: one line per rejected finding with the reason from the synthesizer.

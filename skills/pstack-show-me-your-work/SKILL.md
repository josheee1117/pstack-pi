---
name: pstack-show-me-your-work
disable-model-invocation: true
description: "Keep a reviewable decision trail for long-running or unattended work: a TSV log with one row per decision (what, why, evidence, result). Local by default; commit it when a reviewer needs the trail to trust the result. Use for /skill:pstack-show-me-your-work, autonomous or multi-phase runs, or work a human reviews after stepping away."
---

# Show me your work

Keep one canonical log.

## The format

A single TSV file, one row per decision. Cells stay single-line. Evidence is a pointer, not prose.

Copy [`references/decision-log-template.tsv`](references/decision-log-template.tsv) (the header row) to start a clean log. Columns:

- **ts.** ISO8601 timestamp.
- **phase.** The phase or workstream.
- **decision.** What was chosen or done, one line.
- **why.** The reason in plain words. If a principle drove it, say the reason plainly rather than citing a name.
- **evidence.** A pointer that proves it: commit SHA, PR number, `file:line`, or an artifact, trace, or screenshot path. Never a paragraph, and never a claim with no pointer.
- **result.** The outcome or predicate state: `tests green`, `reverted`, `pixel-diff 0`, `INCONCLUSIVE`, `open`.

An example, plain-spoken so a reviewer reads it at a glance. Illustration only. Do not copy these rows into a real log.

```
ts	phase	decision	why	evidence	result
2026-05-24T09:02:00Z	frame	counted the work first, about 100 components and roughly 75 hours	wanted to know the size before starting a long run	commit 3a9f1c2	found 5 things to sort out before starting
2026-05-24T09:40:00Z	harness	took screenshots of the old version before changing anything	so we can compare old against new and catch any visual change	scripts/snapshot.sh, baseline/	saved 120 reference screenshots
2026-05-24T11:15:00Z	widget	moved the widget styles over without changing how it looks	keep the change small and the result identical	commit 7c21e0a, pixel-diff 0	looks identical, tests pass
2026-05-24T12:30:00Z	widget	threw out a helper's work because its screenshots were blank	checked the real files instead of trusting its summary	worktree reset	reverted, tightened the instructions for next time
```

## Logging a row

Use the helper shipped next to this file: `bash <skill dir>/scripts/log.sh <logfile> <phase> <decision> <why> <evidence> <result>`, where `<skill dir>` is this skill's own installed directory (the `<skill ...>` block names it, and `References are relative to` repeats it). It stamps `ts`, creates the directory and the header on first use, strips stray tabs/newlines/CR from cells, and prefixes any cell starting with `=`, `+`, `-`, or `@` with a single quote, so a spreadsheet does not interpret generated or user-supplied text as a formula. If the host requires every file write to go through the edit/write tools, respect that constraint and write the row by hand in the same format instead of bypassing it. A bare `printf` appending a row works too, but mind those same bytes if cells come from generated or user-supplied text.

Write each entry the way you would tell a teammate what you did. Plain words, concrete actions, no jargon (`pstack-unslop` applies to log text too).

Log decision points and checkpoints, not every action: a fork chosen, a unit completed with its verification result, a pivot or revert with its trigger, a blocker surfaced, a gate fixed. For a loop, one row per iteration. Skip the trivial and the self-evident.

## Where it lives

By default the log is a working artifact, not committed. Keep it at `decisions.tsv` in the work directory, or `.audit/<task-slug>.tsv` when several efforts run at once, and leave it out of git.

Commit it only when the work is ambitious enough that a reviewer needs the trail to trust the result.

## Rules

- One row is one decision or checkpoint.
- Append-only. A wrong call gets a new row that supersedes it. Never edit or delete history.
- Prefer evidence produced by a committed script over a hand-made one-off ([encode-lessons-in-structure](../pstack/references/principles.md#encode-lessons-in-structure)).

## Audit the log against the record

At the end of the run, before handing back, check that the log told the truth. Read this run's own session record (`PI_SESSION_FILE` under Pi, or the harness equivalent) and walk the log against what actually happened:

- Every row maps to a real action. Cut invented or aspirational entries.
- Each row's evidence resolves and shows what the row claims.
- A fork, pivot, or abandoned approach that shaped the work but is not logged is a gap. Add it.
- Drop padding.

Fix the log, not the story. If the work diverged from what a row claims, the row is wrong.

## Independent review of the trail

Before handing back, have the trail read by a context that did not do the work, on a different model family when the environment allows. Self-review is not a substitute. When neither is available, say so in the Attention line. The reader looks for what the user should pay attention to, not a redo of the work:

- Decisions logged with weak or absent evidence.
- Verification steps skipped, or claimed without proof in the record.
- Choices that look risky in hindsight: premature, scope-creeping, papering over a symptom.
- Gaps the user would otherwise miss on a casual skim.

Every reply for a run that produced a trail ends with an `Attention` section. Lead with who reviewed it on its own line (the model or reviewer identity), then list each flag pointing at specific rows or moments. "No flags" is a valid value. The reviewer identity is not optional.

## Reviewing the trail

Read top to bottom, follow the evidence pointers, spot-check. A committed TSV renders as a table in most forge UIs. `column -s$'\t' -t decisions.tsv` renders it in a terminal.

## Composing this skill

Other skills route their audit trail here instead of inventing one. Reference it by name and let it own the format. Do not restate the columns.

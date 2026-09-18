---
name: pstack-figure-it-out
description: "Design an auditable playbook when no narrower one fits: a large migration, an ambitious multi-part change, or work a human reviews after stepping away. Scales rigor to the task, runs a hypothesis loop, and logs decisions. Use for /skill:pstack-figure-it-out, 'figure it out', a large migration, or when no narrower playbook applies."
---

# Figure it out

When the task matches no playbook, design one. The deliverable before any code is the workflow itself: a sequence of phases that scales rigor to the task, runs the scientific method, and leaves a decision trail a human can audit after stepping away. Bias toward more rigor. The cost of building the wrong thing dwarfs the cost of being careful.

## Start

Open a checklist whose first item is to read the summary section of `pstack` (the entry skill). Then add these phases as items.

## Phase A. Frame

Ground first, then commit. Do not start the run until you can state:

- The definition of done as a falsifiable predicate (`references/principles.md#prove-it-works`).
- Scope, quantified: rough units and effort, plus the blockers that grounding surfaced.
- The rigor level, biased high. One-way doors and high blast radius get more. Reversible low-stakes steps get less. Rigor means gates and artifacts, not "try harder".

Present the framing and the tradeoffs before committing to a long run. Reversible work proceeds (`references/principles.md#never-block-on-the-human`), but a multi-hour run earns one checkpoint.

## Phase B. Design the workflow

Decompose into atomic, independently landable units. Sequence the riskiest unknown first. Scaffold and verification come before features (`references/principles.md#foundational-thinking`).

- Build the verification harness before the work, with the baseline captured from the pre-change state, so the check reads as "old value versus new value".
- For one-way-door design decisions, run `pstack-architect`, which runs `pstack-arena`. Skip it for mechanical work whose shape is already concrete. A second arena over a settled design is over-engineering (`references/principles.md#laziness-protocol`).
- Decide what fans out. Parallelize only across seams, and give each writer its own worktree or branch (`references/principles.md#separate-before-serializing-shared-state`). Do not over-fan.
- Write the designed phase list down. That list is what the human reviews.

Then execute the design: add its steps to the checklist as concrete items, after the Phase C entry and before Phase D. Run each under the Phase C loop discipline, weaving the Phase D log through them, a row as each step lands, rather than saving the whole trail for the end.

## Phase C. Run the loop

Each unit is an experiment. State the hypothesis, make the smallest change, measure against the predicate on the real artifact, keep it if it advanced, revert it if it did not. Apply `references/principles.md#sequence-verifiable-units`: verify each unit before starting the next instead of batching checks at the end.

- Verify by inspecting the artifact, never a self-report. When something passes too easily, suspect the observation method before the system.
- Pair delegated work with an independent check, and audit the delegate's artifacts yourself before trusting them. If a worker games the gate, reset and harden the contract. If the gate itself is wrong, fix the gate in its own change rather than routing around it.
- A verdict is VERIFIED, NOT VERIFIED, or INCONCLUSIVE. Inconclusive is not a pass. Do not hide a negative.

## Phase D. Keep the audit trail

Log the run via `pstack-show-me-your-work`: one canonical TSV, a row per decision and per unit, evidence as links. figure-it-out's work is usually ambitious enough to commit the trail so the reviewer can read it in the PR. Commit it when confidence has to be shown. Prefer evidence produced by committed scripts. The trail plus the diff is what lets the human come back and trust the work.

## Phase E. Verify and hand back

Check the whole against the Phase A predicate on the real product, not just the harness. Encode any recurring correction as a gate, lint rule, check, or script (`references/principles.md#encode-lessons-in-structure`).

**Reply.** The playbook you designed, the rigor level and why, the decision-trail path, what is verified against the predicate, and what is still open.

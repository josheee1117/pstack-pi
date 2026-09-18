---
name: pstack-arena
description: "Run N parallel attempts at the same task, pick a base, and graft the strongest parts of the losers into it. Use for /skill:pstack-arena, 'arena this', 'throw it in the arena', 'compare approaches', or when one attempt at a non-trivial artifact would lock in the wrong shape."
---

# Arena

Fan out N parallel attempts at the same task. Read every candidate end to end. Pick the strongest as the base. Graft the best ideas from the others into it. Verify the synthesized result.

Read [`../pstack/references/execution.md`](../pstack/references/execution.md) before launching. It owns the backend choice, the independence rules, and what to do when a backend is missing. Each candidate needs its own context and its own working copy, per the package default there.

## Start

Open a checklist with one item per phase before launching anything: Frame, Fan out, Cross-judge, Pick, Graft, Verify.

## Phase A. Frame

The candidates receive the same prompt, so the prompt is the contract.

1. State the artifact each candidate produces.
2. Derive the rubric. State what success looks like for *this* task, then turn it into three to six concrete gradeable criteria. The rubric is the picker's tool in Phase D. Candidates see only the task.
3. Pick the runners. Use the operator's configured runner set when one exists. Otherwise choose distinct models this environment actually offers, and when only one model or no subagent mechanism is available, produce the candidates yourself as clearly distinct attempts and say so. Same model N times when the work is generation-bound rather than judgment-sensitive.
4. Assign output paths. Each candidate writes to its own location, a git worktree where possible, otherwise a scratch directory per candidate ([separate-before-serializing-shared-state](../pstack/references/principles.md#separate-before-serializing-shared-state)).

## Phase B. Fan out

Spawn all N in one message when the environment supports it, each with the task, the path to the shared grounding, its own output path, and instructions to produce both the artifact and a short rationale naming the alternatives it considered and rejected. When only one session is available, run them sequentially and say so; the value of the arena survives sequential runs, only slower.

If a candidate fails to produce output, proceed with N-1 and note the dropout in the synthesis record.

## Phase C. Cross-judge

After the candidates complete, spawn one read-only judge on a model family different from the parent's when the environment allows. It sees the rubric and the candidates by label, scores each criterion, and recommends a base with rationale. It runs in parallel with your own reading in Phase D, not with the candidates. Do not start the judge while candidates are still writing. With no judge available, say so and hold yourself to the rubric criterion by criterion.

## Phase D. Pick a base

Read every candidate end to end before picking. Score each against the rubric criterion by criterion, not on holistic feel. Compare against the cross-judge. Agreement on the base confirms the pick. Disagreement means one of you is biased or the rubric was ambiguous, so read both rationales before deciding.

Pick the base a future maintainer can extend most easily without breaking invariants. Prefer the cleaner boundary or smaller API when two feel tied ([laziness-protocol](../pstack/references/principles.md#laziness-protocol)).

Record the pick and the reason in a short synthesis note alongside the base artifact, including the cross-judge's verdict.

## Phase E. Graft

Walk each losing candidate once more and identify what is worth porting into the base. The signal is usually one or two things per candidate, not most of it.

Fold each graft in by hand, per [redesign-from-first-principles](../pstack/references/principles.md#redesign-from-first-principles). Do not paste mechanically. The result must stay coherent under one mental model.

Record what was grafted, from which candidate, and what was rejected and why.

When the candidates converge on the same shape, that is a strong signal. Note the convergence and ship the consensus shape; no graft is needed. When they diverge wildly, Phase A was under-specified. Reframe and re-run rather than averaging the divergence.

## Phase F. Verify

The synthesized artifact holds up under the same scrutiny as any other output ([prove-it-works](../pstack/references/principles.md#prove-it-works)).

If verification surfaces a problem the arena missed, either Phase A was wrong, so reframe and re-run, or one candidate caught it and you missed the graft, so return to Phase E. Do not paper over it.

## Outputs

One synthesized artifact. One short synthesis note alongside it: the base, the grafts with their source candidate, the rejections, any dropouts, and the verification result.

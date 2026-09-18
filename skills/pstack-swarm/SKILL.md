---
name: pstack-swarm
description: "Fan out N parallel workers, drain them, and return one report. Use for /skill:pstack-swarm, 'swarm this', or parallel coverage, races, gauntlets, and exploration partitions."
---

# Swarm

Fan out N parallel workers. They may cover separate slices, race the same brief, or mix both. The parent waits, aggregates, and returns one report.

## Start

Open a checklist with one item per phase before launching anything: Frame, Fan out, Aggregate, Report.

## Phase A. Frame

1. State the done predicate and the artifact or report the swarm must return.
2. Choose the shape: partition into slices, race N workers on identical briefs, or both. For a race or mixed shape, declare `first pass`, `rank all`, or `best-of` before spawning.
3. Set N from the user or derive it from the shape. N is the total worker count, not the environment's concurrency limit.
4. Pick the worker model from the operator's configuration when one exists, otherwise from what the environment offers. For a model race, name each arm's model up front. Do not invent model names.
5. Give each worker its own writable output when it writes, and its own worktree when it writes to a repo.

## Phase B. Fan out

Spawn all N in one message when the environment supports parallel sessions, with a fresh context each. When it does not, run them in sequence and say so in the report. Run a worker in this machine's working directory only when it needs something that exists only here.

When a worker must start from a specific pushed branch, pass that branch.

Every brief stands alone. Include the goal, the scope, the exact slice or race arm, how to verify, and what to report. Reports use `PASS`, `ISSUES`, or `BLOCKED` with evidence.

If a worker drops out, proceed with N-1 and note it.

## Phase C. Aggregate

Read the terminal results. For coverage, every required slice needs a result. For a race, apply the selection rule declared up front. Do not paste raw worker dumps.

Keep a compact result table, one-line evidenced issues, and explicit gaps or dropouts.

## Phase D. Report

Return one consolidated report in chat: the table, the issue one-liners, gaps or dropouts, and the race rule when one was used.

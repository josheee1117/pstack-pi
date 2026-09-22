---
name: pstack-swarm
disable-model-invocation: true
description: "并行分工与汇总：派出 N 个工作者，收齐各路结果后形成一份报告。适用于分片调查、并行覆盖、方案竞速或多轮挑战。"
---

# Swarm

Fan out N parallel workers. They may cover separate slices, race the same brief, or mix both. The parent waits, aggregates, and returns one report.

Read [`../pstack/references/execution.md`](../pstack/references/execution.md) before spawning. It owns the backend choice, the independence rules, and what to do when a backend is missing. Parallel writers take the package default there: an independent Pi session per writer in its own exclusive worktree.

## Start

Open a checklist with one item per phase before launching anything: Frame, Fan out, Aggregate, Report.

## Phase A. Frame

1. State the done predicate and the artifact or report the swarm must return.
2. Choose the shape: partition into slices, race N workers on identical briefs, or both. For a race or mixed shape, declare `first pass`, `rank all`, or `best-of` before spawning.
3. Set N from the user or derive it from the shape. N is the total worker count, not the environment's concurrency limit.
4. Pick the worker model from the operator's configuration when one exists, otherwise from what the environment offers. For a model race, name each arm's model up front. Do not invent model names.
5. Give each worker its own writable output when it writes, and its own worktree when it writes to a repo.

## Phase B. Fan out

Spawn all N in one message when the environment supports parallel sessions, with a fresh context each. When concurrency is limited, run them in sequence and say so in the report. **A sequential run is the same swarm**: each worker still gets its own fresh context, and the parent context does not stand in for one. Looping the workers inside the parent is not a smaller swarm, it is a different thing that reports one context's work as N. Run a worker in this machine's working directory only when it needs something that exists only here.

When a worker must start from a specific pushed branch, pass that branch.

Every brief stands alone. Include the goal, the scope, the exact slice or race arm, how to verify, and what to report. Reports use `PASS`, `ISSUES`, or `BLOCKED` with evidence.

If a worker drops out, proceed with N-1 and note it.

## Phase C. Aggregate

Read the terminal results. For coverage, every required slice needs a result. For a race, apply the selection rule declared up front. Do not paste raw worker dumps.

Keep a compact result table, one-line evidenced issues, and explicit gaps or dropouts.

## Phase D. Report

Return one consolidated report in chat: the table, the issue one-liners, gaps or dropouts, and the race rule when one was used.

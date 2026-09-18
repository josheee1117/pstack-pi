# Execution and replacement

Read this before you delegate work, run attempts in parallel, or obtain an independent review. It is the shared policy for "who does this work, in what context, and with what independence". Skills point here by relative link instead of restating it.

## Resolution order

1. **The current request.** What the operator asked for in this conversation wins.
2. **The using project's `AGENTS.md` mapping.** If that project maps a capability to a concrete tool or skill, use it. Read the mapping before substituting anything, and follow the mapped tool's own authorization and command contract.
3. **The package default below.** Used when neither above says otherwise.

An explicitly approved alternative configuration is a legitimate answer at level 1 or 2. Do not second-guess it back to the default.

## Discover before you assume

Do not assume a tool exists because a skill once named it. When this file says a capability is satisfied by a program or skill, confirm it is actually installed and read how it is meant to be used before you invoke it. If it is not there, the capability is not satisfied.

## Package default for delegation

Work that needs an owner, a parallel writer, or independence gets a backend chosen by the kind of work:

- **Long-lived owner, parallel writer, `swarm`, `arena`, or a formal independent review.** An independent Pi session managed by Herdr (one session per writer, its own exclusive git worktree), with pi-intercom for cross-session messages. This is the default because it is the shape that gives a genuinely separate context and a genuinely separate working copy.
- **A short, bounded investigation.** A fresh-context subagent is enough. This is not a hard dependency on any particular subagent extension: use whatever fresh-context mechanism the environment provides, and if it provides none, see the gap rules below.

Herdr here is the **execution mechanism**. It governs where a session runs and how it is located and messaged. It does not change the task decomposition, the aggregation rule, or the independence requirement of the work that runs on it. A `swarm` still partitions and aggregates per its own skill; `arena` still picks a base and grafts; `interrogate` still synthesizes a verdict.

## Independence

Independence comes from a separate context and a separate working copy, not from a separate model name.

- **One model is not one context.** If you can still start a fresh context, do, and keep the independence. Do not collapse to self-review merely because only one model is available in the environment.
- **Self-review is not independent review.** A session reviewing work it produced, or the main session reporting "looks good", is not evidence and never substitutes for an independent verdict. Say plainly when a step is a self-check rather than an independent one.
- **Give the reviewer the requirement and a pinned version.** Provide the task's requirement plus a fixed code version (a commit SHA, a tag, or a frozen worktree). Do not pre-feed the implementer's self-report, its decision trail, or another reviewer's conclusions, because those anchor the reviewer to the author's framing. Let the reviewer reach its own read of the code.
- **Preserve the artifacts.** A substituted tool still has to produce the same conclusion, evidence, and independence the original step required. Replacing the implementation never excuses dropping the product.

## Substituting a concrete skill

When the using project maps a capability to one of its own skills instead of this package's, discover and read that skill before relying on it, then operate under its rules. A mapping is a pointer, not a promise: confirm the skill exists, read what it actually does, and check that its output still satisfies this task's artifacts, evidence, and independence requirements. If it does not, treat that as a mismatch and say so rather than pretending the step passed.

## When a backend is missing

Do not silently fall back to something weaker and call it equivalent.

1. **Name the gap.** Say which capability is unsatisfied and what you discovered instead.
2. **When the step needs independence, stop and let the operator choose**: accept a backend you found and verified, accept a weaker one knowingly, or change the requirement. Do not decide this for them, and do not present a self-check as if it were the independent step.
3. **Do not switch backends mid-task.** A task already started is finished by the backend that started it. Record the decision before changing it, so the same work is not left half-done in two places.
4. When a non-delegated step simply does not need a backend, do it directly. See below.

## What still runs directly

Not every task is a delegation.

- A non-delegated, ordinary task runs in the main session, at the process weight its real risk justifies. There is no obligation to spin up a full independent workflow for a small, reversible change.
- Read-only questions, single-file lookups, and direct answers are done directly.
- What the main session may not do is manufacture independence it does not have. Whenever a playbook requires an independent verdict, an independent owner, or a parallel writer, obtaining that is the requirement, not an optional flourish.

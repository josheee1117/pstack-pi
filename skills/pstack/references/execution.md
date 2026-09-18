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

- **Long-lived owner, parallel writer, `swarm`, `arena`, or a formal independent review.** An independent Pi session managed by Herdr (one session per writer, its own exclusive git worktree), with pi-intercom for cross-session messages. This is the default because it is the shape that gives a genuinely separate context and, for a writer, a genuinely separate working copy.
- **A short, bounded investigation.** A fresh context is enough. This is not a hard dependency on any particular subagent extension: use whatever fresh-context mechanism the environment provides, and if it provides none, see the gap rules below.

Herdr here is the **execution mechanism**. It governs where a session runs and how it is located and messaged. It does not change the task decomposition, the aggregation rule, or the independence requirement of the work that runs on it. A `swarm` still partitions and aggregates per its own skill; `arena` still picks a base and grafts; `interrogate` still synthesizes a verdict. Running workers one after another because concurrency is limited is still the same swarm, as long as each worker keeps its own fresh context.

## Independence

Independence comes from two things, and neither of them is a model name.

- **A context that did not produce the work.** A fresh session, or any other mechanism that yields a genuinely separate context. The same model in a fresh context is independent. Different model names sharing one context are not.
- **For a reviewer, a blind read of a fixed artifact.** Give the requirement plus a pinned version: a commit SHA, a tag, or a frozen worktree.

An **exclusive working copy is required for writers**, not for readers. A read-only reviewer may read the same stable snapshot several reviewers share; it must not be handed the author's framing.

- **One model is not one context.** If you can still start a fresh context, do, and keep the independence. Do not collapse to self-review merely because only one model is available in the environment. Losing model diversity is a real but different loss from losing independence.
- **Self-review is not independent review.** A session reviewing work it produced, or the main session reporting "looks good", is not evidence and never substitutes for an independent verdict. Say plainly when a step is a self-check rather than an independent one.
- **Do not pre-feed the framing.** Do not hand the reviewer the implementer's self-report, its decision trail, or another reviewer's conclusions, because those anchor the reviewer to the author's framing. Let the reviewer reach its own read of the code.
- **Preserve the artifacts.** A substituted tool still has to produce the same conclusion, evidence, and independence the original step required. Replacing the implementation never excuses dropping the product.

## A capability you can use is not a permission to use it

Availability never grants authority. Delegation, substitution, and the choice of backend still obey the current request, the applicable project instructions, and the mapped tool's own authorization and command contract. A tool being installed, or a mechanism being reachable, is a reason it *can* be used, not a reason it may be.

No command wrapper, registry, or extension is needed for any of this. The policy is text the skill reads.

## Substituting a concrete skill

When the using project maps a capability to one of its own skills instead of this package's, discover and read that skill before relying on it, then operate under its rules. A mapping is a pointer, not a promise: confirm the skill exists, read what it actually does, and check that its output still satisfies this task's artifacts, evidence, and independence requirements. If it does not, treat that as a mismatch and say so rather than pretending the step passed.

## When a backend is missing

Do not silently fall back to something weaker and call it equivalent.

1. **Name the gap.** Say which capability is unsatisfied and what you discovered instead.
2. **When the step needs independence, stop and let the operator choose**: accept a backend you found and verified, accept a weaker one knowingly, or change the requirement. Do not decide this for them, and do not present a self-check as if it were the independent step.
3. **Do not switch backends mid-task.** A task already started is finished by the backend that started it. Record the decision before changing it, so the same work is not left half-done in two places.
4. When a non-delegated step simply does not need a backend, do it directly. See below.

## What still runs directly

Not every task is a delegation. The single criterion is whether the step's own product requires independence:

- **No**, the step just needs the work done. Run it in the main session, at the process weight its real risk justifies. There is no obligation to spin up a full independent workflow for a small, reversible change, a read-only question, a single-file lookup, or a direct answer.
- **Yes**, the step's product is an independent verdict, an independent owner, a parallel writer, or a set of genuinely separate attempts. Then obtaining a separate context is the requirement, not an optional flourish. It does not downgrade to a self-check when a backend is missing; it stops and asks, per above.

The trap this section exists to close: a skill that says "when no mechanism is available, do it yourself" has quietly converted a required independent step into a self-review. When you meet that instruction, apply the criterion instead of the instruction.

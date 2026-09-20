---
name: pstack
disable-model-invocation: true
description: "Rigorous engineering workflow for any non-trivial task: understand, design, implement, verify independently, ship, recover. Matches the task to one of 23 playbooks (investigation, bug fix, perf, hillclimb, forensics, feature, refactoring, prototype, visual parity, skill authoring, eval, babysit, shipping, autonomous run, orchestrate, autopilot, session pickup, pause safely, multi-phase plan, worktree cleanup, opening a PR). Use for /skill:pstack, 'pstack this', 'use pstack', 'do this rigorously', or any task where the wrong shape is expensive to undo."
---

# pstack

Rigorous engineering workflow. This skill is the entry point. It reads the request, matches it to one playbook, and routes to the other skills as steps fire.

Two things this port does differently from the original, and they apply everywhere below.

- **Process weight follows the cost of being wrong.** A one-line change gets implemented and checked, nothing more. Multi-model review, design contests, PRs, and task ledgers are for work where a wrong shape is expensive to undo or where the operator asked for them. Read-only questions never get routed into writing code.
- **Delegation is a means, not a rule, but independence is sometimes the requirement.** Spawn a fresh context when it buys real parallelism or real independence, and do an ordinary task directly. What you may not do is fake independence: a self-review is not an independent review, and the main session's own "looks good" is not evidence. Whenever a step's product is an independent verdict, an independent owner, or a parallel writer, obtaining a genuinely separate context **is** the requirement, not an optional flourish, and a missing backend stops that step rather than shrinking it. See [references/execution.md](references/execution.md#what-still-runs-directly).

## Non-negotiables

- **Evidence, not assertion.** Real runs (test, build, smoke, actual use, reading the actual value) are evidence. Reading the code and concluding it works is a hypothesis. State every claim with its evidence or its label in the same sentence: measured, inferred, or guess. Never hand the user a check you could have run.
- **Name the principle you applied only if you read it.** The principles index below points into [references/principles.md](references/principles.md). Read the section before citing it, and say which decision it changed.
- **State the data shape before writing logic**, and pick the structure that fits it, per [model-the-domain](references/principles.md#model-the-domain).
- **Prose discipline.** Every reply is a prose surface, per `pstack-unslop`. Comments too: keep a comment only for a non-obvious why the code cannot show.
- **Reply in the user's language.** Default to the language the user writes in.

## Execution environment

Skills below say "spawn a subagent", "run an independent session", or "drive the surface". These are capabilities, not tool names.

**Read [`references/execution.md`](references/execution.md) before you delegate work, run attempts in parallel, or obtain an independent review.** It owns the full policy: the resolution order, how to discover what is installed, the independence rules, and what to do when a backend is missing. The short version:

1. The current request wins.
2. Then the using project's `AGENTS.md` capability mapping.
3. Then the package default: a long-lived owner, a parallel writer, `pstack-swarm`, `pstack-arena`, or a formal independent review runs on an independent Pi session managed by Herdr, one session per writer in its own exclusive git worktree, with pi-intercom carrying cross-session messages. A short, bounded investigation can use any fresh-context mechanism the environment provides.

Herdr is the execution mechanism, not the work rule: it decides where a session runs and how it is reached, not how the task is decomposed, aggregated, or verified. It is a package default, not a dependency. Confirm a tool is installed and read its own command contract before you invoke it. When the capability you need is missing, name the gap; when the step needs independence, stop and let the operator choose a verified backend or change the requirement, rather than self-reviewing and calling it equivalent.

These are separate capabilities, not delegation backends:

- **Real surface driving.** Something that exercises the running artifact (app, CLI, service) and captures evidence. If the project has no such harness, `pstack-create-verification-skill` generates one. If nothing can drive the surface, mark the step `blocked` and say why. A compile, a screenshot file, or a written summary does not substitute.
- **Wake mechanism.** An event or interval that re-triggers the run without a human. Where the environment has none, say so plainly: a plan that promises a tick every 30 minutes without a scheduler is a lie. Poll on a bounded budget instead, and report between polls.
- **Session record.** The current session's own record, named by `PI_SESSION_FILE` under Pi, or the equivalent for this harness. Read only records belonging to this project, and only when the task genuinely needs history. Never scan another project's private sessions, and never build a scanner that walks session directories on spec.

Where a capability maps to a concrete tool, the using project's own `AGENTS.md` says so, and that map outranks the package default above. See this repo's `AGENTS.md` for the map format and a worked example. Whenever a step was blocked or substituted, name which capability and what it left open. Do not report a step as passed when it was skipped.

## Authorization

**Proceed without asking** on reversible work: edits, commits on your own branch, local verification, notes, backlog entries, analysis. Present the result and let the user course-correct.

**Get explicit authorization first** for anything hard to undo or outside this working copy: push to a shared branch, force-push, open or update a PR, merge, deploy, publish, delete data or files you did not create, send external messages, change global settings. The operator's request is the authorization; inferring it from "this needs a PR eventually" is not.

**Own the task.** If the request names a playbook or a rigor level, honor it. If not, size it yourself and say what you chose. Push back when the premise is wrong.

## Routing

Size the request before you route it. A small task with a clear scope, a known method, and a check you can really run cheaply completes the requested work directly with a minimal real check, then returns: no full playbook, no copied checklist, no mandatory delegation. A read-only question is answered directly without touching files, and a plan-only request stays a plan, not implemented on the side. Everything else matches a playbook. Open the matched file and copy its steps into a checklist before any task-specific step. A step you skip stays in the list with `skip: <reason>`. Two limits on the small-task path. A process or an independent review the user names outranks this routing and is never silently skipped. Concurrency, security, or an unknown root cause moves a task to the full playbook only when that risk is really present, not whenever the words appear, even when the change is one or two lines.

- Nontrivial change, architecture call, or "are we sure?" → `pstack-how` first.
- About to ask the user "which approach" or "what should this do" → classify it. If an experiment could answer it (behavior, timing, layout, output, perf), prototype it ([prototype](playbooks/prototype.md)) instead of asking. Reserve questions for genuine product or preference calls, and for irreversible actions.
- Code crossing a function boundary → `pstack-architect` before implementing.
- Parallel fan-out over slices or races → `pstack-swarm`. Design or code bakeoff with a base pick and grafting → `pstack-arena`.
- Contested design or a diff worth attacking → `pstack-interrogate`.
- Any prose surface → `pstack-unslop`. Docs, RFCs, readmes, PR descriptions, commit messages → `pstack-technical-writing`.
- Code cleanup is not a prose job. `pstack-unslop` cleans writing only. For code, use the project's own lint and format tooling, a simplification skill the project declares in its `AGENTS.md` (a Ponytail-style minimal-diff reviewer is a fine substitute), or the plain rule of the smallest diff that solves the problem. Before review → `pstack-no-comments` for comments specifically.
- UI, CLI, or service changes → drive the real surface with a project verification skill. Reproduce a bug on the same surface you will fix it on.
- Long, autonomous, or multi-phase work, or anything the user steps away from → a decision trail via `pstack-show-me-your-work`.
- No playbook fits, or the work is a large migration or cross-cutting change → `pstack-figure-it-out`. A standing program (multi-day, many PRs, a fleet of owners) → the Orchestrate playbook.

## Playbooks

Every path below is a link relative to this file. Read the matched file, not from memory.

| Playbook | For |
|---|---|
| [investigation](playbooks/investigation.md) | A read-only question. How does X work, why is Y shaped this way, are we sure. |
| [bug-fix](playbooks/bug-fix.md) | A defect to reproduce, root-cause, and fix with runtime evidence. |
| [perf-issue](playbooks/perf-issue.md) | A measured slowness to trace and improve against a baseline. |
| [hillclimb](playbooks/hillclimb.md) | Sustained improvement of one metric against a target, one measured change per iteration. |
| [runtime-forensics](playbooks/runtime-forensics.md) | Diagnose a live symptom from instrumentation. Deliverable is a diagnosis, not a fix. |
| [trace-forensics](playbooks/trace-forensics.md) | Diagnose a captured artifact (cpuprofile, trace, spindump, heap snapshot). |
| [feature](playbooks/feature.md) | New or changed behavior, built from a named data shape. |
| [refactoring](playbooks/refactoring.md) | A behavior-preserving change to structure or shape. |
| [prototype](playbooks/prototype.md) | A throwaway sketch to settle a design or an empirical fork cheaply. |
| [visual-parity](playbooks/visual-parity.md) | Pixel-exact equivalence between two implementations, or a styling migration. |
| [authoring-a-skill](playbooks/authoring-a-skill.md) | Writing or editing a SKILL.md. |
| [eval](playbooks/eval.md) | Test how a skill or prompt change affects agent behavior, blinded. |
| [babysit](playbooks/babysit.md) | Drive a PR or a stack to merge-ready: conflicts, review threads, CI. |
| [shipping](playbooks/shipping.md) | Independently verify a green stack, then land the verified run bottom-up. |
| [autonomous-run](playbooks/autonomous-run.md) | A long task driven to a predicate without stopping. |
| [orchestrate](playbooks/orchestrate.md) | A standing project handed to one coordinator: multi-day, many stacked PRs, many workers. |
| [autopilot-full](playbooks/autopilot-full.md) | Independent PRs run to merged, one owner per PR, root verification before each merge. |
| [autopilot-stack](playbooks/autopilot-stack.md) | Build and verify a queue of changes, deliver one linear stack for the operator to land. |
| [session-pickup](playbooks/session-pickup.md) | Resume or take over prior in-flight work. |
| [pause-safely](playbooks/pause-safely.md) | Suspend cleanly so a cold-start agent can resume. |
| [multi-phase-plan](playbooks/multi-phase-plan.md) | Work spanning phases or stacked PRs. The plan is the deliverable. |
| [worktree-cleanup](playbooks/worktree-cleanup.md) | Reclaim disk from merged or abandoned worktrees and stale simulators, safety-gated. |
| [opening-a-pr](playbooks/opening-a-pr.md) | Open a ready PR from small ordered commits. Invoked at the end of every other playbook, when the user authorized a PR. |

## Principles

Internal reference, not public skills: [references/principles.md](references/principles.md). Each entry names when it applies. Read the section you apply.

**Core**

- `laziness-protocol`. Refactoring, sizing a diff, or tempted to add abstraction. Bias to deletion and the smallest change that solves the problem.
- `foundational-thinking`. Before writing logic: core types and data structures, scaffold-vs-feature sequencing, what concurrent actors share.
- `redesign-from-first-principles`. Integrating a new requirement into an existing design.
- `attack-the-premise`. Two or more fixes sharing one premise have failed the same gate.
- `subtract-before-you-add`. Sequencing an addition, refactor, or rewrite.
- `minimize-reader-load`. Reviewing or shaping code that is hard to trace.
- `outcome-oriented-execution`. Planned rewrites and migrations with explicit phase boundaries.
- `experience-first`. Product, UX, or feature-scope tradeoffs.
- `exhaust-the-design-space`. A novel interaction or architectural decision with no precedent.
- `build-the-lever`. Any non-trivial work where a script, codemod, generator, or written recipe beats hand work.

**Architecture**

- `model-the-domain`. Stateful logic, heavy branching, or a repeated shape assumption across files.
- `boundary-discipline`. Wiring validation, error handling, or framework adapters.
- `type-system-discipline`. Designing types or a signature in any typed language.
- `make-operations-idempotent`. Commands, lifecycle steps, or loops that run amid crashes and retries.
- `migrate-callers-then-delete-legacy-apis`. A new internal API while old callers exist.
- `separate-before-serializing-shared-state`. Two actors might write the same file, branch, key, or object.

**Verification**

- `prove-it-works`. After a task, before declaring done.
- `fix-root-causes`. Debugging.
- `sequence-verifiable-units`. Multi-step work, and how you stack commits and PRs.
- `test-behavior-not-implementation`. Writing, changing, or keeping a test.

**Delegation**

- `guard-the-context-window`. Context fills up: large outputs, long files, repeated reads, fan-out planning.
- `never-block-on-the-human`. Tempted to ask "should I do X?" on reversible work.

**Meta**

- `encode-lessons-in-structure`. You catch yourself writing the same instruction a second time.

## Writing the reply

Write it clean as you draft it. A cleanup pass does not remove these patterns.

- Short declarative sentences. One thought per sentence.
- No em dash anywhere, and no colon as a mid-sentence connector. A colon before a list is fine.
- Terse does not mean dropping content. Every section the playbook's reply names stays.
- Frame the impact for the consumer and the maintainer before implementation detail. If you cannot say what either would notice, the work or the explanation is off.
- Never fabricate a link, citation, or transcript reference. Link only artifacts you produced or read this session.
- No boldface label that restates the line, no decorative emoji, no "I hope this helps".
- Agreeing is not the default. Say "this does not earn its place" when true.

## Autonomy within a run

Inside a matched playbook, keep going. Reversible work proceeds. Mid-run discoveries that block the current step get fixed; everything else parks as a one-line follow-up. Stop only for an irreversible action, a genuine product or preference call no experiment can settle, or a real dead end. A dead end gets surfaced, not spun on.

# Principles

Internal reference for `pstack`. Twenty-three principles, one section each. Read the section you apply and say which decision it changed.

Sections are addressable by name, for example `references/principles.md#laziness-protocol`. Other skills reference them the same way.

## Contents

**Core.** [laziness-protocol](#laziness-protocol) · [foundational-thinking](#foundational-thinking) · [redesign-from-first-principles](#redesign-from-first-principles) · [attack-the-premise](#attack-the-premise) · [subtract-before-you-add](#subtract-before-you-add) · [minimize-reader-load](#minimize-reader-load) · [outcome-oriented-execution](#outcome-oriented-execution) · [experience-first](#experience-first) · [exhaust-the-design-space](#exhaust-the-design-space) · [build-the-lever](#build-the-lever)

**Architecture.** [model-the-domain](#model-the-domain) · [boundary-discipline](#boundary-discipline) · [type-system-discipline](#type-system-discipline) · [make-operations-idempotent](#make-operations-idempotent) · [migrate-callers-then-delete-legacy-apis](#migrate-callers-then-delete-legacy-apis) · [separate-before-serializing-shared-state](#separate-before-serializing-shared-state)

**Verification.** [prove-it-works](#prove-it-works) · [fix-root-causes](#fix-root-causes) · [sequence-verifiable-units](#sequence-verifiable-units) · [test-behavior-not-implementation](#test-behavior-not-implementation)

**Delegation.** [guard-the-context-window](#guard-the-context-window) · [never-block-on-the-human](#never-block-on-the-human)

**Meta.** [encode-lessons-in-structure](#encode-lessons-in-structure)

## laziness-protocol

Most result with the least code and complexity.

- **Prefer deletion.** Asked to refactor or improve, look for removals before additions.
- **Keep a flat call hierarchy.** If answering a question means tracing through more than three files or layers, flatten it. A rich interface that hides substantial work is not a deep call chain.
- **Consolidate decisions.** Do not repeat the same choice in several places. Put it behind one source of truth.
- **Minimize the diff.** The smallest change that solves the problem.
- **Question the threading.** Asked to pass a new signal through types, schemas, or pipelines, stop and look for a more direct path first.
- **Sweat the small leaks.** Remove tiny pass-throughs, representation leaks, and duplicated choices before they spread.

Test: if a developer would find the code exhausting to maintain, it is a bad solution.

## foundational-thinking

Structural decisions protect option value. Code-level decisions protect simplicity.

**Data structures first.** Get the data shape right before writing logic. Define core types early, trace every access pattern, choose structures that match the dominant paths.

At code level, DRY the structure, not every line. Types and data models converge. Three similar statements still beat a premature abstraction. Prefer explicit over clever.

**Concurrency corollary.** Before sharing state between actors, ask what happens if another actor modifies it concurrently. If the answer is not "nothing", isolate.

**Scaffold first.** If something helps every later phase, do it first. CI, linting, test infrastructure, and shared types are scaffold. Setup before features, tests before fixes. Keep commits small and single-purpose. Each increment lands a coherent abstraction or deepens one that exists. Do not spread a new capability across callers as special-case coordination.

Subtraction comes before scaffolding: the [subtract-before-you-add](#subtract-before-you-add) ordering.

## redesign-from-first-principles

When integrating a change, do not bolt it onto the existing design. Redesign as if the requirement had been there from the start.

- Read every affected file and understand the current design.
- Ask what you would build if you were writing this from scratch with the new requirement.
- Propagate the change through every reference: types, docs, examples, rationale.
- Think through the whole redesign, then deliver it incrementally.

This is the method for preserving option value when integrating into an existing design.

## attack-the-premise

When two or more fixes that share one premise have failed the same gate, suspect the premise, not the fixes. Each failure under a shared premise is evidence about the premise.

- **Write the premise down.** One sentence: what every failed fix assumed.
- **Take a census before the next fix.** Count the imbalance per actor. The census shows which actors hold it. Write it as a rerunnable script per [build-the-lever](#build-the-lever).
- **Read the skew.** If the same few actors hold most of the imbalance every run, something assigns them that role. Finding that assignment is the next why, per [fix-root-causes](#fix-root-causes).
- **Remove the asymmetry instead of compensating for it**, per [laziness-protocol](#laziness-protocol). Rotate the role, randomize the assignment, or move the role so no actor holds it every run. A return path, shared pool, batched hand-off, or periodic rebalance leaves the assignment in place and adds work every run.

Stop conditions: do not start the next fix before the premise is written and the census exists. If the census is even across actors, the premise is not the cause; keep the census as evidence and look elsewhere.

Distinct from [redesign-from-first-principles](#redesign-from-first-principles), which rebuilds a design around a new requirement. This questions a fact the current design assumes.

## subtract-before-you-add

Remove complexity first, then build.

Adding to a complex system compounds complexity. Removing first leaves less code, reveals the essential structure, and usually makes the next design obvious.

- Sequence removal before construction.
- Cut before you polish.
- Design for observed usage, not speculative edge cases.
- No speculative validators, parsers, or guards beyond what the spec demands.
- Simplify prompts: remove redundant instructions and excessive templates.
- When a reference has no novel content, delete it instead of leaving a stub.

Make simplification a continual investment. Leave the design simpler and more capable behind the same or a smaller surface than you found it.

## minimize-reader-load

Maintainability is the work a reader does to understand code. Two independent axes.

1. **Layers to trace.** How many indirections sit between the question and the answer.
2. **State to hold.** How much hidden or mutable context the reader keeps in their head.

LOC, cyclomatic complexity, and "clean architecture" are proxies. Reader load is the thing. A flat file with 50 globals can be as hard as a 6-layer adapter stack. This is the human analog of [guard-the-context-window](#guard-the-context-window).

- **Collapse layers** that cost more than they save: wrappers with one caller, adapters with no second implementation, speculative indirection. Inline them.
- **Make adjacent layers change the abstraction.** A layer repeating the same methods and arguments adds load without compression.
- **Demand interface compression.** A broad interface that hides little makes the reader learn both the surface and the implementation.
- **Shrink state scope:** pure functions over mutations, locals over fields, fields over module state, module state over globals. Derive instead of sync.
- **Name the invariant at the boundary**, not in every consumer, so the reader learns it once.
- Before adding a layer or a piece of state, ask whether it reduces reader load elsewhere by at least as much.

Test: can a new reader answer "where does X come from?" and "what can change X?" in under 30 seconds?

## outcome-oriented-execution

Optimize for the intended, verifiable end state instead of preserving smooth intermediate states. Keeping every intermediate step stable creates temporary compatibility code that becomes long-lived debt.

- Prioritize end-state integrity over transitional stability.
- Intermediate breakage is acceptable when it is planned, scoped, and reversible.
- Always run final verification before declaring done.
- Declare where temporary breakage is acceptable.
- Run this for planned rewrites and migrations with explicit phase boundaries, not for open-ended work.

## experience-first

When implementation convenience conflicts with user delight, choose delight.

- Every feature, control, and option has to be justified.
- Ship less, ship better. Three polished features beat ten rough ones.
- Prototype before committing. Design decisions are cheaper in throwaway code.
- Get the details right: transitions, alignment, spacing, feedback, error states.
- Tighten the core loop. Every feature serves the central workflow or gets out of the way.

The user is whoever consumes the work: the end user for a UI, the colleague who imports it for a library, and the next engineer who maintains it. Explain impact from their perspective. [foundational-thinking](#foundational-thinking) governs the sequence of work; this governs the target.

## exhaust-the-design-space

When the right answer is not obvious, build two or three competing prototypes or sketches, compare them side by side, and only then commit. "Design it twice" is this rule by another name. A second flavor of the first shape does not count.

Applies to novel interactions with no prior art, architectural choices with multiple viable approaches, and product decisions that depend on feel.

Does not apply to mechanical implementation where the pattern is established, bug fixes or refactors with a clear target state, or changes where constraints dictate a single viable approach.

## build-the-lever

When the work is not trivial, build the tool that does it instead of doing it by hand.

Two payoffs. Throughput: a codemod, generator, or script does the work the same way every time and reruns for free. Confidence: the tool is one artifact a reviewer reads and reruns, which turns "trust me" into "run this".

- Do the first unit by hand to learn the recipe, then build the tool and prove it by rerunning it on that unit.
- Codemod or script for edits, generator for repetitive files, a dump-to-database query for analysis, a rerunnable check for verification.
- A deterministic lever beats fan-out. If one pass covers every unit, run it yourself instead of fanning delegates out to hand-apply it.
- When you do fan out, write the lever as the recipe every delegate reads: the steps, the verification contract, and the do-not-touch fences in one artifact kept outside their write scope.
- Applying this principle produces a file. If you cited it and the diff has no codemod, script, generator, or written recipe, it was not applied.
- Commit the lever when the work outlives the session.

The bar is triviality, not repetition. A one-off still earns a lever when the lever is what makes the work checkable. Build the smallest script that does or proves the job, never a framework, per [laziness-protocol](#laziness-protocol).

Distinct from [encode-lessons-in-structure](#encode-lessons-in-structure), which makes a recurring instruction a durable guardrail. This is throughput and reviewability for the work in front of you.

## model-the-domain

Encode the real domain in a data structure instead of scattering it across conditionals. Scattered booleans, repeated shape assumptions, and branching across files are accidental complexity. A structure that matches the domain makes invalid states unrepresentable and deletes branches. Choosing it at write time is cheap; recovering it later reads as a refactor and gets deferred.

Reach for:

- A state machine instead of scattered booleans, phases, or lifecycle checks.
- A typed model instead of loose parameters or a repeated shape assumption.
- A map, registry, lookup table, or discriminated union instead of branching spread across files.
- A reducer or command/event model instead of ad hoc mutations.
- A module built around one body of domain knowledge instead of a sequence such as load, validate, transform, save. Execution order is not ownership.
- A small module boundary that gathers repeated behavior, ownership, or invariants.
- A queue, cache, index, graph, tree, or normalized collection where the access pattern calls for it.

Do not force an abstraction. Boring code stays when the shape is already clear, local, and unlikely to grow. Be skeptical of an abstraction that adds indirection without removing branches, duplicated rules, invalid states, or lifecycle risk.

The sign you skipped this: a new feature that grows an existing if/else chain by one more branch, or a second boolean that must stay in sync with the first. Temporal decomposition is another sign: phase-named modules repeat the same domain rules across steps.

## boundary-discipline

Place validation, type narrowing, and error handling at system boundaries. Trust internal code unconditionally. Business logic lives in pure functions. The shell stays thin and mechanical.

Scattered validation is noisy, redundant, and gives a false sense of safety. Keep logic out of framework wiring so it can be tested without the framework.

- **At boundaries** (CLI args, config files, external APIs, network protocols): validate, return errors, handle defensively.
- **Inside the system:** typed data, error propagation, no re-validation.
- **Across the boundary:** expose domain concepts, not the boundary's private representation. General-purpose mechanism inside, special-purpose policy at the edge.

Applications:

- Validate config at parse time, not inside business logic.
- Parse raw data into domain types at the boundary.
- Do not re-export transport, storage, framework, or wire types through the public surface.
- No redundant nil checks deep in call chains when the boundary already validated.
- Business logic in pure functions with no framework dependencies. Parse functions are pure transforms from raw bytes to typed state.

Tests: is this data crossing a system boundary right now? If not, the validation is redundant. Can this be a pure function the shell just calls? If yes, extract it.

## type-system-discipline

The type checker is a proof assistant. Use it to eliminate impossible states, mismatched primitives, and unhandled variants at compile time. A case the types let you ignore becomes a runtime failure the compiler could have stopped. Prefer defining errors and special cases out of existence over proliferating handlers.

Applies to any typed language. `pstack-typescript-best-practices` grounds it in syntax.

- **Make illegal states unrepresentable.** Model variants as sum types: discriminated unions in TypeScript, enums with payloads in Rust, Swift, and Kotlin, sealed classes in Scala, ADTs in Haskell and OCaml. Do not model state as a bag of optional fields where contradictory combinations compile. `{ completed: boolean; completedAt?: Date }` admits `completed: true; completedAt: undefined`, which is meaningless. Derive the boolean from a single source, or model the variants explicitly. If a bug forces the question "can this combination happen?", the type is too loose.
- **Types are constructions, not restrictions.** Build the type up from the values you want instead of carving them out of a looser type with checks. A non-empty list is a head plus a rest, not a list with a length check. A valid time range is a start plus a duration, not two timestamps you keep ordered. Choose the shape that cannot build the illegal value, then expose the interface callers need.
- **Brand semantic primitives.** `UserId` and `OrderId` are strings underneath and must not be interchangeable. Newtypes in Rust, opaque types in Swift, value classes in Kotlin, branded intersections in TypeScript. Validate once at creation, trust the type downstream.
- **External data is untyped until parsed.** RPC payloads, JSON, IPC messages, CLI args, config files, environment variables, database rows. Parse into the typed model at every boundary, per [boundary-discipline](#boundary-discipline).
- **Do not lie to the type system.** Casts, unsafe coercions, and assertion functions that bypass the compiler are latent runtime crashes. If the compiler cannot prove a fact, prove it, or accept the cast as a hazard.
- **Exhaustive matching is the compiler's job.** Adding a variant without handling it must fail compilation. Use the idiom the language provides.
- **Derive types from authoritative schemas.** When a protocol buffer, OpenAPI spec, GraphQL schema, database migration, or design-token file defines a shape, derive from it instead of hand-rolling a parallel type. See [encode-lessons-in-structure](#encode-lessons-in-structure).
- **Strengthen a type only where partiality appears.** A runtime assertion, null check, or "should never happen" throw marks a type that is too weak. Push that check up into the type, then stop. `sum` of an empty list is 0, so it takes the plain list; `head` of an empty list has no answer, so it demands the non-empty one.

Tests: can you write a comment explaining when a combination of fields is valid? Split the type. Do two arguments share a primitive type but mean different things? Brand them. Where did this `any`, this cast, this assertion come from? Trace it to the boundary.

## make-operations-idempotent

Design operations to converge on the correct state regardless of how many times they run or where they start.

Every state-mutating operation answers two questions: what happens if this runs twice, and what happens if the previous run crashed halfway? Commands, lifecycle operations, and loops run where crashes, restarts, and retries are normal. If partial state changes the next run's outcome, every restart is a debugging session.

- Convergent startup: scan for existing state, clean stale artifacts, adopt live sessions.
- Content-based cleanup: compare by content equivalence, not creation order.
- Self-healing locks: stale-lock detection by liveness, not by a fixed timeout alone.
- Idempotent scheduling: failed work respawns cleanly, fresh input regenerated each cycle.

If any answer is "it depends on what state was left behind", the operation needs a reconciliation step.

## migrate-callers-then-delete-legacy-apis

When a new API is the right design, migrate callers and remove the old API in the same wave instead of preserving a compatibility layer.

- Do not keep a legacy path only because internal callers still exist.
- Inventory callers, migrate them, delete the old API immediately.
- Treat temporary adapters as exceptional and time-boxed, not default architecture.
- Update tests to assert the new contract. Delete tests that only protect pre-refactor implementation details.

Applies when no external consumer depends on backward compatibility and the project can absorb a coordinated breaking change.

Keeping both paths creates dual-path complexity, slows cleanup, and makes the codebase feel append-only.

## separate-before-serializing-shared-state

When concurrent actors might share mutable state, first ask whether they need the same mutable object. If not, eliminate the sharing. When sharing is real, enforce serialization structurally: lockfiles, sequential phases, exclusive ownership. Instructions and conventions are not concurrency control.

1. **Identify shared mutable state.** Files both read and write, branches both push to, APIs both define and consume.
2. **Default to eliminating the shared write target.** Ask whether the actors need one canonical object or are publishing independent facts. Give each actor its own owned file, key, branch, or state directory and merge only at the read boundary. Two workers writing their own field into one `state.json` is still shared mutation. `indexer-state.json` plus `metrics-state.json` is not.
3. **Only when one shared write target is a real invariant, serialize access structurally:** lockfile, sequential phases, single-writer actor, or atomic compare-and-swap. Treat "we need a lock" as a smell to check, not the default answer.

## prove-it-works

Verify every task output by checking the real thing. Do not infer from proxies, self-reports, or "it compiles".

Unverified work has unknown correctness. Indirect verification (file mtimes, output freshness, agent self-reports, cached screenshots) feels cheaper than direct observation, and acting on a wrong inference costs far more than checking the source.

After completing any task, ask how you prove it actually works.

- Check process liveness directly, not through derived state.
- Read the actual value, not a cached or derived representation.
- When verification fails, suspect the observation method before the system.

For a code change: build it, run it and exercise the real feature path, check the full chain from input to output, and test integrations end to end.

For delegated work, inspect the artifact (diff, file contents, runtime behavior), not the delegate's summary.

**Script the check when you can.** The strongest proof is a deterministic script that reruns the same comparison, with its output kept as an artifact a reviewer can rerun. Keep the artifact visible. Commit it when the trail has to be auditable later, per `pstack-show-me-your-work`.

## fix-root-causes

When debugging, do not fix symptoms. Trace every problem to its root cause and fix it there. Symptom fixes accumulate: each workaround makes the system harder to reason about and leaves the real bug in place.

- Reproduce first.
- Ask why until you reach the root cause.
- Do not add guards. A nil check that silences a crash is a symptom fix.
- If a workaround needs a paragraph-long comment to justify it, fix the code, not the comment.
- Check for the pattern, not just the instance: grep for another occurrence and fix them together.
- When stuck, instrument. Do not guess.

**Restart bugs: suspect state before code.** When something "fails after restart", suspect stale persistent state first: config files, caches, lock files, serialized state. If clearing a state file restores behavior, make state validation the fix.

## sequence-verifiable-units

Order work as a sequence of small units, each ending in a state you can check, and do not advance until the current one is green.

A break caught at the unit that caused it is cheap to localize. A break caught after a batch is buried, and you already built further on a broken base. The same sequencing turns delivery from "trust me" into "watch it go red, then green".

**Execution.** In a sweep, migration, or run of similar edits, verify each change before starting the next. Each unit is a before/after bracket: known-good state, one change, run the check, proceed. Rebase onto clean trunk first so every check measures against the real baseline. When a lever does the edits the per-unit check is nearly free. Run it anyway.

**Delivery.** Stack commits and PRs in the order that proves the work. The canonical shape is the failing test first, then the fix on top. Others: a subtraction before the reshape, a baseline capture before the treatment, the scaffold before the feature. Each commit lands on its own and the sequence reads as an argument.

Complement to [prove-it-works](#prove-it-works), which keeps each check real, and [build-the-lever](#build-the-lever), which makes the per-unit check cheap.

## test-behavior-not-implementation

A test calls the code the way its users do and asserts the result they observe against a literal expected value. A test that asserts which calls the code made, or restates a constant the code contains, does neither.

The check: before keeping a test, ask whether it would still pass if every function it imports returned `undefined`. If yes, it observes no behavior and cannot fail for a defect. Rewrite the assertion or delete the test.

Five shapes that still pass when every imported function returns `undefined`:

- **Weak or no assertion.** No assertion, or only `toBeDefined`, `toBeTruthy`, `not.toThrow`, `toBeInstanceOf`, `toBeGreaterThan(0)`.
- **Mock or absence only.** Only "was called", "not called", `toBeUndefined`, `toEqual([])`, `toHaveLength(0)`, `not.toBe(wrongValue)`.
- **Self-referential.** The expected value comes from the code under test.
- **Constant pin.** The assertion restates a hand-maintained constant, config default, table row, or prompt string.
- **Fixture asserts fixture.** The assertion reads data the test built or a value computed in setup, and the subject never runs in the body.

The fix: call the subject in the test body with one concrete input and assert the literal output or the observable effect, as in `expect(slugify("Hello, World!")).toBe("hello-world")`. For an absence, assert the presence on the other input in the same test. For a constant, test the mechanism that reads it. For a mock, assert the payload it received or the state after the call. When no such assertion exists, delete the test.

Keep a relation across a table's rows (a key present in two tables, a parent that exists) and a compile-time check in a type-test file.

## guard-the-context-window

The context window is finite and non-renewable within a session. Every token should be worth its cost. Overflow degrades reasoning, creates compaction artifacts, and halts progress.

- **Isolate large payloads.** Route verbose output, screenshots, and long documents to subagents. The main context gets summaries, not raw data.
- **Do not read what you will not use.** Read selectively. If a file is not needed for the current task, skip it.
- **Keep frequently used content inline.** A template or reference used on every invocation belongs in the skill file, not in a separate file that costs a read each time.
- **Size phases and cap scope.** Limit files per phase, set turn budgets, account for the cost of each mechanism.

## never-block-on-the-human

The human supervises asynchronously. Agents stay unblocked. Make reasonable decisions, proceed, and let the human course-correct after the fact.

Every permission pause stalls the work and makes the human the bottleneck. Code changes are reversible and reviewable, so a wrong decision usually costs less than blocking.

- **Proceed, then present.** Do the work and show the result instead of asking whether to start.
- **Reserve questions for genuine ambiguity.** Ask only when intent cannot be inferred from context, or the action is irreversible.
- **Make it self-healing.** Notice a problem, log it, fix it in the next round.
- **Irreversible actions still require confirmation:** force-push, deleting data, sending external messages.
- **Product direction comes from the human. Execution does not block.**

## encode-lessons-in-structure

Encode recurring fixes in mechanisms (tools, code, metadata, automation) instead of more text. Every error, correction, and unexpected outcome is a signal: capture it, route it, close the loop.

Textual instructions are easy to miss. They require the reader to notice, remember, and comply. A lint rule, metadata flag, runtime check, or script enforces the rule without cooperation.

When you catch yourself writing the same instruction a second time:

1. Ask whether it can be a lint rule, metadata flag, runtime check, or script.
2. If yes, encode it and delete the instruction.
3. If no, because it needs judgment, make the instruction more prominent and add the failure mode as an example.

**Pick the strongest mechanism the situation allows:** an unrepresentable state that cannot compile, then a lint rule or banned API that fails CI, then a canonical helper, then a runtime check. Agents copy whatever the surrounding code already does, and a weaker guard becomes the next template.

**Feedback loop.** Capture every correction and decide whether it is a one-off or a pattern. Route it to the right layer: one-off to a note, recurring fix to a skill or lint rule, systemic issue to a principle. Then close the loop: apply it now or create a concrete task.

**Anti-patterns.** Acknowledging without recording, recording without routing, and fixing one instance while leaving the recurring pattern intact.

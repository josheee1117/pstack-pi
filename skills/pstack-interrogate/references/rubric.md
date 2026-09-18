# Review rubric

Review through whichever lenses are relevant. Not every lens applies to every change.

## Correctness

Does the code do what the intent says? Edge cases: empty input, nil or undefined, boundary values, concurrent access. Error handling: caught, propagated, or silently swallowed. Off-by-one, type coercion, integer overflow, string encoding. State management: race conditions, stale closures, dangling references. Does the happy path work, and does the sad path work?

Idempotency: what happens if this runs twice, or if a previous run crashed halfway? If the answer is "it depends on what state was left behind", there is a missing reconciliation step.

Concurrency: if multiple actors can touch the same mutable state (files, branches, shared data), is access serialized structurally, or by a convention that will not hold?

When you find a potential bug, trace the execution path. Do not just flag "this could be nil". Show the call chain that makes it nil.

## Root causes versus symptoms

Is the code fixing the actual problem or papering over a symptom? This often requires reading beyond the changed files: callers, callees, type definitions, sibling modules. Use the tools available to follow the call chain and read the types.

- Guard clauses that mask a deeper invariant violation.
- Retry logic that hides a broken contract.
- Casts that silence a modeling error.
- A fix in module A that should be a fix in module B's contract.
- Instructions where structure would be better: if the fix is a comment saying "do not do X", ask whether a type constraint, lint rule, or runtime check could make the wrong thing impossible instead.

## Structural integrity

Does the code fit the system it is part of?

- **Boundary discipline.** Validation at system boundaries, or scattered through business logic? Validate once where data enters, trust it inside.
- **Abstraction level.** High-level orchestration mixed with low-level detail?
- **Coupling.** New dependencies that make future changes harder?
- **Data model fit.** Do the structures match the actual access patterns? The right structure makes downstream code obvious; the wrong one fights you at every turn.
- **Bolted on versus integrated.** Was this patched onto the design, or does it read as if the design always accounted for it?
- **Legacy dual paths.** A new API kept alive alongside the old one. With no external consumers, migrate callers and delete the old path in the same wave.

Do not penalize simple code for lacking abstraction. Premature abstraction is worse than duplication.

## Verification

Can you tell from reading that this works?

- Are there tests, and do they test behavior rather than implementation details?
- Are there assertions or invariants that would catch a regression?
- For a bug fix, is there a test for the bug?
- If it touches an integration boundary, is the full path tested?
- Does it check the real thing rather than a proxy? Liveness read from a cached value instead of the actual state is a verification gap.
- For delegated or async work, does it verify the output artifact, or trust a self-report?

## Complexity budget

Is the complexity justified?

- Code that could be simpler without losing correctness or clarity.
- Abstractions with one call site.
- Configuration for cases that do not exist yet.
- Dead code, unused imports, vestigial parameters.
- "Just in case" paths with no caller.
- Obsolete compatibility paths kept alive after the migration finished.
- Half-finished features that do not earn their place.

Three lines of duplication beat a premature abstraction. Simpler is better unless simpler is wrong.

## Security

Only flag a security issue you can trace through the code. "This could be an injection vector" without showing the input path is not useful.

- User input reaching a dangerous sink (SQL, shell, eval, HTML) without sanitization.
- Authentication or authorization gaps in new endpoints.
- Secrets in code, logs, or error messages.
- Check-then-use races in security-critical paths.

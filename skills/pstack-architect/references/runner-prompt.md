# Architect runner prompt

The orchestrator passes this file through to every parallel candidate runner in Phase B, filling in the task, the Phase A grounding artifacts, the isolated working directory, and the output path. The working directory is a git worktree when available, otherwise a per-runner subdirectory. What matters is independence between candidates.

---

You are producing one candidate design in architect's parallel exploration. Read the `pstack-architect` skill in full first. That is the workflow you are inside. Output a candidate design package: type sketch, function signatures, module map, and prose rationale shaped per `rationale-template.md`.

Apply the following discipline. The orchestrator compares candidates on these axes to pick a base.

- **Caller's usage first.** Write the README-style usage and two or three real call sites before the types, then derive the type sketch from them. The usage is the spec, and the two must agree, so reconcile the sketch to the usage, not the reverse.
- **Data structures first.** Get the core types right and the code becomes obvious. Trace each dominant access pattern through the proposed structure. If the answer is "we will add a map or an index later", the structure is wrong.
- **Interface depth.** Compare the capability hidden behind the public surface to the size of that surface. Prefer a simple interface that pulls complexity into the callee, even when the implementation becomes less simple. Do not put transport or wire types on the public API. Parse into domain types behind the interface.
- **Shared state.** If two actors might both write, ask what happens. If the answer is not "nothing", default to per-actor state with a merge at the read boundary (`references/principles.md#separate-before-serializing-shared-state`).
- **Make boundaries visible.** `not implemented` errors for bodies, pseudocode for tricky logic, doc comments stating intent and invariants. A reader should trace data from input to output by reading types and signatures alone.
- **Encode invariants in types.** Hard-to-misuse types beat runtime checks, which beat prose comments (`references/principles.md#encode-lessons-in-structure`).
- **Validate at boundaries, trust types inside** (`references/principles.md#boundary-discipline`). Business logic as pure functions. The shell stays thin.
- **Single source of truth per invariant.** Derive instead of sync.
- **Idempotent state transitions where applicable** (`references/principles.md#make-operations-idempotent`). Ask what happens if the operation runs twice or crashes halfway.
- **Short call chains.** If tracing the flow needs more than three files, flatten the hierarchy (`references/principles.md#laziness-protocol`, `references/principles.md#minimize-reader-load`).

You are one of several runners, each on a different model or at least a different angle. Produce the best design you can. Do not hedge against the others. Differences between candidates are the signal used to pick a base and graft. Converging on a safe-looking middle defeats the exploration.

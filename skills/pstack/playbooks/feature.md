# Feature

**You own the design. Plan, review, verify.**

1. Run `pstack-how` over the affected subsystem.
2. Run `pstack-architect` for parallel design exploration when the shape is not obvious. Skipping stays in the checklist as `architect skipped: <reason>`. Do not fold a design decision silently into implementation.
3. Write the throughput checkpoint as four checklist items. A dimension that genuinely does not apply (a single file, no fan-out) keeps its item with `n/a: <reason>` rather than being dropped.
   - **Blocking first steps.** Gates run before fan-out.
   - **Independent workstreams.** Disjoint files, services, or layers can run in parallel. Shared writes serialize.
   - **Shared mutable state.** Default to splitting the target (`references/principles.md#separate-before-serializing-shared-state`). Serialize only for a real invariant.
   - **Smallest safe decomposition.** If one worker is best, name why.
4. **Implement.** Delegate the code to a fresh-context writer when that buys independence, with a specific scope: file paths, the named data shape and its organizing structure (`references/principles.md#model-the-domain`, a state machine over scattered booleans, a table or registry over branching, a typed model over repeated shape assumptions) chosen before the writer touches logic, plus success criteria. Review the diff yourself. When the implementation admits multiple valid shapes (error handling, an abstraction layer, test structure), route through `pstack-arena` instead so the alternatives surface and a cross-judge guards the pick. Delegation with review separation is the default when a subagent mechanism exists; when it does not, say so and own the diff directly. Never reply "standing by" while waiting on a nested agent. Comments follow `pstack-unslop`. Keep edits surgical, re-ground against the source for upstream-derived files. Port a shared-primitive improvement to every consumer and verify each. Commit liberally.
5. **Verify on the matching surface.** "Inconclusive" or a wrong surface is not a pass. Flag it.
6. **Rebase into small, ordered commits.** Stack follow-ups. Use `references/principles.md#sequence-verifiable-units`: build, verify, and commit each small unit before the next.
7. If the design is contested, run `pstack-interrogate` before shipping.
8. Finish per `opening-a-pr.md` when the user authorized a PR.

Code-coupled work (one feature, one migration) goes to a single owner with the checkpoint inline. Fan out at the parent level only for slices that produce independent artifacts: audits, cross-subsystem investigations, competing experiments. Rewrite the checkpoint at phase boundaries. Spawn a fresh owner rather than chaining resumes.

**Reply.** What you built, what you chose and why, the throughput checkpoint, open decisions. Tables for design alternatives.

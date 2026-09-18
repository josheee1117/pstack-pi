# Visual parity

**You own pixel-exact equivalence. The baseline is the spec. You do not touch it.** Equivalence is verified by image diff, not by eye.

1. **Establish the baseline first**, before any migration: a visual regression harness that screenshots the current component across its states, plus the target when matching two implementations. No baseline, no parity claim. This is a blocking prerequisite, not a follow-up.
2. **State and hold the anti-shortcut clauses.** No harness modifications, no baseline tampering, no component restructuring to make a diff pass. If the baseline looks wrong, stop and ask. Do not edit it.
3. **Migrate one component at a time.** Parallelize across worktrees with one owner per component ([separate-before-serializing-shared-state](../references/principles.md#separate-before-serializing-shared-state)). Shared primitives migrate first as a blocking phase.
4. **Verify each component against its baseline by image diff** on the matching surface. A nonzero diff is a fail. Investigate the pixel delta. Loop per component until the diff is zero, using the session's wake mechanism if one exists.
5. Finish per [opening-a-pr](opening-a-pr.md) per component or per safe batch, when the user authorized a PR.

**Reply.** Components migrated, the diff result for each, the baseline harness location, what is left.

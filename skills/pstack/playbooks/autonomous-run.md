# Autonomous run

**You own the exit condition. Define done, then drive to it without stopping.**

1. **State the exit condition as a checkable predicate before the first iteration:** tests green, repro fixed, all N PRs merged, pixel diff zero. Write it where it survives compaction, not only in your head.
2. **Pick the wake mechanism, and be honest when there is none.**
   - An event to watch (CI finishing, a merge, a ref advancing) gets a watcher that re-triggers you on the event, with a long time-based heartbeat as a fallback.
   - No event gets a fixed-interval heartbeat sized to when the result is worth re-checking.
   - **A schedule requires a real scheduler.** A status field on another agent, or a message arriving from another session, is not a timer. Where the environment has no scheduling mechanism, do not promise an interval. Say so, then either poll on a bounded budget with a stated maximum, or stop and report what is pending. Never describe a future tick that nothing will fire.
3. **Each iteration makes the smallest change the evidence justifies**, verifies it against the predicate, commits if it advanced, and discards changes that did not help. Belt-and-suspenders that "might help" gets reverted, not left to ride. Sequence the work via [sequence-verifiable-units](../references/principles.md#sequence-verifiable-units): verify each unit before the next instead of batching checks at the end.
4. **Mid-run discoveries are yours.** Address broken skills, related bugs, flaky verifiers, review noise, tooling failures, orphaned follow-ups, and fixable drift. Put an out-of-band fix in its own commit or PR. Do not park reversible work for the human. Surface only irreversible actions, a genuine product or preference call no experiment can settle, or a real dead end. Keep the predicate as the main drive and return to it after each side fix.
5. **Checkpoint every iteration** via `pstack-show-me-your-work`: a row for what changed and whether the predicate moved.
6. **Stop when the predicate is met.** A plateau is not a stop. Pivot the approach and push past it. Surface a genuine dead end rather than spinning, and never relax the predicate to declare victory.

**Reply.** The exit condition, iterations run, what landed, what was discarded, the final predicate state.

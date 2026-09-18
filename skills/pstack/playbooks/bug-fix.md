# Bug fix

**You own this task. Plan, review, verify.**

Be scientific. Every shipped line traces to runtime evidence. Belt-and-suspenders that "might help" is a hypothesis, not a fix, and it does not ship. When evidence refutes a hypothesis, revert what it motivated. The smallest change the evidence justifies ships, nothing more.

1. **Reproduce it yourself on the matching surface.** Do not hand the repro to the user. Drive the instrumented runtime yourself. A protocol that says "ask the user to try this" does not override this step. Ask the user only with a stated, specific reason the surface cannot reach the target, and only after driving it as far as it goes. If it will not reproduce directly, force it: synthesize the trigger, tighten the conditions, instrument until it fires.
2. **Binary-search the cause.** Form candidate hypotheses, then rule them out until one survives. Seed them with `pstack-how` over the affected subsystem and `pstack-why` for regression history. Each pass, take the split that cuts the most remaining problem space, get runtime evidence, eliminate. When program state is unclear, add instrumentation or logging and read it as the code runs. Do not guess. Confirm the surviving *mechanism* with runtime evidence before planning the fix. A long or stubborn hunt runs under the session's wake mechanism (see `autonomous-run.md`) if one is available.
3. **Plan the fix.** If it crosses a function boundary, run `pstack-architect` first. Then implement. Delegate the implementation to a fresh-context writer when that buys independence or parallelism, or write it yourself. Either way the scope is specific (files, the data shape, success criteria) and you review the diff.
4. **Verify on the same surface.** The original repro now passes. "Inconclusive" or a wrong surface is not a pass. Flag it. Unit tests show branch behavior, not bug absence.
5. **Stage the commits so the failing repro lands before the fix** in the history. See `pstack-tdd` for the failing-test-first cadence when the bug has a cheap local test path. Skip it when the test would be expensive, integration-heavy, or unclear. This is `references/principles.md#sequence-verifiable-units`, the failing test first and the fix on top.
6. **Finish per `opening-a-pr.md`** when the user authorized a PR. Otherwise stop at a verified fix on your branch, committed and reported.

Investigation fans `pstack-how` and `pstack-why` out in parallel when both are needed and a fresh-context reader is available.

**Reply.** What was broken, the root cause, the fix, how you verified it. Paste the failing-then-passing repro output verbatim.

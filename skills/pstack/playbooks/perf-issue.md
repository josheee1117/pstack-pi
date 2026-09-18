# Perf issue

**You own the measurement story. Plan, review, verify the numbers.** Tie every fix to a measurement. Do not read source instead of measuring.

1. **Capture a baseline trace** with the profiler that fits the runtime (CPU profile, frame trace, query log, timing harness).
2. **Ground the hypotheses** with `pstack-how`. Do not claim a perf ceiling without running it first.

   Most fixes come from eight strategy families. Use them as hypothesis generators, not a checklist. A family earns an attempt only when the trace shows the signal it names.

   - **Elimination.** Before optimizing the hot path, ask whether it needs to exist: a computation nobody consumes, a feature gate always off for this user, a sync that redundantly mirrors state, a legacy path kept "just in case". The trace shows what is slow, never that it is deletable, so this family needs the `pstack-how` pass, not the profiler.
   - **Divide and conquer.** The dominant cost scales with input size. Split the work so each piece touches less, or so independent pieces run in parallel.
   - **Caching.** The same computation or fetch repeats on identical inputs. Name what invalidates the cache before claiming the win.
   - **Indirection.** The hot path does expensive work a cheaper intermediate could absorb: an index instead of a scan, a queue that moves work off the interactive thread, a handle that lets a cheaper implementation swap in. Add the hop only when it removes more from the critical path than it adds.
   - **Batching.** Many small operations each pay a fixed overhead (RPC, query, syscall, draw call). Coalesce them.
   - **Redundancy.** The wait hangs on one slow instance or attempt. Duplicate the work (replicas, hedged requests, speculative execution) and take the fastest result. The trace has to show the wait dominates and the system has headroom.
   - **Lazy evaluation.** Cost lands on results never used or not needed yet. Defer the work until first use.
   - **Scheduling.** The work must happen, but not during the interactive moment. Move it to idle callbacks, a background warmup, a precompute before the user arrives, or cleanup after the frame commits. The win is perceived latency, so measure the interactive path, not total work done.

3. **Plan the fix from the trace.** If it crosses a function boundary, run `pstack-architect` first. Then implement, delegating to a fresh-context writer if that helps, and review the diff. Read [`../references/execution.md`](../references/execution.md) before delegating. Capture a post-fix trace. Apply [sequence-verifiable-units](../references/principles.md#sequence-verifiable-units): verify each attempt before trying the next.
4. **Parse and compare the artifacts** (dump to a database, diff the numbers). "Inconclusive" or a wrong surface is not a pass. Flag it.
5. **Cite the measurement** in the PR body.
6. **Finish per [opening-a-pr](opening-a-pr.md)** when the user authorized a PR.

For sustained improvement against a metric rather than a one-off fix, use [hillclimb](hillclimb.md).

**Reply.** Baseline number, post-fix number, delta, artifact path.

# Runtime forensics

**You own the diagnosis. Instrument the live process. Do not theorize from source.** The deliverable is a cited diagnosis, not a fix.

1. **Capture the live signal** on the matching surface: a CPU profile for a spinning process, a heap snapshot for a leak, a protocol trace for a visual glitch. A real artifact, not a guess.
2. **Reduce the artifact to the smoking gun:** the function on the hot path, the retainer chain from the leaked object to a GC root, the loop firing without input. Parse large artifacts in a subagent or a script ([guard-the-context-window](../references/principles.md#guard-the-context-window)) and keep the reduced finding in the main thread.
3. **Prove the mechanism before believing it.** Inject instrumentation into the running process, or hot-patch the live code without reloading, to confirm the hypothesis cheaply.
4. **Map the finding back to source:** file, symbol, the line that allocates or schedules.
5. The throughput checkpoint stays one line: `throughput checkpoint: n/a, read-only forensics`.

**Reply.** The signal captured, the reduced finding, how you proved the mechanism, the source location, artifact paths. No fix unless asked. Hand back to Bug fix or Perf issue once the cause is known.

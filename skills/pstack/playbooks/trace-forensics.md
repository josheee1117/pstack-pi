# Trace forensics

**You own the diagnosis from the artifact. Load it, shape it, narrow to the cause, attribute to source.**

Distinct from Runtime forensics, which instruments a live process. Here the capture already exists. The artifact is a fixed dataset: read it, do not re-run it. Keep the tooling generic so the playbook stays portable: a parser for a CPU profile or a compressed trace, a text editor for a spindump, the heap tooling for a heap snapshot.

1. **Identify the format and load it with the right tool.** Parse large artifacts in a subagent or a script (`references/principles.md#guard-the-context-window`) and keep the reduced finding in the main thread.
2. **Transform the raw artifact into a queryable shape.** Dump the trace or heap snapshot into a database, one row per sample, frame, or node. Reach the queryable shape before you read.
3. **Narrow to the cause.** Query for the frames that hold the most time and walk the call tree to the hot path. For a leak, follow the retainer chain from the leaked object to a GC root. For a spindump, find the thread stuck on-CPU or blocked and its wait reason.
4. **Attribute to source.** Map the hot frame to file, symbol, and line through the artifact's own symbols. A frame with no source mapping is not yet a diagnosis. Resolve the symbols, or say plainly that the artifact does not carry them.
5. **Confirm against a paired capture when you have one.** Diff a before and after artifact. Without one, mark the finding as the strongest hypothesis the artifact supports, not a confirmed cause.
6. Hand back a cited diagnosis, no fix unless asked. Route to Bug fix or Perf issue once the cause is known. The throughput checkpoint stays one line: `throughput checkpoint: n/a, read-only forensics`.

**Reply.** The artifact and format, the reduced finding, the source location, the artifact paths, and whether a paired capture confirmed it.

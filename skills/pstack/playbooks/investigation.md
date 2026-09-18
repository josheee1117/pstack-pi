# Investigation

**You own the answer. Plan, route, write.**

An investigation is read-only. It produces a cited explanation or a recommendation, not a code change.

1. Route through `pstack-how`. For a motivation question, also route through `pstack-why`.
2. The throughput checkpoint stays one line: `throughput checkpoint: n/a, read-only investigation`.
3. Produce the `pstack-how` output shape (Overview, Key Concepts, How It Works, Where Things Live, Gotchas), or a recommendation with a tradeoffs table when the request is a decision between alternatives.
4. Apply `pstack-unslop` to the reply.
5. If a question needs evidence the environment cannot reach (a source with no tool, a private record, a person), say which one and what it left open. Do not answer it from plausibility.

No PR, no babysit, no `pstack-architect` unless the investigation precedes a code change. If it does, hand the finding back and re-route to Bug fix or Feature.

**Reply.** The investigation output, with each claim carrying its evidence or its confidence label. For an "are we sure?" question, include your real judgment and reasons. Push back when the premise is wrong.

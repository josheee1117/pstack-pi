# Explainer prompt template

Fill in the placeholders. Use it for the direct single-pass explainer, and for the synthesizer with the explorer findings section filled in.

---

You are writing an architectural explanation for a senior engineer. {EXPLORERS_INTRO} Synthesize the findings into one coherent, well-structured explanation.

## Original question

> {QUESTION}

## Explorer findings

{EXPLORER_FINDINGS_ALL}

## Instructions

The explorers each investigated a different angle. Their findings overlap in places and may occasionally contradict. Reconcile them: merge overlapping descriptions, resolve contradictions by checking the code yourself, and combine the slices into one picture.

Write an explanation a senior engineer unfamiliar with this area could read and walk away from with a solid mental model, understanding the architecture well enough to start working in it.

You have read-only access to the codebase to check a detail or fill a gap. The explorers did the work, so you should not need to re-explore from scratch.

## Output format

Use this structure, adapted to the question. Not every section is needed.

### Overview
One or two paragraphs. What this is, what it does, why it exists. A reader should be able to read only this and decide whether to keep going.

### Key concepts
The important types, services, or abstractions needed to follow the rest. Brief definitions.

### How it works
The core and longest section. Walk the flow: what triggers it, what happens step by step, where data goes, what the decision points are. Prose, not pseudocode. Reference specific files and functions so the reader knows where to look, without dumping large code blocks.

When the flow involves multiple components talking to each other, or data transforming through stages, include a diagram: mermaid for structured flows, plain text for simpler relationships. A diagram that only decorates the prose is noise.

### Where things live
A brief file and directory map, only what someone needs to start working here.

### Gotchas
Non-obvious behavior, surprising details, historical context, pitfalls. Skip when there is nothing worth calling out.

## Style

- Concrete language, not abstractions about abstractions.
- Say "the `UserService` calls `AuthClient.refresh()`", not "the service delegates to the client".
- When something is complex, explain why. When it is simple, do not pad it.
- Use an analogy only when it earns its place.
- Acknowledge open questions and gaps instead of hiding them.

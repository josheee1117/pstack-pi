# Rationale template

The prose that ships alongside the type sketch. One page. Sentence-case headings, no boilerplate. Replace the italic notes with real content.

## Problem

*One paragraph. What we are trying to do, and what about the existing system or the constraints makes the shape non-obvious. Name the constraints Phase A surfaced: existing types to interoperate with, callers that cannot break, invariants that crossed our boundary.*

## Usage (caller's view)

*Write this first, before the type sketch. The README or quickstart the consumer reads, plus two or three realistic call sites. What they import, what they call, what comes back. The sketch in Shape is derived from this. The two must agree; when they diverge, reconcile the sketch to the usage. The caller's experience is the spec.*

## Shape

*The recommended architecture. Data structures first, then how data flows through the signatures. Name the load-bearing decisions. State which invariants are encoded in types, where validation lives, and what the system deliberately does not do. Judge interface depth explicitly: what complexity the public surface hides, what stays exposed, and why the interface is no larger than needed. Cite the principle behind each decision, without restating it.*

## Synthesis decision

*Filled in by arena. Which candidate became the base and why, what was adapted from each of the others, and what was rejected and why.*

## Tradeoffs accepted

*One bullet per tradeoff: "we accept X in exchange for Y". Name anything a future reader might mistake for an oversight, including things that look like premature optimization or premature simplification.*

## Alternatives considered

*Required. At least one concrete alternative shape with one line on why it lost. Judge each on interface depth, not implementation simplicity alone: name the complexity it exposes to callers and the complexity it hides. Two or three alternatives when the design space had real contenders. One is fine when constraints forced the answer, phrased as "this was the only viable shape because...". Avoid listing flavors of the same shape.*

## Open questions and risks

*Things the human needs to weigh in on, and risks worth flagging before implementation. Phrase them as questions rather than assertions, so the human's answer is the resolution rather than a comment.*

## Next implementation step

*One sentence. What you would start writing immediately after synthesis, or after the Phase C sign-off when a checkpoint was opted into.*

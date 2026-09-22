---
name: pstack-architect
disable-model-invocation: true
description: "先设计再实现：明确类型、函数签名与模块结构，并在实现过程中持续校准。适用于架构设计、要求先出方案，或跨函数边界且贸然编码容易固化错误结构的改动。"
---

# Architect

Design before implementing. Sketch types, function signatures, class shapes, and module boundaries with `not implemented` bodies and pseudocode. Synthesize across more than one design perspective, then fill in code against the chosen sketch. If implementation proves the sketch wrong, throw it out and redesign.

Phase B delegates and runs `pstack-arena`. Read [`../pstack/references/execution.md`](../pstack/references/execution.md) before that phase: it owns the backend choice and the independence rules.

## Start

Open a checklist with one item per phase before starting: Ground, Sketch, Agree, Implement, Scrap.

## Phase A. Ground the problem

Build a real mental model of every system the new code touches. Run `pstack-how` over the relevant subsystems.

Naming a file is not grounding. Produce the traced model `pstack-how` prescribes. If the design redefines ownership or layering, also run `pstack-why` on the existing shape so the rationale becomes a constraint instead of a guess.

Skip Phase A only when the work is genuinely greenfield with no surrounding system to integrate with.

## Phase B. Sketch

Run `pstack-arena` with the design task and the Phase A grounding artifacts, passing [`references/runner-prompt.md`](references/runner-prompt.md) as each runner's prompt. Each candidate produces a design package shaped per [`references/rationale-template.md`](references/rationale-template.md).

Use the operator's configured runner set when one exists. When none is configured, pick the strongest independent reasoners this environment offers; one model for every runner is fine, because independence comes from a fresh context and a separate working copy, not from the model name. Never invent model names. **If the environment offers no way to start a fresh context at all, do not produce the sketches yourself.** One context sketching variants is one candidate, not a design space. Name the gap and follow [When a backend is missing](../pstack/references/execution.md#when-a-backend-is-missing): stop and let the operator pick a verified backend or change the requirement.

**Design it twice.** Require at least two structurally distinct candidates before synthesis, even when the first looks sufficient. This is [exhaust-the-design-space](../pstack/references/principles.md#exhaust-the-design-space) made concrete. Whole-shape alternatives, not point fixes inside one shape.

Screen every candidate against [`references/design-red-flags.md`](references/design-red-flags.md) before synthesis. Reject or revise shallow modules, information leakage, temporal decomposition, and pass-through methods.

Compare viable candidates on interface depth. Prefer the design that hides more complexity behind a smaller, simpler public surface. A rich interface can keep call chains short by concentrating capability instead of scattering it across layers.

Arena returns one synthesized design package. The synthesis decision populates the rationale's "Synthesis decision" section.

## Phase C. Agree (opt-in)

Default: proceed directly to implementation with the synthesized design. No human checkpoint.

Opt in to a checkpoint when the invoker explicitly asks ("stop and show me before implementing"). Then surface the synthesized design and pause for sign-off.

The synthesis can ship as its own commit either way, as the scaffold-first mode of [foundational-thinking](../pstack/references/principles.md#foundational-thinking). Planned and scoped breakage during fill-in is fine, per [outcome-oriented-execution](../pstack/references/principles.md#outcome-oriented-execution). For adversarial pressure before implementing, run `pstack-interrogate` on the synthesized sketch.

If the human pushes back on the shape, treat that as Phase A evidence. Re-ground and re-run Phase B before writing more code.

## Phase D. Implement against the sketch

Replace `not implemented` bodies with code and pseudocode with logic. The synthesized sketch is the contract.

A deviation from the sketch is signal worth surfacing, not friction to absorb silently. If a function needs a parameter the sketch did not anticipate, ask whether the sketch was wrong, the requirement was missed, or the implementation is overreaching.

## Phase E. Scrap when the architecture is wrong

If implementation keeps producing friction the sketch cannot absorb, throw the sketch out. Do not bolt fixes onto a wrong design ([redesign-from-first-principles](../pstack/references/principles.md#redesign-from-first-principles), [fix-root-causes](../pstack/references/principles.md#fix-root-causes)).

The signal is a **pattern**, not single instances:

- The same shape of workaround appearing repeatedly across unrelated code.
- Multiple unrelated edge cases all needing special-case branches.
- Types needing escape hatches (`any`, casts, optional fields always set in practice) to compile.
- The "we need a lock" reflex when the sketch said the state was not shared.
- Callers having to know the abstraction's internal rules to use it.
- Two or more Phase D deviations of the same shape across the implementation.

Use judgment. A few edge cases do not condemn an architecture, and some problems are legitimately complex. Complexity in the data is not complexity in the design.

When you scrap: re-run `pstack-how` over what has been built, redesign as if the new constraints had been day-one assumptions, subtract before adding so the new sketch is smaller than the old one before it grows, then return to Phase B and re-run arena.

## Outputs

The caller's usage is written first and the type sketch derived from it. One file with new types and signatures for a small change. A module map plus type definitions for larger work. The rationale ships alongside per [`references/rationale-template.md`](references/rationale-template.md), including the usage sketch and the synthesis decision.

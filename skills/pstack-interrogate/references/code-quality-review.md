# Code quality lens

Every reviewer applies this lens in addition to the rubric. It is a strict standard for implementation quality, maintainability, and codebase health.

Above all, be ambitious about structure. Do not stop at local cleanup. Look for restructurings that preserve behavior while making the implementation dramatically simpler, smaller, and more direct.

## Baseline

> Perform a deep code quality audit of the changes.
> Rethink how to structure the implementation to meaningfully improve quality without changing behavior.
> Improve abstractions and modularity, reduce spaghetti, improve legibility.
> Be ambitious. If there is a clear path to improving the implementation that involves restructuring, propose it.
> Be rigorous. Measure twice, cut once.

## Dimensions

Apply the ones that are relevant.

0. **Be ambitious about structural simplification.** Do not stop at "this could be a bit cleaner". Look for reframings that make whole branches, helpers, modes, conditionals, or layers disappear. Assume such a move is often available: it uses the existing architecture better and makes the change dramatically simpler. If you can delete complexity instead of rearranging it, push for that.

1. **Do not let a change push a file from under 1000 lines to over 1000 without a strong reason.** Treat it as a strong smell. Prefer extracting helpers or modules first. Waive only for a compelling structural reason where the resulting file stays clearly organized.

2. **Do not allow spaghetti growth in existing code.** New ad-hoc conditionals, scattered special cases, and one-off branches inserted into unrelated flows are a design problem, not a style nit. Push the logic into a dedicated helper, state machine, or module instead of tangling an existing path.

3. **Bias toward cleaning the design, not just accepting working code.** If behavior can stay the same while the structure gets meaningfully cleaner, push for the cleaner version. Prefer simplifications that remove moving pieces over refactors that spread the same complexity around.

4. **Prefer direct, boring, maintainable code over hacky or magical code.** Be skeptical of generic mechanisms that hide a simple data-shape assumption. Flag thin abstractions, identity wrappers, and pass-through helpers that add indirection without buying clarity.

5. **Push on type and boundary cleanliness when it affects maintainability.** Question unnecessary optionality, `unknown`, `any`, and cast-heavy code where a clearer boundary could exist. Prefer explicit typed models over loosely shaped objects. If a branch leans on a silent fallback to paper over an unclear invariant, ask whether the boundary should be explicit.

6. **Keep logic in the canonical layer and reuse existing helpers.** Call out feature logic leaking into shared paths or implementation details leaking through APIs. Prefer existing canonical utilities over bespoke one-offs. Push code toward the right package or module instead of normalizing drift.

7. **Treat unnecessary sequential orchestration and non-atomic updates as design smells when a cleaner structure is obvious.** If independent work is serialized for no reason, ask whether it should run in parallel. If related updates can leave state half-applied, push for a more atomic structure. Do not chase micro-optimizations, but do flag avoidable orchestration complexity.

## Output expectations

Prioritize structural quality regressions and missed simplifications first, then spaghetti and branching complexity, then boundary, type, and file-size concerns, then smaller legibility issues. Do not flood the review with low-value nits when larger structural issues exist. A few high-conviction comments beat a long list of cosmetic notes.

## Approval bar

Do not approve merely because behavior looks correct. Treat these as presumptive blockers unless the author can justify them: incidental complexity a structural move would delete; a file pushed past 1000 lines; ad-hoc branching tangled into an existing flow; feature checks scattered across shared code; an unnecessary abstraction, wrapper, or cast-heavy contract; a duplicated existing helper; logic placed in the wrong layer when a clear canonical home exists.

## Tone

Be direct, serious, and demanding about quality. Do not be rude, and do not soften a major maintainability issue into a mild suggestion. If the change makes the codebase messier, say so. If it missed an obvious dramatic simplification, say that too.

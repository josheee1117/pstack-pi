# Prototype

**You own the design decision, not the code. The prototype is a throwaway instrument. The real build follows Feature.**

The one playbook where the laziness protocol's "smallest change" and the verification bar invert. Speed over polish. Code quality does not matter. No planning. The rigor is in picking the right design cheaply. Propose variations the user did not ask for, throw an approach away, try another.

1. **Scope the decision the prototype exists to make:** which layout, which interaction, which density, or, for an empirical fork, which behavior, timing, or approach. No decision means no prototype. Route to Feature.
2. **Gather references when the design space is open.** Search for prior art, summarize a moodboard of themes, palettes, and layouts, let the user pick directions before building. Skip when the direction is set.
3. **Build throwaway in an isolated scratch directory**, separate from production source. For a visual decision, plain HTML, CSS, and JS, or the lightest stack that renders the idea, with a dev server and hot reload. For a behavioral or timing decision, the smallest script that exercises the question. No production framework, no tests, no abstractions.
4. **When comparing alternatives, build them behind one switcher** (buttons or a keypress), each variant labeled. This is [exhaust-the-design-space](../references/principles.md#exhaust-the-design-space) made cheap.
5. **Verify on the matching surface.** For a visual decision, screenshot each variant and drive the interaction. For a behavioral or timing decision, observe the thing you are deciding by logging the timing, printing the output, or watching the render. The observation is the test here, not an assertion.
6. **Present alternatives, tradeoffs, and a recommendation.** The output is the decision plus the throwaway artifact, not shippable code. Hand the chosen direction to Feature, or to `pstack-architect` for the shape, for the real build.

**Reply.** The variants explored, the evidence (screenshots for a visual decision, the observed output or timing for a behavioral one), tradeoffs, your recommendation, and the scratch path. Say plainly that the prototype is throwaway.

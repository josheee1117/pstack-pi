---
name: pstack-setup
description: "Configure which model or reviewer each pstack role uses, and at what reasoning budget, then record the choices where future sessions read them. Use for /skill:pstack-setup, 'configure pstack', 'pstack budget', 'which models does pstack use', or after installing the package."
---

# Setup pstack

pstack ships **no model defaults**. The operator or the environment decides, and this skill records that decision so later sessions follow it instead of guessing.

## Steps

### 1. Detect what this environment actually offers

Enumerate the models and subagent mechanisms available in this session. That is the only dependable source. If the harness exposes a model list, use it for completeness. If you cannot detect anything, ask the user to paste what they have. **Never write a model name you have not confirmed exists.** Never invent a role-to-model mapping and present it as a default.

### 2. Load current state

If the choices were already recorded in the project's `AGENTS.md` capability map, or in a `pstack-roles` file the project keeps, read them and treat them as the current answer. Otherwise start from the role list below with no values filled in.

### 3. Ask, in one round

Prefer a short list of options over free text. Ask for:

**(a) A reasoning budget.** Exactly one of:

- `unlimited` — use each model's maximum reasoning effort.
- `large` — the highest available effort at or below the model's top tier.
- `medium` — one step down from top.
- `small` — the cheapest tier that still completes the task.

Name the current setting when one exists.

**(b) Role overrides.** Show every role with its current value, and ask which to change. Offer the models you actually detected, plus `inherit` meaning "run this role on the parent session's model". For a panel role the value is a list, and one worker runs per entry, so the list length sets the fan-out count.

The roles:

- `feature`, `refactoring`, `bug-fix`, `perf-issue`, `hillclimb` writers
- `judgment and prose`
- `hardest tasks`
- `how explorer`, `how explainer`
- `why investigators`, `why synthesizer`
- `reflect tooling`, `reflect judgment or divergent`, `reflect synthesizer`
- `arena runners`, `arena cross-judge pool`
- `swarm workers`
- `architect runners`
- `interrogate reviewers`

**(c) Where to record it.** Default to the project's `AGENTS.md` capability map, so it travels with the project and is visible to every contributor. A personal file under the user's agent config directory is the alternative, and it affects only that user. Do not write to a global harness config file without explicit authorization.

### 4. Validate

Every model you write must be one you detected in step 1, or `inherit`. If a chosen model is unavailable, stop and ask again rather than writing it.

### 5. Record it

Append a short section to the project's `AGENTS.md` (or the personal file) in this shape, and keep it small:

```markdown
## pstack roles

Budget: <label>.
Delete a line to fall back to the environment default.

- feature, refactoring, bug-fix, perf-issue, hillclimb: <model or inherit>
- judgment and prose: <model or inherit>
- hardest tasks: <model or inherit>
- how explorer: <model or inherit>
- how explainer: <model or inherit>
- why investigators: <model or inherit>
- why synthesizer: <model or inherit>
- reflect tooling: <model or inherit>
- reflect judgment, divergent, synthesizer: <model or inherit>
- arena runners: <model>, <model>, <model>
- arena cross-judge pool: <model>, <model>
- swarm workers: <model or inherit>
- architect runners: <model>, <model>
- interrogate reviewers: <model>, <model>, <model>
```

Write the whole block on every run so re-runs are idempotent.

### 6. Confirm, and account for gaps

Tell the user what was written and that the choices apply to new sessions. Then account for gaps **in the direction the execution policy set**: read [`../pstack/references/execution.md`](../pstack/references/execution.md) and report which pstack capabilities this environment cannot satisfy, and for each one which of the two routes applies. A short bounded investigation or a non-delegated task still runs directly. A step whose product is an independent verdict, an independent owner, or a parallel writer does not: it needs a fresh context, and if none can be started the step stops for the operator to pick a verified backend or change the requirement. One model is not one context, so a single-model environment loses multi-model diversity but not independence. Do not paper over any of it.

### 7. Offer a verification skill

Check whether the project has a way to drive the real app for proof: a `verify-*` skill, or an existing harness. If it does not, offer once: "want a project-local verification skill, so agents can drive the app the way a user does and prove changes work? I can generate one with `pstack-create-verification-skill`." On yes, run it. On no, move on without pushing.

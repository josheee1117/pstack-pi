---
name: pstack-lean
description: "精简审查（对偶校准版）：编码完成后结合静态结构探针审本轮 diff，既删零语义转发包装与死分支，又保留 Composed Method 领域步骤与顶层分派可读性；作者按报告返工后重跑一次。"
disable-model-invocation: true
---

# Lean

Scope is this run's diff: the merge base with the base branch through the working tree. When the caller names files or a commit range, use that instead.

Report only. Do not apply fixes.

## Step 0 — Run Static Structure Probe First

Before reading line by line, run `scripts/lean-probe.py` (next to this `SKILL.md`) on this run's diff:

```bash
python3 <this-skill-dir>/scripts/lean-probe.py --diff
```

Treat every triggered threshold (`effective_lines > 30`, `max_nesting > 3`, `outer_try >= 70%`, `null_sentinel >= 1`) as a mandatory inspection hotspot. Thresholds flag structural hazards to inspect in context; justified exceptions are allowed without mechanical splintering.

## What counts

Only what this diff introduced or touched. Apply the **Dual Standard on Decomposition vs Inlining**:

1. **Inline ONLY zero-semantic pass-throughs, NEVER Composed Method steps**:
   - **Delete / Inline**: A new dependency, config key, parameter, flag, adapter without a second implementation, or one-caller wrapper whose body only forwards parameters/calls without changing abstraction level, isolating a transaction/lock/IO failure boundary, or naming a distinct domain phase. If the standard library or an installed dependency does it, use that.
   - **Keep / Extract (Composed Method)**: Keep or extract a private domain step method (even with one caller) when inlining it pushes the caller past `30` effective lines, pushes nesting past `3` levels, mixes high-level orchestration with low-level DTO/SQL/HTTP mechanics, or forces `null` control-flow sentinels. Keep top-level mode/status dispatch branches (`if` / `switch`) visible in the entry orchestration method (`scan`, `sync`, `reconcile`, `handle`) and extract branch arm bodies into 3–6 named domain steps readable on one screen.
2. **Consolidate duplicated decisions**: The same decision, conversion, validation, or default written in two places, or inconsistent representations of missing resources (`null` vs exception). Collapse to one source of truth.
3. **Delete replaced paths**: Dead branch, unused import or export, compatibility shim, rollback or temporary path.
4. **Boundary checks & explicit failure scopes**: Move input normalization (`trim`, default values, null fallbacks) to the boundary. Never wrap `>= 70%` of a method in `try/catch` or return `null` inside an outcome/tuple record as a control-flow sentinel; catch only around the specific external call, lock, or per-item batch boundary, and represent outcomes explicitly.
5. **Data shape, pagination & blast radius**: Check pagination completeness (page count, total drift, cumulative records), distributed lock / transaction blast radius (never serialize unrelated categories or tenants under a coarse lock, and never let lock-acquisition failures escape per-item batch accounting), and dual-field state drift.
6. **Shrink mutable & hidden state**: Prefer explicit return values/records over mutating shared objects, locals over fields, derivation over sync, and self-explanatory names over explanatory comments or "maybe later" extension points.

## Never cut

External contracts, permissions, transactions, idempotency, error handling, tests, accessibility, and **named Composed Method domain steps that keep entry orchestration readable on one screen**. Removing these is damage, not simplification.

## Verify before reporting

Open the code at each flagged line and trace its callers with `rg`. A finding from the diff alone does not count. State the outcome of the change: does the project still build and pass its checks, or is that unknown?

## Output

- 结论: blockers, important, minor, as counts.
- Findings by severity: `file:line` | problem | trigger or failure scenario | change (delete, merge, extract step, or replace with what) | risk (none, or what breaks).
- 能删: one line summarizing the removable set (and any over-inlined hotspot that needs step extraction; write `无` with evidence if none).
- 不确定: what needs the author's judgment.
- Never write "通过" or "可以合并".

## Loop

The author applies the report, then runs this review once more. Stop at two rounds. Any blocker or important finding left is reported to the human instead of moving on. After the rework, run the project's own checks and the verification skill, and list what was removed or converged in the handoff.

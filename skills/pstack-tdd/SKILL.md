---
name: pstack-tdd
disable-model-invocation: true
description: "测试驱动修复：先写能复现问题的失败测试，再修复并重跑。适用于明确要求 TDD、回归测试，或已有清晰低成本本地测试入口的缺陷；测试路径不明、代价高或高度依赖集成环境时不强推。"
---

# TDD bug fix

When fixing a bug with a clear, cheap test path, make the broken behavior executable before changing production code. The goal is a focused regression test that fails before the fix and passes after it.

Do not force a test when it would be impractical. If the available test would need broad harness setup, brittle mocks, slow end-to-end infrastructure, production-only state, vague reproduction steps, or large unrelated fixture churn, skip the new test and use the closest useful verification instead.

## Workflow

1. **Understand the bug.** The intended behavior, the current behavior, the affected path, and the smallest observable reproduction.
2. **Choose the narrowest executable check.** Prefer the closest unit, component, integration, or regression test already used for that code path. If no practical test path is obvious, do not create one from scratch just to satisfy the workflow.
3. **Write the failing test first.** The smallest focused test that would have caught the bug. It encodes intended behavior, not the current implementation.
4. **Run the new test before fixing.** Confirm it fails for the intended reason. If it passes, or fails for an unrelated reason, correct the test or the reproduction before touching the implementation.
5. **Fix the bug.** The smallest production change that satisfies the intended behavior while preserving nearby contracts.
6. **Rerun the regression test.** Confirm it now passes.
7. **Run nearby validation.** Adjacent tests, type checks, lint, or scenario checks when the change has broader risk.

## If a failing test is impractical

Do not silently skip the regression step. Before fixing, explain why a failing test is impossible or not worth the cost, then choose the closest executable regression check available: a targeted script, a manual reproduction command, browser automation, a snapshot comparison, a log assertion, or a focused integration check.

Prefer no new test over a bad test. A bad test mostly tests mocks, encodes current implementation details, depends on timing or unrelated global state, needs expensive infrastructure for a small fix, or would be deleted immediately after proving the fix.

## Guardrails

- Do not change tests to match a wrong implementation.
- Do not weaken existing assertions unless the expected behavior genuinely changed and the reason is clear.
- Keep the regression test focused on the bug. Avoid broad fixture churn or unrelated coverage expansion.
- Do not add tests when the practical signal is weak. Use manual or scripted verification and say why.
- If the bug is flaky, make the test deterministic where possible and document the signal being locked down.
- If the bug exposes a broader class of failures, land the focused regression path first, then consider sibling coverage.

## Final response

Report the evidence, not just the outcome.

- Name the failing-before test or check and the failure it produced.
- Name the passing-after run and any nearby validation.
- If failing-before evidence could not be demonstrated, say why and describe the closest check used instead.

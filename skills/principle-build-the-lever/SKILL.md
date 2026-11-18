---
name: pstack-principle-build-the-lever
description: "先造工具：任何不小的工作都适用，包括修改、迁移、分析和检查。写一个能完成或证明它的工具（codemod、脚本、生成器，或子代理照做的技能），而不是手工做。这个工具就是审查者可以重跑的产物。"
disable-model-invocation: true
---

# Build the Lever

When the work isn't trivial, build the tool that does it (a codemod, script, generator, or rerunnable check) instead of doing it by hand. The bar is triviality, not repetition. Skip the tool only for a couple of obvious edits.

- Do the first unit by hand, then build the tool and prove it by rerunning it on that unit. Make it safe to rerun.
- A deterministic tool beats fan-out. When you do fan out, write the recipe, the verification contract, and the fences as one skill the delegates read and cannot edit.
- Applying this produces a file. No script, codemod, generator, or delegate skill in the diff means you didn't apply it. Commit it when the work outlives the session.
- Build the smallest script that does or proves the job, never a framework.

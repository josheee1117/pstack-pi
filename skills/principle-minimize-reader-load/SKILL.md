---
name: pstack-principle-minimize-reader-load
description: "减轻读者负担：审查或整理难以追踪的代码时使用。数一数从问题到答案要跨几层、读者要在脑子里记多少隐藏状态；合并只有一个调用方的包装，缩小可变状态的范围。"
disable-model-invocation: true
---

# Minimize Reader Load

Reader load is the work a reader must do to understand code. It has two independent axes: layers to trace between the question and the answer, and hidden or mutable state to hold in their head. Guard both.

- Collapse layers that only forward: wrappers with one caller, adapters with no second implementation, pass-through methods. Inline them.
- Shrink state scope: returns over mutations, locals over fields, fields over module state, module state over globals. Derive instead of sync.
- Name an invariant once at the boundary, not in every consumer.

The test: can a new reader answer "where does X come from?" and "what can change X?" in under 30 seconds? If not, cut layers or cut state.

---
name: pstack-principle-model-the-domain
description: "为领域建模：写有状态的逻辑，或代码分支很多、同一种形状假设散落在多个文件时使用。用一个结构表达领域，而不是到处写条件判断。"
disable-model-invocation: true
---

# Model the Domain

Encode the domain in a data structure instead of scattering it across conditionals. The right structure makes invalid states unrepresentable and deletes branches.

Reach for a state machine instead of scattered booleans or phase checks, a typed model instead of loose parameters, a map, registry, or discriminated union instead of branching spread across files, a reducer instead of ad hoc mutations, and an index, queue, or normalized collection where the access pattern calls for it.

Do not force it. Keep boring code when the shape is clear, local, and unlikely to grow, and distrust an abstraction that adds indirection without removing branches or invalid states.

The sign that you skipped this: a feature that grows an if/else chain by one more branch, or a second boolean that must stay in sync with the first.

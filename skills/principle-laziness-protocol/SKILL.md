---
name: pstack-principle-laziness-protocol
description: "最小改动：重构、评估改动大小，或想加抽象、分层、层层传参时使用。优先删除，只做解决问题的最小改动。"
disable-model-invocation: true
---

# Laziness Protocol

- **Consolidate decisions.** Do not repeat the same choice in several places. Put it behind one source of truth and pass the result as a simple flag.
- **Minimize the diff.** Make the smallest change that solves the problem. Fewer lines beat "elegant" boilerplate.

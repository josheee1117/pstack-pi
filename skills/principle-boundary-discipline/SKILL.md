---
name: pstack-principle-boundary-discipline
description: "守住边界：编写校验、错误处理或框架适配时使用。把防护集中在系统边界（CLI、配置、网络、外部 API），内部信任类型，业务逻辑保持纯函数。"
disable-model-invocation: true
---

# Boundary Discipline

Validate, narrow types, and handle errors where data crosses a system boundary (CLI args, config files, external APIs, network). Inside, trust the types: no re-validation and no redundant nil checks. Parse raw data into domain types at the boundary, and keep transport and framework types out of the public surface. Business logic lives in pure functions with no framework dependencies. The shell that calls them is thin.

Two tests. Is this data crossing a boundary right now? If not, the validation is redundant. Can this be a pure function the shell just calls? If yes, extract it.

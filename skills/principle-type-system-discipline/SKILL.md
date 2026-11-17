---
name: pstack-principle-type-system-discipline
description: "类型系统纪律：设计类型、审查函数签名或写任何静态类型语言时使用。让非法状态无法表示，给语义基本类型打品牌，在边界解析外部数据，穷尽所有分支，从权威 schema 派生类型。"
disable-model-invocation: true
---

# Type System Discipline

Make the compiler reject impossible states, mismatched primitives, and unhandled variants.

- **Brand semantic primitives.** If two arguments share a primitive type but mean different things, give each its own type. Validate once at creation.
- **External data is untyped until parsed.** JSON, RPC payloads, CLI args, config, environment variables, and database rows go through a parse function at the boundary that returns the typed model.
- **Derive types from authoritative schemas.** When a schema file owns a shape, derive the type from it instead of hand-rolling a parallel one.

For TypeScript syntax, see the **typescript-best-practices** skill.

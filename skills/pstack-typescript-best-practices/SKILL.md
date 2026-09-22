---
name: pstack-typescript-best-practices
disable-model-invocation: true
description: "遵循 TypeScript 类型与建模规范：可辨识联合、品牌类型、构造式建模、用 unknown 代替 any、避免类型强转、穷尽匹配与边界解析。读取、编写或审查 .ts、.tsx 文件前使用。"
---

# TypeScript best practices

Apply [`../pstack/references/principles.md#type-system-discipline`](../pstack/references/principles.md#type-system-discipline) first.

| Rule | Summary |
|------|---------|
| Discriminated unions | Model variants with a literal discriminant so impossible states cannot be represented. No optional-field bags. |
| Branded types | Brand primitives so they cannot be mixed up. Validate once at the boundary. |
| Constructive modeling | Build the shape so the illegal value cannot be constructed. Non-empty tuple, pairwise tuple, start plus duration. Not a runtime guard. |
| Simplest total type | Keep `T[]` while every operation on it stays total. Strengthen to a non-empty type only where the loose type forces a non-null assertion, a cast, or a "should never happen" throw. |
| `unknown` over `any` | External data is `unknown`. |
| Schemas before guards | Before hand-writing a property-by-property type guard, use the repository's runtime schema library and infer the type from the schema. |
| No `as` casts | Every `as` is a runtime crash waiting. Cast only after validation. |
| Narrowing hierarchy | Discriminant switch, then `in`, then `typeof` and `instanceof`, then a user-defined type guard, then `as`. |
| Type guards | A guard must verify its claim. A lying guard is worse than a cast, because the bug hides behind a name that says it is safe. Name them `isX` or `hasX`. |
| Exhaustiveness | An inline `const _exhaustive: never = x;` in the default arm, so the compiler errors when a new variant is added. |
| `satisfies` over `as` | Validates the value without widening literal types. |
| Boundary validation | Parse where data crosses in, into a named domain type. `Record<string, unknown>` stops at that parse. Trust types inside. See `boundary-discipline`. |
| Schema-derived types | Reach for `Pick`, `Omit`, `Parameters`, `ReturnType`, `Awaited`, and `typeof` before declaring a new interface. |
| Object args | Pass objects, not positional arguments, so the order is self-documenting. Skip on hot paths such as per-frame render, tokenizers, and parsers. |
| Real tests | Do not mock what you can run. Prefer the framework's real test primitives, and verify UI in a running build. Mock only what you cannot run locally. |
| Structured telemetry | Prefer a structured logger with enough context to debug from an id. No `console.log` in shipped code. |

Examples for each rule: [`references/patterns.md`](references/patterns.md).

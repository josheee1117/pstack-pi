---
name: pstack-principle-migrate-callers-then-delete-legacy-apis
description: "迁完调用方就删旧接口：新增内部 API 而旧调用方还在时使用。同一轮里迁移所有调用方并删掉旧接口，不保留兼容层。"
disable-model-invocation: true
---

# Migrate Callers Then Delete Legacy APIs

- Update tests to assert the new contract, and delete tests that only protect pre-refactor implementation details

**When this applies:**
- No external users depend on backward compatibility
- The project can absorb coordinated breaking changes
- The new API is part of a simplification or refactor initiative

---
name: pstack-principle-redesign-from-first-principles
description: "从头重新设计：往现有设计里加新需求时使用。假设这个需求从第一天起就是基础前提来重新设计，而不是硬塞进去。"
disable-model-invocation: true
---

# Redesign From First Principles

When integrating a change, don't bolt it onto the existing design. Redesign as if the requirement had been a foundational assumption from the start.

- Read all affected files and understand the current design
- Ask: "if we were writing this from scratch with this new requirement, what would we build?"
- Propagate the change through every reference: types, docs, examples, rationale sections
- Think about the whole redesign, then deliver it incrementally

This is the method for preserving option value when integrating changes into an existing design.

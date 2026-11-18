---
name: pstack-architect
description: "先设计再实现：明确类型、函数签名与模块结构，并在实现过程中持续校准。适用于架构设计、要求先出方案，或跨函数边界且贸然编码容易固化错误结构的改动。"
disable-model-invocation: true
---

# Architect

Before writing code, trace every system the change touches, then sketch two different shapes for it (types, signatures, module boundaries) and pick the one where each piece of state has one owner, each task has one way to do it, and callers need to know least. Redesign instead of patching if workarounds repeat.

For a large or contested design, run the **arena** skill instead of sketching alone.

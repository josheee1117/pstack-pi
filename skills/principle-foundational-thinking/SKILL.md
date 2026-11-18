---
name: pstack-principle-foundational-thinking
description: "打好地基：写逻辑之前使用。先选核心类型和数据结构，安排先搭骨架还是先做功能，弄清并发参与方共享什么。数据结构对了，后面的代码自然清楚。"
disable-model-invocation: true
---

# Foundational Thinking

Get the data shape right before writing logic. Define core types early, trace every access pattern, and choose structures that match the dominant paths. DRY the structure, not every line.

Before sharing state between actors, ask what happens if another actor modifies it concurrently. If the answer is not "nothing", isolate.

Scaffold first. Whatever helps every later phase (CI, tests, shared types) goes first, after removing dead code. Keep commits small and single-purpose.

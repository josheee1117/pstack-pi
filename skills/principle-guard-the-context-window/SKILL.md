---
name: pstack-principle-guard-the-context-window
description: "守住上下文：上下文快满时使用，比如大量输出、长文件、反复读取、规划并行分工。把大块内容交给子代理，主线程只留摘要。"
disable-model-invocation: true
---

# Guard the Context Window

**Why:** Context overflow degrades reasoning quality, creates compression artifacts, and halts progress.

**Pattern:**
- **Size phases and cap scope.** Limit files per phase, set turn budgets, account for mechanism costs.

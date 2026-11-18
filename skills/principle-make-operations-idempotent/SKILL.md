---
name: pstack-principle-make-operations-idempotent
description: "操作幂等：设计会遇到崩溃、重启和重试的命令、生命周期步骤或处理循环时使用。不论之前跑到哪一步，最终都收敛到同一个结果。"
disable-model-invocation: true
---

# Make Operations Idempotent

Design every state-changing operation to converge to the correct state however many times it runs and wherever the previous run stopped.

Derive each step from the state that exists, not from what the previous run meant to do. Read the current state, compare it to the goal, and apply only the difference.

Anything a run leaves behind (a lock, a temporary file, a half-written record, a claimed job) must be recognizable as stale by the next run, by evidence that holds wherever the previous run could have stopped. Write to a temporary path and rename it into place.

The test: what happens if this runs twice? What if the previous run crashed at every possible point? If the answer depends on what was left behind, add a reconciliation step.

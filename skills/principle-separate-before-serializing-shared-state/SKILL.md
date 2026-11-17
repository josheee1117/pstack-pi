---
name: pstack-principle-separate-before-serializing-shared-state
description: "先拆开共享再谈串行：多个并发参与方可能写同一个文件、分支、键或状态对象时使用。先消除共享；只有“只有一个写入者”确实是不变量时，才在结构上串行化。"
disable-model-invocation: true
---

# Separate Before Serializing Shared State

When concurrent actors might write the same file, branch, key, or object, first ask whether they need one shared object or are publishing independent facts. Default to giving each actor its own file, key, branch, or state directory, and merge only where the state is read. Two workers writing their own field into one `state.json` is still shared mutation.

Only when one shared write target is a real invariant, serialize access structurally (a lockfile, a single writer, sequential phases, compare-and-swap). Instructions are not concurrency control, and "we need a lock" is a smell to check first.

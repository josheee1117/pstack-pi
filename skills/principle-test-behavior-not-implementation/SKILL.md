---
name: pstack-principle-test-behavior-not-implementation
description: "测行为不测实现：编写、修改或保留测试时使用。断言代码使用者能观察到的结果，让测试在行为坏掉时失败，只改内部实现时照常通过。"
disable-model-invocation: true
---

# Test Behavior, Not Implementation

A test is a claim about what users of the code can observe through its interface: return values, errors, state they can read back, and effects on outside systems. Private helpers, internal call order, and intermediate data are implementation.

Judge each test against two imagined edits:

- **Break the behavior** (a wrong value, a skipped or doubled effect). If the test still passes, it proves nothing. The usual causes are a loose assertion, an expected value computed by the code under test, and an assertion on data the test built itself.
- **Change the internals** and keep every observable result. If the test fails, it is pinned to the implementation.

Keep a test that catches the first edit and survives the second. Rewrite or delete the rest. Drive the code through its public interface with a concrete input, and derive the expected value from the requirement. What an external service receives is behavior. A call to an internal helper is not. Pair "this never happens" with a case where it does happen. Assert the error type that callers branch on, not the message.

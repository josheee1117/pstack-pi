---
name: pstack-principle-prove-it-works
description: "证明它能用：任务做完、宣布完成之前使用。用真实产物验证（跑功能、读实际值、看 diff），不用替代品、自述或“能编译”充数。"
disable-model-invocation: true
---

# Prove It Works

Verify every output by checking the real thing directly: run the feature, read the actual value, inspect the diff. Proxies (file mtimes, self-reports, cached output, "it compiles") do not count. When a check fails, suspect the observation method before the system.

Script the check when you can. A deterministic script that reruns the comparison beats a one-time look. Keep its output where the human can see it, and commit it only when the trail must be auditable later.

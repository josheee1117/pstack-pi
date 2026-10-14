---
name: pstack-report
description: "收尾报告：一次流程结束时，用读者友好的方式讲清改了什么、具体验证了哪些场景、证据在哪、还有什么没覆盖。适用于任何改了文件或跑过检查的流程收尾，也可以随时手动调用来复盘刚才的工作。"
disable-model-invocation: true
---

# Report

The final reply of a run. The reader was not watching. They want to know what changed, what was actually checked, and what was not, without reading the transcript.

Write it from this run's tool results, not from memory of the plan. A check you planned but did not run is not a check.

## Sources

Gather these before writing. Each is a real artifact you can point to.

- The diff: `git diff --stat` and `git status --short` against the run's starting point. Untracked files count.
- Every check this run executed: test commands and their output, scripts, browser or CLI drives, screenshots, queries against a real store.
- Subagent reports. A check a subagent claims but you did not see output for is marked `子代理自述`. Re-run it or read its output file if it matters.
- A show-me-your-work trail, if one exists. Its Attention section goes into **没验证的和风险**.

## Shape

Reply in the user's language. Use these sections in this order. Drop a section only when it has nothing true to say, and never drop **验证了什么**.

**结论.** One to three sentences. What the user or the next maintainer will notice, and the overall state: done, partly done, or blocked on something named.

**改了什么.** Pick the smallest view that shows it, the way show-me would.

- A shallow file tree with `+` new, `~` changed, `-` removed, and a few words per file on its job. List every changed file. Group by directory when there are more than about fifteen.
- When the point is a flow that changed, a short call-tree or state diff instead, or next to the tree.

```diff
 src/orders/
~├── service.ts        # stock now decrements inside the order transaction
+├── stock.test.ts     # covers oversell and concurrent orders
 db/migrations/
+└── 0042_stock_check.sql   # CHECK (stock >= 0)
```

**验证了什么.** A table, one row per check that ran. Name what was exercised in the reader's terms, not the test file's.

| 场景 | 怎么验证的 | 结果 | 证据 |
|---|---|---|---|
| 库存只剩 1 件时两人同时下单，只有一人成功 | e2e：起服务后并发调 `POST /orders` 两次 | 一单 201，一单 409，库存 0 | `npm run e2e -- stock` 输出第 12 行；`select stock from items where id=7` → 0 |
| 正常下单扣库存 | 单测 `stock.test.ts` 3 个用例 | 通过 | `node --test` 输出 `pass 3` |

Rules for the table:

- A suite is not one row. Break it into the scenarios it covered, named from the runner's output or the test titles. "65 项全过" alone does not say what was tested. When a suite is large, give the scenarios that touch this change one row each and fold the rest into one row with the count.
- An end-to-end row says how the service was started, which entry point was driven (HTTP route, UI page, CLI command), and where data landed (which database or store). A row that ran against in-memory state or a mock in place of the real store says so in **结果**.
- **结果** is what you observed, not "符合预期". Failing and flaky checks get rows too.
- **证据** is a pointer the reader can follow: a command plus the line of output that decides it, a file path, a screenshot path, a commit SHA. Quote at most one or two lines. Never a paragraph.
- Only checks from this run. A check from an earlier session goes in only with its date, marked `之前`.

**没验证的和风险.** Each item says what was not covered and why: not run, no access, a stand-in used for the real target, a subagent's claim not re-checked. Give what it would take to cover it. Write `无` only when you looked and found nothing.

**需要你决定.** Open calls only the user can make. For each, the default you applied and what they could tell you instead. Omit when there are none.

## Size

Match the run. A one-file fix gets one line of 结论, one table row per check that actually ran, and no empty sections. When nothing was run, the table is replaced by one line saying 未验证 and why. Never add a row to fill the table. A multi-phase run gets every section.

When the report would run past roughly forty table rows, or the evidence is visual (screenshots, before and after layouts), also write one HTML file with the full report. Keep 结论, the key rows, and 没验证的和风险 in the reply. Put the HTML in the system temp directory as `pstack-report-<slug>.html`. Embed screenshots as data URIs so the file stands alone, support light and dark, and make it readable on a narrow window. Try `open` on macOS or `xdg-open` on Linux. Over SSH, in a container, or when the command fails, skip opening. Give the path in the reply either way.

## Writing

- Plain words. Name no principles, playbooks, checkpoints, or skills unless the user asks. A playbook's own **Reply** items still appear, in the section each belongs to, except process items such as checkpoints, which stay in `pstack_plan`.
- Every claim says whether it was measured, inferred, or unknown, in the same sentence.
- No praise of the work, no recap of the process, no "下一步建议" padding. A follow-up appears only when it is a real defect or gap with evidence.

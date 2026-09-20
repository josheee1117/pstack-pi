# 来源与许可

本包是 pstack 的 Pi 原生移植，不是逐字复制。

## 上游

- 项目：`pstack`（作者 Lauren Tan / poteto），位于 `cursor/plugins` 仓库的 `pstack/` 目录。
- 快照：`e31650eea443aaea1e84cc15d88c13f40080b275`（插件版本 0.15.2）。
- 站点：https://github.com/cursor/plugins/tree/main/pstack
- 许可：MIT，Copyright (c) 2026 Lauren Tan。完整文本见 `LICENSE`。

## 移植参考

- 项目：`michael-denyer/pstack-claude`，快照 `430a4f5d1fdcba0750ffa21e441ced5114f7d8ce`。
- 仅作为「从 Cursor 迁到另一种 harness 时会踩什么」的参考，未复制其基础设施（生成器、hooks、prompt stub、模型策略文件、同步工具）。

## 本次移植做了什么

- 全部 23 个可移植公共技能和 23 个 playbook 重写为 Pi 的 skill 形式并调整执行绑定。
- 23 条原则合并为一份内部参考 `skills/pstack/references/principles.md`，不注册为公共 skill。
- 删除了 Cursor 专属机制：`Task`/`subagent_type`、`run_in_background`、`environment: cloud`、`AskQuestion`、`/loop`、`control-ui`/`control-cli`、`/deslop`、`cursor-team-kit`、`~/.cursor/rules/pstack-models.mdc`、`agent-transcripts` 目录约定、Graphite（`gt`）与 Origin 专属 forge 分支。
- 当前未移植的脚本与基础设施：`watch-pr`、`orch` store、`worktree-audit.sh`、`check-plan.mjs`、`bun.lock`、模型默认值。`show-me-your-work` 的 `scripts/log.sh` 按上游原文恢复为 `skills/pstack-show-me-your-work/scripts/log.sh`。
- 未移植 `make-bot-ui`（Cursor Grok Bot webhook 与 Tailscale 专属）和 `automations/benny`（Cursor automation 运行时专属）。

逐项去向见 `docs/coverage.md`。

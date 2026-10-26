# 来源与许可

## 上游

- 项目：`pstack`（作者 Lauren Tan / poteto），位于 `cursor/plugins` 仓库的 `pstack/` 目录。
- 当前基于：`99b609a72323b70204eab407c622f436e858e112`（插件版本 0.15.32），见 `upstream.lock`。
- 站点：https://github.com/cursor/plugins/tree/main/pstack
- 许可：MIT，Copyright (c) 2026 Lauren Tan。原文见 `LICENSE.upstream`。

## 移植参考

- `michael-denyer/pstack-claude`（pstack 的 Claude Code 移植）：参考了它"正文基本不动、平台差异集中说明"的做法。

## 对上游做了什么

- 技能正文原样使用。改动只有：
  - 技能名加 `pstack-` 前缀，`poteto-mode` 注册为 `pstack`，`setup-pstack` 为 `pstack-setup`，`teach` 为 `pstack-teach-me`，`poteto-help` 为 `pstack-help`；
  - 每个技能的 `description` 翻译成中文；
  - `skills/poteto-mode/scripts/worktree-audit.sh` 转交本包的 `adapter/worktree-audit.mjs`，读取 Pi 会话并保守判定；不自动 fetch 或删除。
- 没有带上 `make-bot-ui`：它依赖 Cursor 的 Grok Bot webhook 和 Tailscale，在 Pi 上没有对应物。
- 没有带上上游的 `docs/`、`assets/`、`automations/`（Cursor 的 automation 运行时专属）。
- 新增 Pi 适配层：`adapter/`（行为补丁、对照说明、补充说明）和 `extensions/pstack.js`。

逐项说明见 `docs/coverage.md`，同步方法见 `docs/sync.md`。

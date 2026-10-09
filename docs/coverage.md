# 技能清单

下面列的是**适配后的预期用途和前置条件**，不是逐项端到端验收报告。全部技能已做加载/展开检查；日常合成任务的历史记录见 [evaluation.md](evaluation.md)。真实多工作者编排、带认证 MCP、浏览器、远端 PR/长期编排尚未完整验收。表中的“可用”均以组件存在、已认证、获准且实际验证为条件；缺口必须明确报告。

可选组件的安装方法见 [install.md](install.md)。本包不会自动安装它们，也不保证各版本接口一致。

## 技能

| 命令 | 做什么 | 在 Pi 上 | 可选组件 |
|---|---|---|---|
| `/skill:pstack` | 工作流入口：判断任务大小，匹配 23 个流程之一 | 可用。另见下面的"流程" | 看具体流程 |
| `/skill:pstack-help` | 使用向导：怎么配置、怎么开模式、该用哪个技能 | 可用。上游按 Cursor 写（Custom Mode、插件安装、指南页），对照说明把这些换成 Pi 的命令和本包文档 | 无 |
| `/skill:pstack-setup` | 配置各角色用哪个模型 | 可用。写入 `~/.pi/agent/pstack-models.md` | 无 |
| `/skill:pstack-how` | 讲清系统怎么工作 | 可用。简单问题直接答，复杂问题并行探查 | pi-subagents（并行探查） |
| `/skill:pstack-why` | 追查代码为什么这样写 | 可用。代码历史用 git 和 gh；工单、文档、聊天、错误追踪、监控通过 MCP 接入，没接的类别在结论里写明未覆盖 | gh；pi-mcp-adapter 和对应 MCP 服务；pi-subagents（并行查） |
| `/skill:pstack-recall` | 恢复工作上下文 | 可用。读本项目的 Pi 会话记录（`adapter/notes/sessions.md`），共享记录部分同 why | 同 why |
| `/skill:pstack-blast-radius` | 检查改动会波及哪里 | 可用 | gh（查 PR） |
| `/skill:pstack-architect` | 先设计再实现 | 可用 | pi-subagents（多方案并行） |
| `/skill:pstack-arena` | 多方案竞赛，选底版再嫁接 | 可用 | pi-subagents |
| `/skill:pstack-swarm` | 并行分工再汇总 | 可用。每个工作者是一个后台子代理，写代码的各用一个 git worktree | pi-subagents |
| `/skill:pstack-interrogate` | 多模型对抗式审查 | 可用。只有一个模型时仍在独立上下文里审，结论注明少了模型多样性 | pi-subagents |
| `/skill:pstack-correct` | 把反复出现的同类错误变成架构、类型、lint 或测试层面的硬约束 | 可用 | 无 |
| `/skill:pstack-benchmark-checklist` | 报告性能数字前逐项核对测量是否可信 | 可用。部分命令（`nproc`、`strace`）只在 Linux 上有，macOS 用 `sysctl -n hw.ncpu`、`dtruss` 等对应工具 | 无 |
| `/skill:pstack-tdd` | 先写失败测试再修 | 可用 | 无 |
| `/skill:pstack-bro` | 用大白话重说上一条回复 | 可用 | 无 |
| `/skill:pstack-unslop` | 去掉文字里的机器腔 | 可用。高频规则由 extension 常驻注入 | 无 |
| `/skill:pstack-technical-writing` | 规范文档、PR、提交信息的写法 | 可用 | 无 |
| `/skill:pstack-no-comments` | 精简无价值的注释 | 可用。审查者用独立上下文的子代理 | pi-subagents |
| `/skill:pstack-typescript-best-practices` | TypeScript 类型与建模规范 | 可用。上游按文件类型自动挂载，Pi 没有这个机制，改由对照说明提醒模型编辑 `.ts` 时去读 | 无 |
| `/skill:pstack-figure-it-out` | 为没有现成流程的复杂任务设计流程 | 可用。负责人就是当前会话，每轮派新的子代理；会话关掉流程就停 | pi-subagents |
| `/skill:pstack-show-me-your-work` | 用 TSV 日志记录决策过程 | 可用 | 无 |
| `/skill:pstack-create-verification-skill` | 为项目生成真实驱动应用的验证技能 | 可用。生成到项目的 `.pi/skills/`；网页和 Electron 应用用浏览器 MCP | Chrome DevTools MCP（界面类应用） |
| `/skill:pstack-maintain-verification-skill` | 维护验证技能与功能地图 | 可用 | 同上；gh（开 PR） |
| `/skill:pstack-reflect` | 复盘并把教训落到技能里 | 可用。读本项目的 Pi 会话记录 | pi-subagents（三个审查视角） |
| `/skill:pstack-automate-me` | 把个人习惯做成技能 | 可用。挖掘本项目的 Pi 会话记录 | pi-subagents |
| `/skill:pstack-teach-me` | 把改动或子系统讲明白 | 可用。上游用生图工具画空间类的图，这里改用 mermaid 或文字示意图。改名是为了不被项目里的同名 `teach` 技能盖掉 | 无 |
| `/skill:pstack-principle-*` | 24 条原则，如 `pstack-principle-fix-root-causes` | 可用，原样 | 无 |

## 流程（入口技能的 23 个 playbook）

| 流程 | 在 Pi 上 | 可选组件 |
|---|---|---|
| investigation、feature、refactoring、hillclimb、prototype、authoring-a-skill、session-pickup、pause-safely、multi-phase-plan、trace-forensics | 可用 | 无；并行步骤用 pi-subagents |
| eval | 可用。候选和评审都在独立上下文里跑 | pi-subagents |
| autonomous-run | 可用。"跑到完成为止"用 `/goal`，固定节拍用 pi-subagents 的定时任务，都没有就按上限轮询 | pi-goal 或 pi-subagents |
| bug-fix、perf-issue、runtime-forensics、visual-parity | 可用。命令行和服务用 bash 驱动；网页和 Electron 用 Chrome DevTools MCP；像素对比写 Playwright 脚本 | Chrome DevTools MCP（界面类问题） |
| opening-a-pr、babysit、shipping | 可用，只在你要求时开 PR。盯 CI 用上游脚本（要 bun）或 `gh pr checks --watch` | gh；bun（可选）；pi-subagents（shipping 的逐 PR 验证者） |
| autopilot-full、autopilot-stack、orchestrate | 可用。当前会话统筹，每个 PR 每轮派一个新的后台子代理；没有能自己醒来的长期负责人，会话关掉流程就停。orchestrate 的 PR 栈计算要 Graphite | pi-subagents、gh；pi-goal（自动续跑）；bun 和 gt（orchestrate） |
| worktree-cleanup | 已做本地只读审计测试。按 Pi 会话头核对项目，未知证据不判 safe，不 fetch、不删除 | Node + git；`--prs` 才使用 gh |

## 已去掉

| 上游条目 | 原因 |
|---|---|
| `make-bot-ui` | 靠 Cursor 的 Grok Bot webhook 唤醒，还要 Tailscale 交接密钥，Pi 上没有对应的运行时 |
| `automations/` | Cursor 的定时自动化运行时专属 |
| `docs/`、`assets/` | 上游插件自己的文档和图片，本包有自己的文档 |

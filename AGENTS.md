# 能力映射（替换实现，不删产物）

pstack 的技能规定所需能力和包内默认实现。使用者可以在自己项目的 `AGENTS.md` 中映射到其他工具或 skill；本文件提供映射模板。

## 规则

1. 优先级：**当前对话的明确请求** → **本项目 `AGENTS.md` 里的能力映射** → **包内默认路径**。
2. 映射只换实现，不得删除原任务的必要产物、证据和独立性要求。替换后仍要交出同样的结论和证据。
3. 只写你**真实验证过**的工具或 skill。没有验证过的映射等于没有。
4. 目标不存在或能力不匹配时，说明缺口，回退到默认路径或请用户选择。不假装调用成功。
5. 这是一张 Markdown 表，不需要解析器、注册表或配置扩展。

## 表格式

把下面这块复制进你项目的 `AGENTS.md`，按实际情况填。留空的一行表示用包内默认路径。

| 能力 | 本项目的实现 | 边界 |
|---|---|---|
| 独立审查者（没写过这份代码的人和上下文） | | |
| 并行实现（各自独占 worktree） | | |
| 真实驱动被测表面（UI/CLI/服务） | | |
| 会话记录（历史上下文、复盘） | | |
| 长期任务的编排与交接 | | |
| 跨会话通信 | | |
| 代码简化 / 领域建模指导 | | |
| forge 操作（PR、合并、CI 状态） | | |

## 示例（一个填好的表）

| 能力 | 本项目的实现 | 边界 |
|---|---|---|
| 独立审查者 | `interrogate` 技能 + 新起会话的 reviewer | reviewer 不得先看实现者自述；给它需求 + 固定 commit |
| 并行实现 | 每个写入者一个 git worktree，各自一条分支 | 只读者可共用稳定快照 |
| 真实驱动被测表面 | 本仓库 `.pi/skills/verify-<app>/`（由 `pstack-create-verification-skill` 生成） | 无法驱动时明确 blocked，不以截图存在代替行为证据 |
| 会话记录 | 当前会话的 `PI_SESSION_FILE` + 本项目 `memory_search` | 只读本项目记录，不读无关项目私有会话 |
| 长期任务编排 | pi-subagents 后台子代理 + 当前会话统筹 + 文件证据交接 | 不新造调度器或 orch store；会话关掉流程就停 |
| 代码简化指导 | Ponytail | 只替代简化建议，不等于运行时验证 |
| 领域建模 | domain-modeling skill | 不自动等价于多方案设计 |
| forge | `gh` | |

替换的边界要写清。例如 pi-subagents 是**执行方式**，不是 swarm 的任务拆分与汇总规则；Ponytail 是**简化指导**，不能替代「跑起来看一眼」。

上表里每一行都必须是你在这个环境里**真实见到并读过**的工具或 skill。不同人的机器装的东西不一样：不要把某个环境里恰好存在的 skill 当成所有使用者都有。只写你自己验证过的映射；没验证过的留空一行，让它回落到包内默认路径。

## 关于本包自身

上表是给**使用本包的项目**用的模板。pstack-pi 自己怎么开发不受它约束：这个仓库的开发不需要任何特定 subagent 扩展，也不需要 MCP。

包内的默认执行方式写在 `adapter/platform.md` 和 `adapter/notes/`：所有子代理都用 pi-subagents。那是**产品的包内默认**，你项目的 `AGENTS.md` 映射可以替换它，不是本仓库的开发要求，也不是任何环境都应该有的前提。适配层在会话第一次用到 pstack 时就注入，所以单独调一个 `/skill:pstack-swarm` 也会拿到这些默认。

## 本地验证技能 / Local verification skill

- 本仓库有一个验证技能（随仓库提交）：`.agents/skills/verify-pstack-pi/SKILL.md`，功能地图在 `.agents/skills/verify-pstack-pi/features/README.md`，控制脚本 `.agents/skills/verify-pstack-pi/scripts/drive.sh`（在 tmux 里驱动真实 Pi 界面）。
- 适用工具：Codex 与 Pi（pstack-pi）直接读取 `.agents/skills/verify-pstack-pi/`；Claude Code 通过软链接 `.claude/skills/verify-pstack-pi` 读取同一份文件。`/maintain-verification-skill` 由 pstack-pi 提供。
- 任何 agent 改完代码，必须先按该技能验证并给出证据，才能说完成。
- 每个工作日应跑一次维护：`/maintain-verification-skill`（没有该命令时：对照最近提交，更新功能地图和 SKILL.md 中过期的命令/入口，再完整跑一遍 `scripts/drive.sh`），让功能地图跟代码保持一致。
- 这些文件随仓库提交，所有 agent 都能读到。
- This repo has a verification skill (tracked in git) at `.agents/skills/verify-pstack-pi/SKILL.md` with a feature map at `.agents/skills/verify-pstack-pi/features/README.md`. Any agent must use it to verify changes (with evidence) before calling them done. A weekday daily maintenance pass should run `/maintain-verification-skill` (or, without it: diff recent commits, update stale feature-map entries/commands, then re-run `scripts/drive.sh`) to keep the map in sync with code. These files are tracked in git so every agent can read them. Tools: Codex and Pi (pstack-pi) read `.agents/skills/verify-pstack-pi/` directly; Claude Code reads it via the symlink `.claude/skills/verify-pstack-pi`. `/maintain-verification-skill` comes from pstack-pi.

# 安装范围与可选组件

## 支持范围

本包没有 npm 运行时依赖，不携带模型密钥、不写死开发者家目录、不自动安装外部工具。

当前加载与命令展开检查覆盖 `@earendil-works/pi-coding-agent 0.87.0` 和 `@mariozechner/pi-coding-agent 0.73.1`。有 `systemPromptOptions.sections` 时使用分段提示；缺少它时使用 `systemPrompt` 回退。回退路径有本地测试，不代表所有历史版本都兼容。

**原版 Pi 0.73.1 会提示 46 条 name 与目录名不同的警告，但仍加载并展开这 46 个命令。**这是保留上游目录、使用 `pstack-` 命令前缀的取舍；没有隐藏或篡改宿主诊断。earendil 0.87.0 不报这类警告。真正的重名、文件缺失和扩展加载错误仍须修复。不能把这一状态描述成“所有 Pi 版本零警告无缝安装”。

实际执行环境为 macOS。Node 实现已移除 macOS 专用 stat/date，测试覆盖 Windows 风格路径编码，但 Windows/Linux 真机以及不同版本的外部插件尚未端到端验证。Pi 本身的 Node、Git、shell 和平台要求，以所装版本为准。

## 按需组件

以下命令是操作者自行选择的安装示例，不会由本包自动执行。`brew` 示例仅适用于装了 Homebrew 的环境；其他平台按对应项目官方安装文档操作。

| 功能 | 组件及示例 | 边界 |
|---|---|---|
| 子代理：调查、审查、并行工作者 | `pi install npm:pi-subagents` | 装后才有子代理工具，自带子代理向主会话提问的通道；需要独立判词而后端缺失时必须停下 |
| MCP 数据源及浏览器 | `pi install npm:pi-mcp-adapter` | 接入服务器还需要独立安装、认证和授权 |
| 自主任务 | 可选 `pi install npm:@narumitw/pi-goal` | 工具名、自动续跑上限按安装版本确认；缺失时不承诺自动唤醒 |
| PR、CI、代码历史 | Git；GitHub 使用 `gh` 并由用户运行 `gh auth login` | 未授权不创建、修改或合并 PR |
| 上游 watch-pr/orch 脚本 | Bun，见 <https://bun.sh/docs/installation> | 不想装可用 gh 做有界 PR 查询；不能声称覆盖完整 orchestrate |
| orch 的 Graphite 栈操作 | `npm install -g @withgraphite/graphite-cli` | 还需仓库配置及认证，未做真实远端验收 |
| 浏览器驱动 | Chrome，或 Playwright 支持的浏览器 | 浏览器安装与首次下载由用户确认 |

可选插件的版本和接口会变化。先看工具列表与 schema，再执行下面的示例。装完后 `/reload` 或重启 Pi；子代理依赖的插件还必须在子会话环境里加载。

## 模型配置

`/skill:pstack-setup` 按会话中实际可选的模型给出配置建议，**确认写入位置后**再保存。默认读取 `$PI_CODING_AGENT_DIR/pstack-models.md`，环境变量没设时是 `~/.pi/agent/pstack-models.md`。旧 `pstack-roles.md` 作为兼容读取项。

可以使用 `auto`/`inherit-parent`，不需要任何开发者私有 provider。`cpa` 等名称只是某些用户自己的配置，不能复制成所有人的默认值。模型出现在列表里也不证明账户有余额；调用失败要报告，不循环换模型花钱。

pi-subagents 的 agentOverrides 可能钉住其他模型。适配说明要求明确选择模型并显式使用 fresh context，但这是给模型的指令，不是运行时强制保证。多模型面板只用单模型时要说明多样性减少；用户明确要求多模型时不能自行降级。

## 子代理

所有子代理都走 pi-subagents：每个子代理一次单独的后台调用，写代码的并行工作者各用一个 git worktree。上游的云端工作者、PR 负责人和验证者也这样映射，见 [`../adapter/notes/cloud-agents.md`](../adapter/notes/cloud-agents.md)。

运行中输入 `/subagents-fleet` 打开检查器：看每个子代理的实时对话、模型和花费，按 `s` 给正在运行的子代理发调整指令，按 `D` 停掉它。调整指令在子代理当前那条命令结束后生效。

已验证：pi-subagents 0.76.1、Pi 1.1.0，在 tmux 里真实运行，确认了面板显示、检查器和中途调整。升级 pi-subagents 后按同样方法再试一次。

没有能自己醒来、跨天运行的长期负责人。子代理做完一件事就结束，结果只交给正在运行的主会话。需要 Herdr 之类的长期工作者时，在项目的 `AGENTS.md` 能力映射里自己接入，见本包 [`AGENTS.md`](../AGENTS.md)。

## 浏览器

Playwright MCP 适合点击、输入、截图、多浏览器及可重放操作。Chrome DevTools MCP 适合 Chrome 的性能 trace、堆快照和运行时取证，两者都能做页面内执行。优先用项目已有且验证过的工具，不必同时安装两种。

以下是候选配置，版本曾验证能启动 `--help`，**尚未做带登录态网站或 Electron 的完整验收**。按需合并进项目 `.pi/mcp.json` 或自己的 MCP 配置，不要覆盖已有文件：

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@1.10.1", "--isolated"],
      "lifecycle": "lazy-keep-alive"
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@0.0.82", "--isolated"],
      "lifecycle": "lazy-keep-alive"
    }
  }
}
```

Chrome DevTools 的内存分析工具可能需要 `--memoryDebugging`；连接已开的浏览器/Electron 使用 `--browserUrl http://127.0.0.1:9222` 时，应替换自启动用的 `--isolated`，不是盲目把两组选项叠加。调试端口只绑定本机，不开放到公网。先核对安装版本的 `--help`。

像素对比另用项目的 Playwright `toHaveScreenshot` 或 pixelmatch 测试；截图存在不等于像素一致。没有可驱动的浏览器就标记该步骤受阻，不用编译结果代替。

## why 的数据源

复用已有 `pi-mcp-adapter`，不另造一套 MCP 客户端。`mcp({})` 看状态、`mcp({server: "名称"})` 看工具，实际调用前读参数 schema。git 是基础证据，gh、工单、文档、聊天、遥测都按真实可用性报告。

| 类别 | 可选接入 | 认证/验证边界 |
|---|---|---|
| GitHub | git + gh；GitHub MCP 可选 | 用自己的仓库授权，缺认证只报告缺口 |
| 工单 | Linear 官方 MCP `https://mcp.linear.app/mcp/readonly`；Atlassian `https://mcp.atlassian.com/v2/mcp` | 需账号 OAuth，未在本任务登录验收 |
| 文档 | Notion `https://mcp.notion.com/mcp` | OAuth 与页面权限 |
| 错误 | Sentry `https://mcp.sentry.dev/mcp` | OAuth 与组织范围 |
| 聊天 | Slack 官方 `https://mcp.slack.com/mcp`，或社区 `slack-mcp-server` | 官方需已注册 Slack app；社区版需自行审查 token 权限 |
| 监控 | 组织批准的 Datadog MCP | 本任务未验证具体组织端点，不提供猜测配置 |
| 数据仓库 | 组织的 Databricks SQL MCP | 工作区特定端点与只读凭据，未验证 |

最小 OAuth 示例：

```json
{"mcpServers":{"linear":{"url":"https://mcp.linear.app/mcp/readonly","auth":"oauth"}}}
```

由用户 `/mcp-auth linear` 完成授权，再 `/mcp` 看状态。端点返回 401 只证明需要认证，不是功能已验收。密钥用环境变量或宿主秘密存储，别提交进仓库。

本包还声明一个可选的 `pstack-investigator` agent，工具包含 MCP 代理，默认 fresh context；pi-subagents 未安装时这份元数据不会变成硬依赖。需要 MCP 的调查者必须后台运行并加载 MCP adapter。只读提示不是安全隔离，应同时使用只读凭据、服务器工具过滤和宿主权限。没有子代理时可以逐类顺序查询，但不能称作独立并行调查。详见 [`../adapter/notes/sources.md`](../adapter/notes/sources.md)。

## worktree 清理

```bash
node adapter/worktree-audit.mjs /path/to/repo
node adapter/worktree-audit.mjs /path/to/repo --session-dir /explicit/project/sessions --base refs/heads/main
# 可选，才会通过 gh 查询远端 PR
node adapter/worktree-audit.mjs /path/to/repo --prs
```

保留原来的 shell 入口，但 Windows 可直接运行 Node。脚本不 fetch、不删文件或分支。缺会话记录、未知状态、未跟踪文件、locked/prunable 都不会判成可直接删除；输出只供人工审查。

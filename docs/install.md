# 可选组件

本包没有必装依赖。下面每一样都按需装：用到哪个功能，装哪一样。没装的时候，对应步骤会说清楚缺什么，然后停下或换一种做法，不会假装做完。

## 一览

| 组件 | 解决什么 | 安装 | 没有它会怎样 |
|---|---|---|---|
| pi-subagents | 派子代理：独立审查、并行调查、swarm 和 arena 的工作者 | `pi install npm:pi-subagents` | 普通任务照做。需要独立结论的步骤停下说明缺口 |
| Herdr | 长期存在的独立 Pi 会话，每个工作者一个 git worktree。代替上游的 Cursor 云端 agent | `brew install herdr`，官网 <https://herdr.dev> | 退到 pi-subagents 的后台子代理，有 30 分钟默认上限、会话结束即停 |
| pi-intercom | Herdr 里的协调者和工作者互相发消息 | `pi install npm:pi-intercom` | 协调者只能读工作者的输出，工作者不能主动汇报 |
| pi-mcp-adapter | 接入 MCP 服务：`pstack-why` 的数据源、浏览器驱动 | `pi install npm:pi-mcp-adapter` | why 只用 git 和 gh；浏览器相关步骤标记为受阻 |
| pi-goal | 自主长任务的 `/goal`（上游的"跑到完成为止"） | `pi install npm:@narumitw/pi-goal` | 自主运行改成有上限的轮询，每轮汇报 |
| gh | 开 PR、看 CI、查 PR 历史 | `brew install gh`，然后 `gh auth login` | 涉及 PR 的步骤说明缺口 |
| bun | 上游的 `watch-pr`、`orch` 两个脚本 | `brew install oven-sh/bun/bun` | 盯 PR 改用 `gh pr checks --watch`；orchestrate 按小规模直接执行 |
| Graphite (`gt`) | orchestrate 的 PR 栈前沿计算 | `npm install -g @withgraphite/graphite-cli` | orchestrate 的该步骤说明缺口 |
| Chrome | 浏览器驱动需要本机有 Chrome | 装 Chrome 即可 | 浏览器相关步骤标记为受阻 |

装完 Pi 包后，在 Pi 里 `/reload` 或新开会话生效。

## 模型

跑一次 `/skill:pstack-setup`。它列出本会话真能用的模型，问你各角色（写代码、审查、调查等）用哪个，写进 `~/.pi/agent/pstack-models.md`。一行一个角色，例如：

```
feature, refactoring: openai-codex/gpt-5.6-sol
judgment and prose: cpa/deepseek-v4.1-flash
interrogate reviewers: openai-codex/gpt-5.6-sol, cpa/deepseek-v4.1-flash
```

不配也能用：没有配置的角色用当前会话的模型。审查面板（arena、architect、interrogate、reflect）只有一个模型时，照样在独立的上下文里跑，只是少了"不同模型互相挑错"这一层，结论里会说明。

注意 pi-subagents 自己的设置（`~/.pi/agent/settings.json` 里的 `subagents.agentOverrides`）会给内置的子代理固定模型。本包派子代理时会显式传 `model`，不受它影响；但你自己直接用 pi-subagents 时，要确认那里固定的模型还有额度。

## Herdr：代替上游的云端 agent

上游的 swarm、autopilot、shipping、orchestrate、figure-it-out 会把工作者放到 Cursor 的云端虚拟机上。本包改成：每个工作者一个 Herdr 面板，里面跑一个独立的 Pi 会话，工作在自己的 git worktree 里。

用法上你只需要装好 Herdr、开着它的服务。运行这几个技能就等于授权它：在一个确认过的 Herdr 会话里、只针对当前仓库，为每个工作者建一个 worktree 和一个 Pi 会话；只关自己建的东西，不停服务、不动你已有的面板。你开着多个 Herdr 会话又没指定时，它会先问用哪个。

具体命令和没有 Herdr 时的替代办法见 `adapter/notes/cloud-agents.md`。

## 浏览器：Chrome DevTools MCP 为主，Playwright 为辅

推荐 Chrome DevTools MCP 作为默认：点击、输入、截图、看控制台和网络之外，只有它能做性能 trace、堆快照和页面内执行代码，正好覆盖 perf-issue 和 runtime-forensics 两个流程。Playwright MCP 适合要测 Firefox 或 WebKit、要拦截网络请求、要录视频的场景。两个 MCP 都不能做像素对比，visual-parity 流程会让模型写一个 Playwright 脚本来做。

在 `~/.pi/agent/mcp.json`（全局）或项目的 `.pi/mcp.json` 里加：

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

- 要分析内存泄漏：给 chrome-devtools 的 `args` 加 `"--memoryDebugging"`。
- 要驱动 Electron 应用或已经开着的 Chrome：用 `--remote-debugging-port=9222` 启动它，再给 chrome-devtools 加 `"--browserUrl", "http://127.0.0.1:9222"`。
- `lazy-keep-alive` 让浏览器在空闲时不断开，避免跑到一半的 trace 被掐掉。

在 Pi 里 `/reload` 后，用 `/mcp` 确认两个服务都在。

## `pstack-why` 的数据源

why 追查"代码为什么这样写"，会并行查几类来源：代码历史、工单、文档、聊天、错误追踪、监控、数据仓库。代码历史只要 git 和 `gh`，其余都通过 MCP 接入，接哪些看你团队用什么。

最常见的组合，写进 `~/.pi/agent/mcp.json` 或项目的 `.mcp.json`：

```json
{
  "mcpServers": {
    "linear": { "url": "https://mcp.linear.app/mcp/readonly", "auth": "oauth" },
    "notion": { "url": "https://mcp.notion.com/mcp", "auth": "oauth" },
    "sentry": { "url": "https://mcp.sentry.dev/mcp", "auth": "oauth" },
    "slack": {
      "command": "npx",
      "args": ["-y", "slack-mcp-server@1.3.0", "--transport", "stdio"],
      "env": { "SLACK_MCP_XOXP_TOKEN": "${SLACK_MCP_XOXP_TOKEN}" }
    }
  }
}
```

然后在 Pi 里 `/reload`，对每个 OAuth 服务跑一次 `/mcp-auth <名字>`（会打开浏览器授权），最后 `/mcp` 确认状态。

- Jira 和 Confluence 用 Atlassian 的官方 MCP（`https://mcp.atlassian.com/v2/mcp`，OAuth）。
- Slack 官方 MCP（`https://mcp.slack.com/mcp`）要求你先建一个 Slack 应用，把它的 client id 和 secret 填进 `oauth`；上面用的是社区版，只要一个用户 token。
- why 会先查实际连上了哪些服务。没接的类别会在结论里写成"未覆盖"，不会悄悄跳过。
- 需要查 MCP 的子代理必须以后台方式运行，这一点适配层已经告诉模型了。

## 装进别人的 Pi

本包只依赖 Pi 本身。extension 在包里用相对路径找自己的文件，装在哪里都能用；上面这些组件缺哪个，模型都会按对照说明换做法或停下说明。`npm test` 里有一条测试专门验证：装进一个空白的 Pi，技能能干净加载、extension 不报错。

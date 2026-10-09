# pstack-pi

把 pstack 的理解、设计、实现、独立审查、验证和交付流程带到 Pi。保留上游大部分正文和目录结构，用独立适配层处理工具、路径和执行差异；支持选择性吸收上游改进，不要求完整照搬。

当前基于上游 pstack 0.15.15。包含 26 个公共技能、24 个原则、23 个 playbook，以及一个无 npm 运行时依赖的扩展。去掉完全依赖 Cursor Grok Bot 的 `make-bot-ui`。注册名和中文描述是本地改动，worktree 审计使用 Pi 专用实现。

- [安装范围、可选插件和配置](docs/install.md)
- [技能清单及适用条件](docs/coverage.md)
- [同步上游与独立演进](docs/sync.md)
- [适配层结构](docs/architecture.md)
- [第二轮测试记录及证据边界](docs/evaluation.md)

## 安装

已有 Pi 和一个可用模型即可使用基础功能。不需要复制开发者的 provider、密钥或全局配置。

```bash
cd /path/to/your-project
pi install -l /path/to/pstack-pi
pi
```

已发布到远端的版本可用：

```bash
pi install -l git:github.com/josheee1117/pstack-pi
```

**本地分支没有推送时，远端命令不会安装本地的新改动。**固定版本使用该 Pi 支持的 git ref 安装语法。已打开的 Pi 在安装后 `/reload` 或重启；遵守宿主的项目信任提示。不要同时安装同一包的旧版和新版，它们都注册 `/pstack`。

当前版本在 earendil Pi 1.1.0 上验证过：50 个技能加载无警告，命令能展开，提示注入、控制台视图和配合 pi-subagents 0.76.1 的子代理都实际跑过。较早的 earendil Pi 0.87.0 和原版 Pi 0.73.1 只验证过本包早期版本的加载和命令展开，控制台视图在这些版本上没有测过。不承诺任意历史版本、任意 OS、任意可选插件组合均零警告可用。详见安装说明。

## 使用

```text
/pstack                          开启本会话的持续工作模式
/pstack 修复这个问题：……          开启并执行任务
/pstack off                      关闭持续路由提醒，清掉控制台里的计划
/pstack status                   查看状态
/skill:pstack-how 这个模块怎么工作
/skill:pstack-why 当时为什么这样设计
/skill:pstack-recall 最近做到哪里了
/skill:pstack-teach-me 讲明白这段设计
/skill:pstack-setup               提出模型配置建议，确认后再写入
```

输入 `/skill:pstack` 前缀看补全，提交 `/skill:pstack <任务>` 会加载入口并开启模式。默认只有 setup 的描述列入模型技能目录，其他正文按需读取。

用 pstack 时，输入框上方会显示当前流程的步骤和进度，以及正在用的技能和它的作用。步骤由模型上报，可能落后于实际进度。

写作规则每轮生效：先讲结论，解释术语，保留数字、路径、决定和证据。适配说明首次用到 pstack 后才加载；用过的正文仍占上下文，缓存也不一定免费。压缩丢掉正文后，需要时重新读取。

## 默认做事方式

- 小任务直接完成并做最小真实检查，不为流程而派子代理。
- 只修请求需要的问题，额外发现先说明，不擅自扩展范围。
- 用户要求独立审查时保留独立性，缺后端就说明，不自评充数。
- 默认不向用户念原则名和流程表；用户要解释过程时照实解释。
- 按用户语言回复。提交、推送、PR、部署、安装可选依赖和修改全局设置都遵守明确授权。

这些是模型指令，不是权限沙箱或正确性保证。

## 按需接入

why 使用已有 `pi-mcp-adapter` 接入工单、文档、聊天及遥测，另有可选 `pstack-investigator` 角色供后台查询；没有 MCP 时保留 git/gh 能做的部分并报告缺口。无需再维护一个 MCP 客户端。

recall 读取当前项目的 Pi 会话，支持自定义配置目录；不会因为路径编码相同就读取另一个项目。

子代理用 pi-subagents，运行中输入 `/subagents-fleet` 可以查看每个子代理、中途调整或停掉它。上游的长期工作者改由当前会话统筹，会话关掉流程就停。Playwright MCP 可用于浏览器交互；Chrome DevTools MCP 可用于性能和内存取证。Bun、Graphite、调度器均可选，缺失时不能宣称重型流程已完整执行。配置、命令及未验证部分见 [install.md](docs/install.md)。

## 开发验证

在源码仓库执行：

```bash
npm test
npm pack --dry-run
# 针对另一个已安装的 Pi 运行相同测试
PSTACK_TEST_PI_ROOT=/path/to/pi-package npm test
```

测试包括真实 Pi 的资源加载与命令展开、提示注入/退出、隔离 worktree 审计、固定上游 ref 导入和重复同步。模拟数据、供应商调用、真实外部服务验收分别记录，不混成一个“全通过”。测试与维护脚本不随最终 Pi 包安装。

## 来源

MIT。上游作者 Lauren Tan，来源与本地差异见 [NOTICE.md](NOTICE.md)，原许可保留在 [LICENSE.upstream](LICENSE.upstream)。

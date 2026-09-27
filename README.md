# pstack-pi

把 pstack 的工程工作流装进 Pi：理解、设计、实现、独立审查、真实验证、交付、恢复。

技能正文直接用上游 pstack（Cursor 版）的原文，只改了技能名。Pi 和 Cursor 的差异由一层适配补上：一份对照说明，把 Cursor 的工具、路径、模型翻译成 Pi 的说法；一份行为补丁，保留我们实测更好的几条规矩。上游更新时用 git 合并，改动我们没碰过的地方会自动合进来。

- 技能清单和每个技能在 Pi 上怎么用：[`docs/coverage.md`](docs/coverage.md)
- 可选组件怎么装（子代理、Herdr、浏览器、MCP 数据源）：[`docs/install.md`](docs/install.md)
- 怎么跟上游同步、怎么自己演进：[`docs/sync.md`](docs/sync.md)
- 包的结构和适配层怎么工作：[`docs/architecture.md`](docs/architecture.md)

## 准备

只需要两样东西，都不随本包安装：

1. **一个能用的 Pi。** 没装的话：

   ```bash
   npm install -g --ignore-scripts @earendil-works/pi-coding-agent
   ```

   Pi 对 Node 版本有自己的要求，以你装的 Pi 版本为准。安装、认证与 provider 配置见 Pi 官方文档：<https://github.com/earendil-works/pi/tree/main/packages/coding-agent>。

2. **至少一个已认证的模型。** 启动 `pi`，用 `/login` 登录或录入 API key，`/model` 选一个可用的模型。

从 GitHub 这类 git 源安装时，机器上还要有 git。

## 安装

推荐装进**你要用它干活的项目**。`-l` 把包写进该项目的 `.pi/settings.json`，不碰全局设置：

```bash
cd /path/to/your-project
pi install -l git:github.com/josheee1117/pstack-pi
pi
```

其他装法：

```bash
pi install git:github.com/josheee1117/pstack-pi   # 装进全局用户设置
pi -e git:github.com/josheee1117/pstack-pi        # 只在本会话临时加载
pi install -l /path/to/pstack-pi                  # 本地路径安装，适合自己改技能
```

更新与卸载用同一个来源：`pi update git:github.com/josheee1117/pstack-pi`，`pi remove -l git:github.com/josheee1117/pstack-pi`。

**信任。** Pi 只在受信任的项目里加载项目级的包。首次在项目里启动 `pi` 会询问是否信任；不信任时，项目里的包不会加载。

本包没有任何必装依赖。只装 Pi 和本包，普通任务、只读提问就能跑。用到独立审查、并行写入、浏览器、外部数据源时，再按 [`docs/install.md`](docs/install.md) 装对应组件；缺了的话，对应步骤会停下来说明缺什么，不会假装做完。

## 怎么用

```
/skill:pstack 修一下这个 bug：……        进入工作流并直接开始这个任务
/pstack                                开启模式，之后每一轮它自己判断要不要走流程
/pstack 修一下这个 bug：……              开启模式并直接开始这个任务
/pstack off                            关闭模式
/skill:pstack-how 这个模块怎么工作       直接用某一个技能
/skill:pstack-setup                    配置各角色用哪个模型
```

输入 `/skill:pstack` 会看到全部技能。除了 `pstack-setup`，其他技能不会出现在系统提示的技能列表里，只在你点名或流程需要时才读取，平时不占上下文。

**写作规则常开。** 每一轮都注入一小段写作规则：先说结论、说人话、不堆术语、不用 AI 腔。不需要你提醒。

**适配层按需注入。** 会话里第一次用到 pstack（任意 `/skill:pstack-*`、`/pstack` 模式，或模型自己去读了本包的技能文件）时，才注入对照说明和行为补丁。没用 pstack 的会话一点都不多花。

**模型配置。** 跑一次 `/skill:pstack-setup`，它会列出本机真正可用的模型，问你各角色用哪个，写进 `~/.pi/agent/pstack-models.md`。不配也能用：没配置的角色一律用当前会话的模型。

## 行为补丁

上游原文在 Pi 上直接跑，结果是对的，但我们实测发现它在小任务上也会开子代理、回复里列原则名和流程步骤、顺手修用户没提的问题，token 用量是旧移植版的 3 到 4 倍。所以适配层带一份补丁（`adapter/overrides.md`），优先级高于上游原文：

- 先判断任务大小。范围清楚、有现成做法、能真跑一下验证的，直接做，不走完整流程。
- 只修请求需要的。发现别的问题，在回复里记一行，不擅自动手。
- 只在真需要并行或独立性时才派子代理。需要独立结论又没有独立上下文时，停下说明缺口，不拿自评冒充。
- 回复里不列原则名、流程步骤，只说改了什么、你会看到什么、证据是什么。
- 用你说话的语言回复。
- 没有你的要求，不 push、不开 PR、不升版本号。

## 测试

```bash
npm test
```

用 Node 自带的测试框架，没有依赖。装了 Pi 的机器上会调用 Pi 真实的技能加载器和安装流程：包装进一个空的 Pi 能否干净加载、技能名有没有冲突、每个 `/skill:` 命令能否展开、适配层引用的文件是否都在。

## 许可与来源

MIT。技能正文来自 pstack（作者 Lauren Tan），见 [`NOTICE.md`](NOTICE.md)、[`LICENSE`](LICENSE) 和上游原许可 [`LICENSE.upstream`](LICENSE.upstream)。

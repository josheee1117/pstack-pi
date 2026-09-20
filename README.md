# pstack-pi

把 pstack 的工程工作流移植成一个可安装的 Pi skills 包。理解、设计、实现、独立审查、真实验证、交付、恢复，全流程都有对应技能。

不是再实现一个 agent runtime。本包只含技能：没有 extension、prompt、theme，目前从 git 源或本地路径安装。不宣称与上游逐字等价或全平台等价，差异清单在 [`docs/coverage.md`](docs/coverage.md)。

## 准备

只需要两样东西，都不随本包安装：

1. **一个能用的 Pi。** 没装的话：

   ```bash
   npm install -g --ignore-scripts @earendil-works/pi-coding-agent
   ```

   当前 Pi（写作时 0.85.1）要求 Node ≥ 22.19.0。本包 `package.json` 里的 `engines: >=20` 是包自身的开发基线，不是宿主的最低要求；以你装的 Pi 版本的要求为准。安装、认证与 provider 配置见 Pi 官方仓库与文档：<https://github.com/earendil-works/pi/tree/main/packages/coding-agent>。

2. **至少一个已认证的模型。** 启动 `pi`，用 `/login` 做订阅登录或录入 API key，`/model` 选一个当前可用的模型。支持哪些 provider、怎么配，按 Pi 官方指南来。全程不需要向本包提供任何凭证。

另外，从 GitHub 这类 git 源安装时，机器上要有 git。

## 安装

推荐装进**你要用它干活的项目**。`-l` 把包写进该项目的 `.pi/settings.json`（可随项目提交给团队共享；其他人信任项目后，启动 Pi 会自动补装缺失的包），不碰全局设置：

```bash
cd /path/to/your-project
pi install -l git:github.com/josheee1117/pstack-pi
pi
```

同一个来源的其余装法：

```bash
pi install git:github.com/josheee1117/pstack-pi   # 装进全局用户设置（~/.pi/agent/settings.json）
pi -e git:github.com/josheee1117/pstack-pi        # 只在本会话临时加载，不写安装配置
pi install -l /path/to/pstack-pi                  # 本地路径安装，适合自己改技能内容
```

更新与卸载，用同一个来源：

```bash
pi update git:github.com/josheee1117/pstack-pi       # 更新这一个包
pi remove -l git:github.com/josheee1117/pstack-pi    # 从项目卸载
```

安装时固定了 tag 或 commit（`git:…@v1`）的源不会随 `pi update` 移动 ref；要换版本，重跑安装命令并把 ref 换成新值：项目安装写 `pi install -l git:…@新ref`（沿用你当初的安装作用域，`新ref` 替换成实际的 tag 或 commit 再运行），当初装在全局就去掉 `-l`。

**信任。** Pi 只在受信任的项目里加载项目级设置和包。项目里装了包之后，首次在该项目启动 `pi` 默认会询问是否信任（决定存在 `~/.pi/agent/trust.json`，交互会话里也可用 `/trust` 保存信任决定；通过 `/trust` 保存后需重启 Pi 才生效）。只信任你认可的源；不信任时，项目里的包和技能不会加载。

## 配置

装好后，在**目标项目**里（不是在本包仓库里）跑一次：

```
/skill:pstack-setup
```

setup 做三件事：列出**本会话实际发现的模型**；问你推理预算（`unlimited` / `large` / `medium` / `small`）和每个角色用哪个模型；把结果写进**你项目的 `AGENTS.md`**（或你指定的个人文件）。它不写安装包内部，也不会自动写全局配置；写进去的每个模型都是它发现存在、且你确认要用的。

两点边界：

- 本包没有任何硬编码模型，也没有默认 fanout 数量，不为任何角色捏造默认。没配置的角色继承你环境/父会话里实际可用的模型（setup 里的 `inherit` 就是这个意思）；要不要独立会话、用哪个后端这类执行方式，另按你项目 `AGENTS.md` 的能力映射走，没写映射就落包内默认。
- setup 不是强制门槛；它默认建议把配置写进项目 `AGENTS.md`，但这只是建议，写哪、写不写都由你选。只用当前模型跑小任务，可以一项角色都不配，之后随时重跑 setup 补。

## 按需依赖

用到哪一步，才需要配哪一样。下面这些都不随本包安装，本包也不会替你装；新用户只装 Pi 和本包就能跑普通任务：

| 用法 | 需要什么 |
|---|---|
| 普通任务、只读提问 | 主会话即可，无需任何扩展 |
| 独立审查、并行写入者、长期 owner | 包内默认：Herdr 承载的独立 Pi 会话 + pi-intercom（写入者独占 worktree）；也可在你项目 `AGENTS.md` 里映射成任何你验证过的等价后端 |
| 开 PR、查 CI | 你已认证的 forge CLI（如 `gh`） |
| 证明改动让应用真实工作 | 项目已有的驱动/verify 手段，或用 `pstack-create-verification-skill` 生成一个 |

缺哪样，对应步骤会停下来说明缺口，不自动降级为自评。这张表写给使用本包的项目；本仓库自己的开发不受它约束，不强制 Herdr。

## 自检

前两步不跑任务就能确认包已加载；第 3 步可选，用一个只读试用确认技能能被实际调用：

1. **shell 里看来源。** `pi list` 列出设置里登记的包和来源（`-e` 的临时加载不写设置，所以不会出现在这里）。
2. **看技能命令。** 新开一个 Pi 会话，或在已开的会话里 `/reload`，在输入框敲 `/skill:` 看补全，应该能看到 `pstack`、`pstack-setup` 等 23 个命令。23 个技能都已注册，但默认只有 `pstack-setup` 出现在系统提示里；其余 22 个隐藏但不禁用——`/skill:<名字>` 随时点名，流程也会按正文自行读取。
3. **可选：只读试用。** 给入口一个明确窄的只读请求，例如：`/skill:pstack 只读查看这个项目的 README 和测试配置，告诉我如何运行已有检查；不要改文件，也不要安装依赖。` 只读边界以你请求里写的约束为准。这一步验证的是「包已加载、技能能被调用」，不是完整工作流的验证——那只能在你自己的真实任务里发生。

故障短表：

| 症状 | 先看什么 |
|---|---|
| `/skill:pstack-…` 补全里没有 | 是否在装了包的那个项目里启动的 `pi`；新会话或 `/reload`；`/settings` 里 `enableSkillCommands` 是否开着；项目设置是否在该包的 `packages` 配置对象里用资源过滤清掉了技能（例如 `"skills": []`）；项目是否已信任；是否有同名技能冲突（同名时 Pi 保留先发现的那个并告警） |
| setup 写不出某个模型 | setup 只写它本会话发现到的模型。用它列出的名字，或先去 `/model`、`/login` 确认可用，不要手写模型名 |
| 某步报「独立后端缺失」 | 按包内执行策略停在那里，选一个你验证过的替代后端，或明确调整要求。主会话自评不能冒充独立结果 |

## 第一个任务

本包不接管会话：没有 SessionStart 注入，也没有自动路由 hook——这是与 Claude 版 pstack 的显式差别（那边靠启动 hook 把符合条件的任务转进 poteto-mode）。要用流程，显式载入入口：

```
/skill:pstack 检查这个项目 README 里的本地链接，只修正失效的链接；不要发布，也不要动其他内容。
```

```
/skill:pstack 这个 PR 有个隐蔽 bug，空闲时滚动每 750 毫秒漂一次。先复现，再修，再验证。
```

入口先定轻重，再路由，不会把每个任务都塞进 playbook：

- **小而明确的任务**——范围清楚、方法已知、有一个能便宜真跑的检查——直接做完，附上那个最小检查，不进 playbook。你在请求里点名要的流程或独立审查优先于这条路径，不会因为任务小被跳过。
- **只读的问题**只回答，不改文件；**只要计划**的请求停在计划，不顺手实现。
- **其余任务**匹配 `skills/pstack/playbooks/` 里的 23 个 playbook 之一，照其中的步骤走。
- 授权不因流程扩大：push、开 PR、合并、发布这类动作，仍只在你明确授权时发生。

入口是你显式载入的锚点；之后的技能由模型按正文读取，不需要你每一步手动点名。也可以跳过入口直接点名：

```
/skill:pstack-how 请求从 API handler 到数据库是怎么走的？
/skill:pstack-interrogate 审一下我的 diff。
/skill:pstack-tdd 先写失败的测试再修。
```

## 两个与上游不同的地方

**流程轻重跟着「错了有多难回头」走，不跟着 diff 大小走。** 范围明确、方法已知、能便宜真实验证的小任务，直接完成加最小检查；一两行的改动如果真带着并发、安全或未知根因，同样进完整 playbook。多模型审查、方案竞赛、PR、任务清单，是错了难回头的工作或你点名要的场合才上的。只读问题不会被路由到写代码或开 PR。

**委派是手段，不是规矩。** 普通任务可以直接做；需要独立判词或真正分开的尝试时，必须取得独立上下文。缺少执行后端就说明缺口，让操作者选择替代或调整要求，不自动降级为自评。

## 执行环境

技能里出现的「子代理」「独立会话」「驱动界面」是能力，不是工具名。落到具体工具的地方是你项目的 `AGENTS.md`。本包不自建调度器、消息总线、任务数据库，也不要求你必须装某个 subagent 扩展。

完整策略写在包内的 [`skills/pstack/references/execution.md`](skills/pstack/references/execution.md)。入口技能和会委派或替换的技能都先读它，所以你只调 `/skill:pstack-swarm` 这类单个技能时也会拿到同一套规则。要点：

- **优先级。** 当前对话里的明确请求 → 你项目 `AGENTS.md` 里的能力映射 → 包内默认。
- **包内默认。** 长期 owner、并行写入者、`swarm`、`arena`、正式独立审查：**Herdr 承载的独立 Pi 会话**（每个写入者一个会话、一个独占 worktree）+ **pi-intercom** 传话。短小的有界调查用一个 fresh context 即可。
- **独立性来自新 context，不是模型不同。** 同一个模型在新 context 里就是独立的；换个模型名但共用 context 不算。独占工作副本只对写入者强制，只读 reviewer 可以共用同一稳定快照。给 reviewer 的是需求 + 固定版本（commit / tag / frozen worktree），不预喂实现者自述。
- **判据一句话。** 该步骤的产物本身要求独立性吗？否 → 直接做，并说明；是（独立判词 / 独立 owner / 并行写入者，或一组真正分开的尝试）→ 拿到独立 context 就是要求本身，缺后端时停下让你选，不降级为自评。
- **能用不等于可以用。** 工具已安装，不代表有权委派它执行任务：仍服从当前请求、适用指令与该工具自己的授权契约。
- **Herdr 是执行方式**，不是任务拆分与汇总规则：swarm 仍按自己的技能分片汇总，arena 仍选 base 再嫁接，interrogate 仍合成判词。
- **先发现再假设。** 不因为某个技能提过某个工具就假定它存在。真正装没装、怎么用，先看过再说。
- **缺后端要说缺口。** 短调查和普通任务仍可主做；需要独立性的步骤停下来让你选一个已验证的后端，或明确调整要求。不自评冒充等价，不中途换后端留下两个地方各写一半。
- 没有调度器：**不承诺定时唤醒**。按有上限的轮询做，轮询之间给报告，或停在报告。
- 没有能驱动被测界面的工具：该步骤标 `blocked` 并说明原因，不以「编译通过」或「截图文件存在」代替行为证据。
- 没有 MCP：`pstack-why` 用 git、forge CLI 等已有来源，并明确列出查不到的部分。
- 非委派的普通小活仍可在主会话直接做，不必强上全流程。

映射表格式和填写示例见 [`AGENTS.md`](AGENTS.md)。那张表是给**使用本包的项目**用的模板；不同人的机器装的东西不一样，示例里的具体 skill 只是「这些位置该填什么」的演示，不是所有使用者都有的前提。

## 技能

20 个工作流技能加 1 个入口，加 2 个写作与验证支撑技能，共 23 个公共技能。

| 技能 | 什么时候用 |
|---|---|
| `pstack` | 入口。任何非平凡任务的默认起点。 |
| `pstack-how` | 想搞懂一个子系统怎么工作，或问「这该放哪层」。 |
| `pstack-why` | 想知道某段代码为什么长这样，数从哪来。 |
| `pstack-recall` | 开工或接着干之前，用本项目自己的记录重建现状简报。 |
| `pstack-blast-radius` | 看着很小的改动，想知道别处会被它弄坏什么。 |
| `pstack-architect` | 即将写跨函数边界的代码，先定调用方用法、类型、模块形状。 |
| `pstack-arena` | 同一个东西要 N 个并行方案，然后取长补短。 |
| `pstack-swarm` | N 个并行工人分片或赛跑，最后要一份汇总报告。 |
| `pstack-interrogate` | 有人写了个 diff，想让几个不同模型一起来找问题。 |
| `pstack-tdd` | 修 bug 且有便宜好用的本地测试路径：先写失败的测试。 |
| `pstack-bro` | 上一条回复太绕，用大白话重说一遍。 |
| `pstack-unslop` | 清理任何写作里的机器腔。 |
| `pstack-technical-writing` | 写文档、RFC、readme、PR 描述、commit message。 |
| `pstack-no-comments` | 送审前。删掉赚不回成本的注释，把约束变成结构。 |
| `pstack-typescript-best-practices` | 读写 `.ts` / `.tsx` 之前。 |
| `pstack-figure-it-out` | 没有 playbook 对得上：大迁移、多部分改造、要事后审查的活。 |
| `pstack-show-me-your-work` | 长跑或无人值守的活，要留一份可审的决策记录。 |
| `pstack-create-verification-skill` | 项目没有脚本化的方式证明应用行为。 |
| `pstack-maintain-verification-skill` | 已有 verify 技能，功能地图和真实应用对不上了。 |
| `pstack-setup` | 配置每个角色用哪个模型、多少推理预算。 |
| `pstack-reflect` | 一次长任务结束，把学到的东西落到具体技能修改上。 |
| `pstack-automate-me` | 想把你自己的工作习惯变成一个 `<你>-mode` 技能。 |
| `pstack-teach` | 想真正理解一处改动或子系统，不是要摘要。 |

## Playbook

23 个，在 `skills/pstack/playbooks/`。

| Playbook | 用途 |
|---|---|
| `investigation.md` | 只读提问。 |
| `bug-fix.md` | 复现、定根因、带运行时证据修复。 |
| `perf-issue.md` | 有测量数据的慢，对着基线改进。 |
| `hillclimb.md` | 对一个指标持续迭代改进，每次一个可测量的改动。 |
| `runtime-forensics.md` | 用插桩诊断活着的症状。产出是诊断，不是修复。 |
| `trace-forensics.md` | 诊断已经抓好的 profile、trace、spindump、堆快照。 |
| `feature.md` | 新行为或改动行为，从命名数据形状出发。 |
| `refactoring.md` | 保持行为的结构改动。 |
| `prototype.md` | 扔得掉的草稿，用来便宜地定下设计或经验性分叉。 |
| `visual-parity.md` | 两套实现的像素级等价，或样式系统迁移。 |
| `authoring-a-skill.md` | 写或改 SKILL.md。 |
| `eval.md` | 盲测一个技能或提示改动对 agent 行为的影响。 |
| `babysit.md` | 把 PR 或 PR 叠推到可合并：冲突、评论、CI。 |
| `shipping.md` | 独立验证一叠绿 PR，然后自下而上只落连续已验证的那段。 |
| `autonomous-run.md` | 长任务推到谓词满足，中途不停。 |
| `orchestrate.md` | 交给一个协调者的长期项目：多天、多 PR、多工人。 |
| `autopilot-full.md` | 一队列独立 PR 各自跑完并合并，根上验证后才许合。 |
| `autopilot-stack.md` | 一队列改动建好验好，交一叠线性 PR 给操作者落地。 |
| `session-pickup.md` | 接手别人没做完的活。 |
| `pause-safely.md` | 干净停下，让冷启动的 agent 能接上。 |
| `multi-phase-plan.md` | 跨阶段或跨 PR 的活，计划本身就是交付物。 |
| `worktree-cleanup.md` | 安全地把已合并或废弃的 worktree、旧模拟器清掉，回收磁盘。 |
| `opening-a-pr.md` | 用有序的小 commit 开一个 ready PR。其他 playbook 的最后一步，且仅在你已授权开 PR 时执行。 |

## 23 条原则

不注册成公共技能。它们是内部参考 [`skills/pstack/references/principles.md`](skills/pstack/references/principles.md)，按需读取。入口技能里的索引给出每条的适用时机。

## 测试

```bash
npm test
```

用 Node 内置测试，不装测试框架。覆盖：

- 用 Pi 真实的技能加载器（`loadSkillsFromDir`）发现本包的技能，断言数量、名字、描述、零诊断。
- 从本地路径安装：临时项目的 `.pi/settings.json` 写本包路径，用 `DefaultResourceLoader` 真实解析，确认只贡献 23 个技能、零诊断、零 extension/prompt/theme。
- 每个技能文件和嵌套 prompt 里的相对链接都能解析到真实文件。
- 带 `#anchor` 的链接指向的标题确实存在（原则锚点靠这条守住）。
- 执行策略在位：入口技能和会委派的技能都指向共享的执行参考，且共享文件随包交付。
- `/skill:<name>` 经真实的 `AgentSession._expandSkillCommand` 展开：22 个隐藏技能的参数、正文与路径断言（不调模型，不读私有会话）。
- `log.sh` helper 的行为：成功追加、表头唯一、tab/换行/CR 清洗、危险前缀转义（临时目录，测后清理）。
- 覆盖表完整：上游每个条目都有明确去向，交付的路径都真实存在，磁盘上的技能和表里声称的一致。
- 打包边界：`package.json` 的 `pi.skills`、`files`、`pi-package` 关键字，以及没有 agents 目录、没有 extension、没有 `pi.subagents` schema。
- 没有失效的工具名、陈旧的路径、硬编码的模型 ID；任何提到的可选扩展都不得被写成必需依赖。

这些是静态检查、资源发现检查和命令级行为检查（`/skill:` 命令展开、`log.sh` 真实追加），不是完整 agent workflow smoke。真实工作流的验证要你在自己项目里跑一遍：把 `skills/pstack/playbooks/` 里对得上的那个 playbook 用一次。

## 已知限制

- 未移植 `make-bot-ui`（Cursor Grok Bot webhook 与 Tailscale 专属）。
- 未移植 `automations/benny`（Cursor automation 运行时专属）。
- 原版的 `watch-pr`、`orch` store、`worktree-audit.sh` 等脚本没有移植。需要时用你项目自己的工具，或按 playbook 里的步骤做。`check-plan.mjs` 已按当前 Pi 计划模板适配并随包恢复为 `skills/pstack/scripts/check-plan.mjs`，供 `multi-phase-plan` 第 6 步做机械结构检查。
- `docs/guide/` 的上游教程没有移植。`docs/coverage.md` 是覆盖表，技能正文自带步骤。

## 许可与来源

MIT，见 [`LICENSE`](LICENSE)。上游是 Lauren Tan 的 pstack：<https://github.com/cursor/plugins/tree/main/pstack>。本仓库是它的 Pi 移植；Michael Denyer 的 Claude Code 移植 [pstack-claude](https://github.com/michael-denyer/pstack-claude) 是这次移植的参考。具体的快照与改写范围见 [`NOTICE.md`](NOTICE.md) 和 [`docs/coverage.md`](docs/coverage.md)——两边都不是逐字等价，也不承诺全平台等价。

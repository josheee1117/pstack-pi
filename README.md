# pstack-pi

把 pstack 的工程工作流移植成一个可安装的 Pi skills 包。理解、设计、实现、独立审查、真实验证、交付、恢复，全流程都有对应技能。

不是再实现一个 agent runtime。也不宣称与上游逐字等价或全平台等价。差异清单在 [`docs/coverage.md`](docs/coverage.md)。

## 装

```bash
# 本地路径，直接指向包目录
pi install /path/to/pstack-pi

# 装到当前项目而不是全局
pi install -l /path/to/pstack-pi

# 不动 settings，本次运行临时用
pi -e /path/to/pstack-pi
```

装完新开一个 Pi 会话，23 个技能会被发现。

## 用

入口是 `pstack`。给它一个任务，它匹配到 23 个 playbook 之一，然后按步骤调其他技能。

```
/skill:pstack 这个 PR 有个隐蔽 bug，空闲时滚动每 750 毫秒漂一次。先复现，再修，再验证。
```

```
/skill:pstack 我要睡了，把这叠 PR 落到 main，CI 抖了也别停。
```

也可以直接点名技能：

```
/skill:pstack-how 请求从 API handler 到数据库是怎么走的？
/skill:pstack-interrogate 审一下我的 diff。
/skill:pstack-tdd 先写失败的测试再修。
```

首次使用建议先跑 `/skill:pstack-setup`，把「哪个角色用哪个模型」写进你项目的 `AGENTS.md`。这个包不带任何模型默认值。

## 两个与上游不同的地方

**流程轻重跟着「错了有多难回头」走。** 一行改动就实现加最小真实验证，不强制多模型审查、方案竞赛、PR 或任务清单。需要独立判断、有实质设计分歧、或要长期并行时才上重流程。只读问题不会被路由到写代码或开 PR。

**委派是手段，不是规矩。** 有 subagent 机制就用来换独立性和并行度；没有就自己做并说清楚。唯一不能做的是假装独立：自评不算独立审查，主会话自己说「看着没问题」不算证据。

## 执行环境

技能里出现的「子代理」「独立会话」「驱动界面」是能力，不是工具名。落到具体工具的地方是你项目的 `AGENTS.md`。本包不自建调度器、消息总线、任务数据库，也不要求你必须装某个 subagent 扩展。

完整策略写在包内的 [`skills/pstack/references/execution.md`](skills/pstack/references/execution.md)。入口技能和会委派或替换的技能都先读它，所以你只调 `/skill:pstack-swarm` 这类单个技能时也会拿到同一套规则。要点：

- **优先级。** 当前对话里的明确请求 → 你项目 `AGENTS.md` 里的能力映射 → 包内默认。
- **包内默认。** 长期 owner、并行写入者、`swarm`、`arena`、正式独立审查：**Herdr 承载的独立 Pi 会话**（每个写入者一个会话、一个独占 worktree）+ **pi-intercom** 传话。短小的调查用一个 fresh-context 即可。
- **Herdr 是执行方式**，不是任务拆分与汇总规则：swarm 仍按自己的技能分片汇总，arena 仍选 base 再嫁接，interrogate 仍合成判词。
- **先发现再假设。** 不因为某个技能提过某个工具就假定它存在。真正装没装、怎么用，先看过再说。
- **缺后端要说缺口。** 需要独立性时停下来让你选一个已验证的后端，或调整要求；不自评冒充等价，不中途换后端留下两个地方各写一半。
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
- 覆盖表完整：上游每个条目都有明确去向，交付的路径都真实存在，磁盘上的技能和表里声称的一致。
- 打包边界：`package.json` 的 `pi.skills`、`files`、`pi-package` 关键字，以及没有 agents 目录、没有 extension、没有 `pi.subagents` schema。
- 没有失效的工具名、陈旧的路径、硬编码的模型 ID；任何提到的可选扩展都不得被写成必需依赖。

这些是静态检查和资源发现检查，不是工作流 smoke。真实工作流的验证要你在自己项目里跑一遍：把 `skills/pstack/playbooks/` 里对得上的那个 playbook 用一次。

## 已知限制

- 未移植 `make-bot-ui`（Cursor Grok Bot webhook 与 Tailscale 专属）。
- 未移植 `automations/benny`（Cursor automation 运行时专属）。
- 原版的 `watch-pr`、`orch` store、`worktree-audit.sh`、`check-plan.mjs` 等脚本没有移植。需要时用你项目自己的工具，或按 playbook 里的步骤做。
- `docs/guide/` 的上游教程没有移植。`docs/coverage.md` 是覆盖表，技能正文自带步骤。

## 许可与来源

MIT，见 [`LICENSE`](LICENSE)。上游是 Lauren Tan 的 pstack，快照和改写范围见 [`NOTICE.md`](NOTICE.md)。

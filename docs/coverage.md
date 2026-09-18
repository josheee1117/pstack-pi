# 覆盖表

上游快照：`cursor/plugins` 的 `pstack/`，`e31650eea443aaea1e84cc15d88c13f40080b275`（插件版本 0.15.2）。

「去向」列里反引号包起来的是本包内的真实路径。`未移植` 或 `未打包` 开头的行是明确不做的事，附原因。

## 公共技能（上游 24，本包 23）

上游 `make-bot-ui` 依赖 Cursor 的 Grok Bot webhook 与 Tailscale 会话密钥交接，没有可移植的行为，因此不做。其余 23 个全部交付，入口改名 `pstack`。

| 上游条目 | 类型 | 去向 | 差异 |
|---|---|---|---|
| `poteto-mode` | 公共技能 | `skills/pstack` | 改名 `pstack`。个人风格改为通用工程流程：不再强绑作者的语气与模型选择，删掉 Cursor 的 `Task`/`subagent_type`/`/loop` 绑定，改为按能力描述执行环境，并指向共享的执行与替换策略。playbook 数量保持 23。 |
| `how` | 公共技能 | `skills/pstack-how` | 保留两段式复杂度判定（简单直接解释，复杂并行探查再汇总）。子代理派发改述为能力，环境无子代理时自己按同一输出格式做。 |
| `why` | 公共技能 | `skills/pstack-why` | 保留证据分级与输出结构。MCP 发现改为「枚举本会话真实可用的来源」，允许只有 git 与 forge CLI，并要求把查不到的部分明确列为缺口。上游 7 个来源 playbook 合并为一份 `references/sources.md`。 |
| `recall` | 公共技能 | `skills/pstack-recall` | 记录来源从 Cursor 的 `agent-transcripts/` 目录改为会话自身的 `PI_SESSION_FILE` 与项目记忆，并明确只读本项目记录。 |
| `blast-radius` | 公共技能 | `skills/pstack-blast-radius` | 原样保留五级确定性阶梯与「证明那个唯一的安全事实」。 |
| `architect` | 公共技能 | `skills/pstack-architect` | 保留五阶段与「设计两次」。runner 默认模型列表删除，改为使用操作者配置或本环境真实可用的模型；同一模型跑多个 runner 是允许的，独立性来自新 context 而非模型不同。起不了新 context 时不自己画两张草图充数，按共享执行策略的缺后端规则停下。 |
| `arena` | 公共技能 | `skills/pstack-arena` | 保留六阶段与 base 选择、graft 规则。模型列表删除。并发受限时可以顺序跑，但每个候选仍是自己的 fresh context，不等于让主 context 自己生成多个候选；起不了新 context 或找不到 judge 时按共享执行策略停下，不用「自评代替 cross-judge」。 |
| `swarm` | 公共技能 | `skills/pstack-swarm` | 保留四阶段。`environment: cloud` 与 `run_in_background` 删除。并发受限时顺序跑仍是同一个 swarm，因为每个 worker 都有自己的 fresh context；在主 context 里循环冒充 N 个 worker 不是 swarm。 |
| `interrogate` | 公共技能 | `skills/pstack-interrogate` | 保留多模型对抗与 lead judgment 分类。reviewer 列表改为操作者配置或本环境可用模型，同一模型也可，独立性来自 fresh context 与对固定版本的盲审。这一步的产品就是独立判词，所以缺 reviewer 时说缺口并停下，不降级为自评。 |
| `tdd` | 公共技能 | `skills/pstack-tdd` | 原样保留，包括「不划算就别硬写测试」。 |
| `bro` | 公共技能 | `skills/pstack-bro` | 原样保留，补一句「简单不等于更含糊」。 |
| `unslop` | 公共技能 | `skills/pstack-unslop` | 规则编号保持不变（其他技能按编号引用）。仅用于写作清理；代码清理不走这个技能。 |
| `technical-writing` | 公共技能 | `skills/pstack-technical-writing` | 四层标准与来源注记保留。补上「变化句长」一节（原文只在别处暗示）。 |
| `no-comments` | 公共技能 | `skills/pstack-no-comments` | 原来派发 `Comment Sicko` 子代理，改为把同一套审查规则写成 `skills/pstack-no-comments/references/comment-reviewer-prompt.md` 交给一个干净上下文的审查会话。这一步要的就是作者没有的视角，所以缺该机制时停下等操作者选，不自己代跑后自称已完成。 |
| `typescript-best-practices` | 公共技能 | `skills/pstack-typescript-best-practices` | 原样保留，规则表与 `references/patterns.md` 例子全带。`paths` frontmatter 删除（Pi 不按路径自动触发）。 |
| `figure-it-out` | 公共技能 | `skills/pstack-figure-it-out` | 保留五阶段与「设计流程本身才是交付物」。自己决定 writer 与 fanout，所以委派前先读共享执行策略：owner 与并行写入者需要独立 context 与独占工作副本，提供不了就停下让操作者选择，不由主会话冒充多个写入者。 |
| `show-me-your-work` | 公共技能 | `skills/pstack-show-me-your-work` | TSV 格式不变。上游的 `scripts/log.sh` helper 未打包（见下），改为写明用普通文件编辑或一次 `printf` 追加，并保留公式注入防护。 |
| `create-verification-skill` | 公共技能 | `skills/pstack-create-verification-skill` | 功能地图契约与示例带全。生成目标是使用者项目的 `.pi/skills/verify-<app>/`，不是本包目录；个人位置仅在用户明确要求时使用。仍要求「没亲自跑过一次就只是草稿」。 |
| `maintain-verification-skill` | 公共技能 | `skills/pstack-maintain-verification-skill` | 源扫描波次与 live pass 保留，包括 doctor 三不变式。 |
| `setup-pstack` | 公共技能 | `skills/pstack-setup` | 作为「发现环境能力 + 记录配置」的使用指南保留。删除 `~/.cursor/rules/pstack-models.mdc` 这条硬路径与整套默认模型表；不再自动写全局默认值，写入位置默认是项目 `AGENTS.md`，且需用户选择。能力缺口报告改为与共享执行策略同向：短调查和普通任务仍直接做，需要独立性的步骤停下让你选，不再声称单模型/无机制就自动降为主会话自办。 |
| `reflect` | 公共技能 | `skills/pstack-reflect` | 三个审查视角与 synthesizer 契约保留（tooling/judgment/divergent 各一份 `references/`）。记录来源改为 `PI_SESSION_FILE`。三个 lens 各自需要没参与工作的 fresh context；起不了就停下，不自己串一遍充数。复盘对象是本次获准读取的项目会话记录；每个 reviewer 仍使用 fresh context，合成前互不读取其他 reviewer 的结论。 |
| `automate-me` | 公共技能 | `skills/pstack-automate-me` | 流程保留，删除 `create-skill` 内置技能依赖（改为引用本包的 `authoring-a-skill` playbook），挖掘范围限定本项目记录。大规模挖掘会 fanout fresh reader，因此那种分发前先读共享执行策略（它属短的有界调查）。 |
| `teach` | 公共技能 | `skills/pstack-teach` | 逐图递进、不设小测、不贴标签等要求全保留，来源改为 `pstack-how` 与 `pstack-why`。会并行跑这两个技能，所以并行前先读共享执行策略。 |
| `make-bot-ui` | 公共技能 | 未移植 | 用 webhook 唤醒 Cursor 的 Grok Bot，含 sender key 交接与 Tailscale 暴露。行为面完全依赖 Cursor 运行时，没有可移植内核。 |

## Playbook（23）

| 上游条目 | 类型 | 去向 | 差异 |
|---|---|---|---|
| `investigation` | playbook | `skills/pstack/playbooks/investigation.md` | 原样保留，补一条：环境够不到的来源要说明它留下了什么缺口。 |
| `bug-fix` | playbook | `skills/pstack/playbooks/bug-fix.md` | 六步保留。删掉默认模型与 Cursor `/loop`；长侦查改为「有唤醒机制就用，没有就按上限轮询」。 |
| `perf-issue` | playbook | `skills/pstack/playbooks/perf-issue.md` | 八个策略族保留。模型默认值删除。 |
| `hillclimb` | playbook | `skills/pstack/playbooks/hillclimb.md` | 八步保留，含停止谓词必须带尝试次数下限。 |
| `runtime-forensics` | playbook | `skills/pstack/playbooks/runtime-forensics.md` | 原样保留，`control-ui` 的 CDP 具体手段改为「按运行时选 profiler」。 |
| `trace-forensics` | playbook | `skills/pstack/playbooks/trace-forensics.md` | 保留「先变成可查询形状再读」。 |
| `feature` | playbook | `skills/pstack/playbooks/feature.md` | 八步保留，含四项吞吐检查点与「不得写 skip-with-reason 逃逸」。委派改为条件式：有独立写入者就用，没有就自己写并说明。 |
| `refactoring` | playbook | `skills/pstack/playbooks/refactoring.md` | 八步保留，含先钉行为契约、同波迁移并删旧 API。 |
| `prototype` | playbook | `skills/pstack/playbooks/prototype.md` | 原样保留（此处不适用懒散原则，速度优先）。 |
| `visual-parity` | playbook | `skills/pstack/playbooks/visual-parity.md` | 基线优先与反捷径条款保留。 |
| `authoring-a-skill` | playbook | `skills/pstack/playbooks/authoring-a-skill.md` | 原来指向 Cursor 内置 `create-skill`，改为 Pi 的 SKILL.md 格式与校验项。 |
| `eval` | playbook | `skills/pstack/playbooks/eval.md` | 盲测非协商项全保留。`agent-transcripts` 跨项目读取禁令保留，路径改成本 eval 自己的记录。 |
| `babysit` | playbook | `skills/pstack/playbooks/babysit.md` | 九步保留。删掉 `watch-pr` 脚本、Graphite、Origin 分支与 `/loop`，改为 forge CLI 状态 + 有上限的观望；栈拓扑只允许一个写者。 |
| `shipping` | playbook | `skills/pstack/playbooks/shipping.md` | 九步保留，含 patch-id 重验与「只落自下而上的连续已验证段」。补明 head 保护不覆盖 base 变化，且不声称等价于专门的落地工具。 |
| `autonomous-run` | playbook | `skills/pstack/playbooks/autonomous-run.md` | 六步保留。`/loop` 删除，改为「唤醒机制要么是真实事件，要么是有上限的轮询；没有调度器就不要承诺定时」。 |
| `orchestrate` | playbook | `skills/pstack/playbooks/orchestrate.md` | 角色、brief 模板、drain 纪律、栈安全、账本全部保留。`orch.ts` CLI 与 `bun` 依赖删除，状态落在可读文件；30 分钟 tick 改为「必须有真实定时或你自己持有的轮询，否则就说没有并改在自然边界审查」。起不了独立会话时不再自动降为由协调者自己做，而是停下让操作者选后端或明确缩小规模。 |
| `autopilot-full` | playbook | `skills/pstack/playbooks/autopilot-full.md` | 七步保留，含「每个 merge-ready head 都要根上独立验证」与 owner 不得单独合并。云 agent 与 `/goal` 依赖删除，改为会话目标与真实唤醒。 |
| `autopilot-stack` | playbook | `skills/pstack/playbooks/autopilot-stack.md` | 八步保留，含 append-only、单一拓扑写者、patch-id 判据。 |
| `session-pickup` | playbook | `skills/pstack/playbooks/session-pickup.md` | 五步保留。记录来源改为 `PI_SESSION_FILE` 或明确授权的会话路径，且只读本项目。 |
| `pause-safely` | playbook | `skills/pstack/playbooks/pause-safely.md` | 四步保留，恢复说明写在临时文件里，不新增扫描器。 |
| `multi-phase-plan` | playbook | `skills/pstack/playbooks/multi-phase-plan.md` | 骨架与验证规则全保留。`check-plan.mjs` 删除，改为「逐框检查证据与命令」的手工但可复核的检查；模型名与 `control-*` 技能改为环境无关表述。 |
| `worktree-cleanup` | playbook | `skills/pstack/playbooks/worktree-cleanup.md` | 安全闸保留（未提交改动要出示 diff 再决定；在用的一律不动）。`worktree-audit.sh` 删除，改为直接列出的 git 命令；模拟器命令改为按平台条件执行。 |
| `opening-a-pr` | playbook | `skills/pstack/playbooks/opening-a-pr.md` | 章法、Conventional Commits、body 结构全保留。Origin/GitGraph 分支删除；`/deslop` 改为 `pstack-unslop` 加项目自己的 lint。补明「只有用户授权开 PR 才执行」。 |

## 原则（23）

不注册为公共技能。全部落到一份按需读取的内部参考，锚点可被其他技能引用。

| 上游条目 | 类型 | 去向 | 差异 |
|---|---|---|---|
| `principle-laziness-protocol` | 原则 | `skills/pstack/references/principles.md#laziness-protocol` | 正文保留。 |
| `principle-foundational-thinking` | 原则 | `skills/pstack/references/principles.md#foundational-thinking` | 正文保留。 |
| `principle-redesign-from-first-principles` | 原则 | `skills/pstack/references/principles.md#redesign-from-first-principles` | 正文保留。 |
| `principle-attack-the-premise` | 原则 | `skills/pstack/references/principles.md#attack-the-premise` | 正文保留，含写前提、做普查、去不对称。 |
| `principle-subtract-before-you-add` | 原则 | `skills/pstack/references/principles.md#subtract-before-you-add` | 正文保留。 |
| `principle-minimize-reader-load` | 原则 | `skills/pstack/references/principles.md#minimize-reader-load` | 正文保留，含两条轴与 30 秒测试。 |
| `principle-outcome-oriented-execution` | 原则 | `skills/pstack/references/principles.md#outcome-oriented-execution` | 正文保留。 |
| `principle-experience-first` | 原则 | `skills/pstack/references/principles.md#experience-first` | 正文保留，含「谁是用的人」。 |
| `principle-exhaust-the-design-space` | 原则 | `skills/pstack/references/principles.md#exhaust-the-design-space` | 正文保留。 |
| `principle-build-the-lever` | 原则 | `skills/pstack/references/principles.md#build-the-lever` | 正文保留，含「引用了它就必须产出文件」。 |
| `principle-model-the-domain` | 原则 | `skills/pstack/references/principles.md#model-the-domain` | 正文保留，含结构清单。 |
| `principle-boundary-discipline` | 原则 | `skills/pstack/references/principles.md#boundary-discipline` | 正文保留。 |
| `principle-type-system-discipline` | 原则 | `skills/pstack/references/principles.md#type-system-discipline` | 正文保留，语言例子通用化。 |
| `principle-make-operations-idempotent` | 原则 | `skills/pstack/references/principles.md#make-operations-idempotent` | 正文保留，含两问测试。 |
| `principle-migrate-callers-then-delete-legacy-apis` | 原则 | `skills/pstack/references/principles.md#migrate-callers-then-delete-legacy-apis` | 正文保留。 |
| `principle-separate-before-serializing-shared-state` | 原则 | `skills/pstack/references/principles.md#separate-before-serializing-shared-state` | 正文保留，含「锁是味道不是答案」。 |
| `principle-prove-it-works` | 原则 | `skills/pstack/references/principles.md#prove-it-works` | 正文保留，含「能写脚本就写脚本」。 |
| `principle-fix-root-causes` | 原则 | `skills/pstack/references/principles.md#fix-root-causes` | 正文保留，含「重启后失败先怀疑状态」。 |
| `principle-sequence-verifiable-units` | 原则 | `skills/pstack/references/principles.md#sequence-verifiable-units` | 正文保留，执行与交付两半都在。 |
| `principle-test-behavior-not-implementation` | 原则 | `skills/pstack/references/principles.md#test-behavior-not-implementation` | 正文保留，含「全 undefined 仍通过」的五种形状。 |
| `principle-guard-the-context-window` | 原则 | `skills/pstack/references/principles.md#guard-the-context-window` | 正文保留。 |
| `principle-never-block-on-the-human` | 原则 | `skills/pstack/references/principles.md#never-block-on-the-human` | 正文保留，边界改为「不可逆操作仍需授权」。 |
| `principle-encode-lessons-in-structure` | 原则 | `skills/pstack/references/principles.md#encode-lessons-in-structure` | 正文保留，含机制强弱排序。 |

## 其他上游文件

| 上游条目 | 类型 | 去向 | 差异 |
|---|---|---|---|
| `skills/poteto-mode/references/bugbot-triage.md` | 参考文件 | `skills/pstack/references/bugbot-triage.md` | 判定规则与已记录的 skip 模式保留。删掉特定 PR 的历史注记，改为可复用的模式描述，并补上「过窄的错误条件不该放宽」这一条。 |
| `skills/show-me-your-work/references/decision-log-template.tsv` | 参考文件 | `skills/pstack-show-me-your-work/references/decision-log-template.tsv` | 表头原样。 |
| `skills/why/references/*` | 参考文件 | `skills/pstack-why/references/` | 七个来源合并为 `sources.md`；`epistemics.md` 与 `code-archaeology.md` 独立保留；investigator 与 synthesizer 提示词保留。 |
| `skills/how/references/*` | 参考文件 | `skills/pstack-how/references/` | explorer 与 explainer 提示词保留。 |
| `skills/interrogate/references/*` | 参考文件 | `skills/pstack-interrogate/references/` | rubric、code-quality、lead-judgment、reviewer-prompt 四份全保留。 |
| `skills/reflect/references/*` | 参考文件 | `skills/pstack-reflect/references/` | 三个视角加 synthesizer，共四份保留，路径约定改为 Pi。 |
| `skills/architect/references/*` | 参考文件 | `skills/pstack-architect/references/` | runner-prompt、rationale-template、design-red-flags 三份保留。 |
| `skills/create-verification-skill/references/feature-map-example/*` | 参考文件 | `skills/pstack-create-verification-skill/references/feature-map-example/` | README 加两个功能文件全保留，作为地图形状的范例。 |
| `skills/typescript-best-practices/references/patterns.md` | 参考文件 | `skills/pstack-typescript-best-practices/references/patterns.md` | 例子保留；只在语言层面补充通用原则的指向。 |
| `agents/poteto-agent.md` | 未打包 | 未移植 | 它的作用是让子代理读完整 `poteto-mode`。本包入口技能自己说明「引用某条原则前必须先读」。 |
| `agents/comment-sicko.md` | 未打包 | 未移植 | 其审查规则改写为 `skills/pstack-no-comments/references/comment-reviewer-prompt.md`，不再注册成一个具名代理。 |
| `automations/benny/**` | 未移植 | 未移植 | 依赖 Cursor automation 运行时（slack triage、云 worker、`control-*` 驱动）。工作流内核已由 `bug-fix`、`babysit`、`create-verification-skill` 与 `maintain-verification-skill` 覆盖。 |
| `skills/poteto-mode/scripts/watch-pr/**` | 未打包 | 未打包 | GitHub 专用的 PR 状态守望器。改为用 forge CLI 直读状态，不再打包一个只服务单一 forge 的轮询工具。 |
| `skills/poteto-mode/scripts/orch/**` | 未打包 | 未打包 | 一套 orch 状态存储 CLI。契约禁止新造第二套 orchestration store，改为可读文件加写者归属规则。 |
| `skills/poteto-mode/scripts/worktree-audit.sh` | 未打包 | 未打包 | 清理 playbook 里要做的判断（大小、年龄、合并状态、未提交、是否有 chat 动过）改为直接给出的 git 命令与人工闸门。 |
| `skills/poteto-mode/scripts/check-plan.mjs` | 未打包 | 未打包 | 只校验一份计划文件的格式。改为逐框检查证据与命令，不引入一个为单文件格式服务的脚本。 |
| `skills/show-me-your-work/scripts/log.sh` | 未打包 | 未打包 | 三行 shell 的追加与转义。技能正文写明做法与注意事项即可。 |
| `skills/poteto-mode/scripts/bootstrap.ts`、`bun.lock`、`package.json`、`tsconfig.json` | 未打包 | 未打包 | 上游脚本的构建配置，本包不引入 bun 与 TS 构建链。 |
| `docs/guide/**`、`assets/logo.png`、`.cursor-plugin/plugin.json`、`.gitignore` | 未打包 | 未打包 | 上游教程与 Cursor 插件清单。安装与用法写在 `README.md`，包清单是 `package.json`。 |

## 上游没有、本包新增

| 条目 | 类型 | 去向 | 差异 |
|---|---|---|---|
| 执行与替换策略 | 参考文件 | `skills/pstack/references/execution.md` | 原版把执行方式埋在 `poteto-mode` 正文与各处 skill 里，且绑到 Cursor 的 Task 工具。本包抽成一份按需读取的共享参考：三级优先级（当前请求 → 使用者项目映射 → 包内默认），包内默认是 Herdr 承载独立 Pi 会话 + pi-intercom + 独占 worktree（短调查可 fresh subagent），以及独立性规则、发现先行、缺后端时如何停下。入口及会委派/替换的技能都先读它，因此单独调一个 `/skill:` 也会拿到策略，不依赖 `AGENTS.md` 示例被加载。 |
| 能力映射约定 | 参考文件 | `AGENTS.md` | 原版把能力直接绑到具体工具。本包把「用哪个工具实现某个能力」外置成项目里的 Markdown 表：优先级是当前明确请求、然后项目映射、然后包内默认路径。替换实现不得删除原任务的产物、证据与独立性要求。表里的示例只是格式演示，不声称所有使用者都装了同样的 skill。 |
| 覆盖表 | 参考文件 | `docs/coverage.md` | 本文件。 |
| 测试 | 测试 | `tests/` | Node 内置测试，覆盖技能发现、本地安装解析、相对链接与锚点、执行策略在位、覆盖表完整性和打包边界。 |

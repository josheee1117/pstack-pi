# 结构

## 目录

```
skills/            上游技能原文（目录名和上游一致），只改了技能名和中文描述
  poteto-mode/     入口技能，注册名 pstack；playbooks/ 是 23 个流程
  principle-*/     23 条原则
agents/            上游的两个子代理说明（poteto-agent、comment-sicko），供对照说明引用
adapter/
  overrides.md     行为补丁，优先级高于上游原文
  platform.md      对照说明：Cursor 的工具、路径、模型在 Pi 上是什么
  notes/           按需读取的补充说明：会话记录、云端 agent、浏览器、数据源
extensions/pstack.js   唯一的 extension，负责把上面的东西放进系统提示
tools/sync-upstream.mjs  同步脚本，见 docs/sync.md
upstream.json      同步规则：从哪拉、删什么、怎么改名
upstream.lock      当前基于的上游 commit
```

## 技能名

目录名保持上游原样，这样同步时路径对得上。注册给 Pi 的名字统一加 `pstack-` 前缀，你在 `/skill:` 里敲的是这个名字。这样做的原因是 Pi 在重名时保留先找到的那个，而包排在所有用户技能和项目技能之后，`how`、`why`、`teach` 这类通用名很容易被别人的同名技能盖掉。

三个例外写在 `upstream.json` 的 `rename` 里：入口 `poteto-mode` 叫 `pstack`，`setup-pstack` 叫 `pstack-setup`，`teach` 叫 `pstack-teach-me`。

上游正文里互相引用时写的是上游名字（比如"the **how** skill"）。对照说明告诉模型按目录去读文件，不走注册名，所以改名不影响流程内部的跳转。

## extension 往系统提示里放什么

三段，都用 Pi 的系统提示段落（sections）注入。Pi 每轮只发变化的段，没变的不重发，关掉的段会被清掉。

| 段 | 内容 | 什么时候有 | 大小 |
|---|---|---|---|
| `prose_rules` | 写作规则：说人话、先说结论、不用 AI 腔 | 每一轮 | 约 2.4k 字符 |
| `pstack_adapter` | `overrides.md` + `platform.md`，路径已换成本机真实路径 | 会话第一次用到 pstack 之后 | 约 6.8k 字符 |
| `pstack_mode` | 模式提醒：新任务匹配流程就套用入口技能 | `/pstack` 模式开着时 | 约 0.5k 字符 |

"第一次用到 pstack"包括三种情况：
- 输入了任意 `/skill:pstack` 或 `/skill:pstack-*` 命令；
- 开了 `/pstack` 模式；
- 模型自己读了本包 `skills/` 下的文件，比如子代理、或者顺着引用读过去。

前两种从这一轮就有。第三种发生在一轮中间，系统提示要到下一轮才更新，所以 extension 把适配层直接附在那次读取的结果后面，让模型当场看到。

两个开关（适配层、模式）都记在会话记录里，`--continue` 或 `--resume` 回到同一个会话时会恢复。

为什么不把入口技能整份常驻：它有 19 KB，而大部分对话用不上。模型在需要时读一次，读过的内容留在上下文里，不会重复读。

## 适配层为什么放在技能之外

上游的技能是为 Cursor 写的，里面到处是 Cursor 的工具名（`Task`、`subagent_type`）、路径（`~/.cursor/...`）和模型名。如果逐个改正文，每次上游更新都得重改一遍。现在正文不动，由一份对照说明告诉模型"看到 X 就用 Pi 的 Y"，上游再怎么改，只要不引入新的 Cursor 说法，对照说明就不用动。同步脚本会报出新出现的 Cursor 说法，提醒你补。

行为补丁同理：它写的是"不管哪个技能怎么说，都按这几条来"，所以对上游新增的技能也自动生效。

## 独立性

有些步骤的产物本身就是独立结论：审查者的判词、并行工作者的结果、验证者的签字。这些步骤需要一个没参与过工作的新上下文。对照说明规定：
- 用 pi-subagents 的 `delegate` 或 `scout`，并显式要求新上下文（`context: "fresh"`）；
- 不能用 `worker`，它默认会继承父会话的整段对话；
- 连子代理都起不了时，这一步停下并说明缺口，不能由主会话自己审一遍冒充独立。

长期存在的工作者（上游的云端 agent）用 Herdr 起独立的 Pi 会话，见 `adapter/notes/cloud-agents.md`。

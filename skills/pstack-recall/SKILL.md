---
name: pstack-recall
disable-model-invocation: true
description: "恢复工作上下文：仅从本项目的会话记录、长期记忆、当前 git 与 PR 状态中重建主题现状，给出简短交接说明。适用于开工、接着干、回顾最近工作或查找上次停在哪里。"
---

# Recall

**Before starting or resuming work, rebuild the user's recent working context and hand back a tight capsule of where things stand and what to do next.**

Keep it tight and on topic. Read only what the in-scope threads need, then stop.

Step 3 can fan out to fresh-context readers. Read [`../pstack/references/execution.md`](../pstack/references/execution.md) when you do: a bounded read is a short investigation, so any fresh-context mechanism the environment provides is enough, and when there is none you search directly and say so.

Context lives in two places. The **project record** holds what was done and decided here: this project's session records and its long-term memory. The **shared record** holds what happened around the same code under other names: the symptoms users keep reporting, the fixes that shipped and got reverted, the errors still firing. That second record is what `pstack-why` searches across source control, the issue tracker, chat, documents, and error tracking. A feature with a long bug tail keeps most of its story there, so do not reconstruct it from session records alone.

**Read only this project's records.** Under Pi, the current session's own record is named by `PI_SESSION_FILE`, and the other records for this project live in the same directory. Do not read other projects' private sessions. If a record is unavailable, say so.

1. **Classify, then route.** One specific prior session to resume is [session-pickup](../pstack/playbooks/session-pickup.md) in the `pstack` playbook set, not this. Turning habits into a durable skill is `pstack-automate-me`. This skill loads working context across recent sessions before you act. If the user already handed you a full state capsule (paths, branch, the change), use it and skip the mining.
2. **Lock the scope before searching.** Pin the window ("recent" is a real range, default the last seven days), the topic if named, and the project. State the scope back. Never quietly turn "all" into "recent N".
3. **Sweep this project's own records.** Search the project's long-term memory first, then the session records for the window. Order candidates by real modification time, not by filename. Search the topic, then read only the matching records and only their relevant regions. Skip the current session and obvious noise such as subagent and test runs. For a large corpus, fan out to fresh-context readers and keep only their findings ([guard-the-context-window](../pstack/references/principles.md#guard-the-context-window)). Each finding cites the record it came from. For one or two sessions, search directly.
4. **Sweep the shared record whenever the topic names a feature, file, subsystem, area, or bug.** This is the default, not a judgment call, and "my work on X" does not exempt it. Hand it to `pstack-why`'s source investigators, but steer the question from "why was this built this way" to "what is the current state, what was tried and did not hold, and what are users still reporting". Reuse its per-source recipes, run them in parallel with the record sweep, and keep its posture: one investigator per source, null results are findings, an unavailable source is named. Skip this step only for pure activity recall with no named target, where the project record and live state are the whole answer.
5. **Verify against live state.** Take the PRs, branches, and tickets the sweep surfaced and check them with git and the forge CLI. When the answer hinges on what an agent actually did, read the full record, not a trimmed copy.
6. **Write the brief** to the contract below. Group by thread. Stay on the named topic.

## Output contract

Lead with the capsule, then the thread status, then the problems, then the next move. Deeper detail goes below or gets cut.

- **Capsule.** At most five bullets. What this work is and where it stands overall.
- **Threads.** One line each, prefixed with exactly one status tag: `[merged #N]`, `[open PR #N]`, `[in flight <branch>]`, `[verified, uncommitted]`, `[reverted #N]`, or `[planned, not started]`. A thread with no tag is not done, so tag it.
- **Problems.** At most five recurring ones, including the symptoms users keep reporting and any fix that shipped and was reverted, so the next attempt starts where the last one failed.
- **Next move.** The single most useful next action, concrete.

An adjacent feature or ticket stays out unless it blocks this one. When the capsule and thread lines outgrow a screen, cut detail before cutting threads. Write the brief through `pstack-unslop`, cite findings by their source (session record, memory entry, PR number, ticket id), and strip private context before any public output.

**Reply.** The brief, to the contract above.

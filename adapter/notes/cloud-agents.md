# Cloud agents on Pi

Upstream runs workers, PR owners, and verifiers as Cursor cloud agents: a fresh VM per agent that outlives the chat. On Pi, each one is a background pi-subagents child launched as platform.md's Subagents section describes. A writer gets its own git worktree. A child ends when its task ends, and its result reaches only a running parent session.

## Mapping

| Upstream | Pi |
|---|---|
| swarm worker, `environment: "cloud"` | one async `delegate` per worker, each in its own worktree |
| `cloud_base_branch` | the `<base>` of `git worktree add` |
| autopilot or orchestrate PR owner | one async `delegate` per round in the PR's worktree. The role outlives the child: a fresh child takes the next round with the consolidated brief |
| shipping, autopilot, or orchestrate verifier | a fresh `scout` with `cwd` set to a worktree at the PR head |
| figure-it-out owner | this session. No child stays alive between rounds |
| Cursor dashboard | `/subagents-fleet` for the user, `subagent({ action: "status" })` for you |

## Limits to state

- No worker outlives this session's attention. A child that finishes while this session is closed keeps its work but nobody receives its result. Before stepping away, collect started work or record the run ids in the decision trail. After a restart, check them with `subagent({ action: "status", id })`.
- No worker wakes itself. An overnight program advances only while this session runs it, through `/loop` or pi-goal per platform.md. Without either, make bounded progress and say that the program stops when the session does.
- Pass each child the package's absolute skill paths, the applicable overrides, the selected model, the fixed input revision, the evidence and output paths, and the budget. Require the promised evidence before accepting completion.
- A project's `AGENTS.md` may map long-lived workers to another backend, such as Herdr. Follow that mapping and its boundaries instead of this note.

Without the `subagent` tool, a step that needs parallel owners or an independent verifier stops and names the gap. Do not play several workers in one context.

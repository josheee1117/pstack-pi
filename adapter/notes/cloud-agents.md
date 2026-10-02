# Cloud agents on Pi

Upstream runs workers, PR owners, and verifiers as Cursor cloud agents: a fresh VM per agent that outlives the chat. On Pi, use Herdr when it is installed, pi-subagents otherwise. When neither fits the need, stop and name the gap.

## Herdr: one Pi session per worker

Check first:
- `command -v herdr` succeeds.
- `herdr session list --json` shows the session to use. If more than one exists and the user named none, ask which.

Herdr is the preferred backend for these workflows, not automatic authorization. Read its installed skill/command help, confirm the exact session and repository, and obtain any approval required by that host before creating a bounded set of worker resources. An explicit fleet request may cover the named topology, but not unrelated sessions. Close only what you created after preserving its work. Never run `herdr server stop`, reuse an existing pane, or use `--current`. Every command carries `--session <S>`.

Start a worker:

```bash
herdr --session <S> worktree create --cwd <repo> --branch pstack/<name> --base <ref> --label <name> --no-focus
# result: .result.root_pane.pane_id, .result.workspace.workspace_id, .result.worktree.path
herdr --session <S> agent start <name> --kind pi --pane <root_pane_id> -- --name <name>
herdr --session <S> agent prompt <name> "<brief>"
```

Drive it:
- Wait: `herdr --session <S> agent wait <name> --timeout <ms>` returns at `idle`, `done`, or `blocked`. Always pass a timeout.
- Read: `herdr --session <S> agent read <name> --source recent-unwrapped --lines 120`, or `agent get <name>`.
- Follow up: `herdr --session <S> agent prompt <name> "<message>"`. It refuses with `agent_blocked` while the worker sits at an approval dialog. Read the pane and resolve that first.
- Stuck: a `timeout` from `agent wait`, `agent_prompt_stalled` after a prompt, or status `blocked` or `unknown`. `unknown` does not prove completion.
- Messages: with pi-intercom installed, the worker reports with `intercom ask` to the coordinator's session name. The coordinator uses `intercom send` and `intercom reply`. The `pi --name` given at start is the worker's address.

Tear down, only what you created:

```bash
herdr --session <S> agent get <name>        # confirm idle
herdr --session <S> worktree remove --workspace <workspace_id>
git -C <repo> branch -d pstack/<name>       # remove keeps the branch
```

`worktree remove` refuses a dirty worktree. Preserve the diff and untracked files first. Do not push or force-remove merely to make cleanup succeed; obtain explicit approval for either. Inspect branch/worktree ownership and work retention before removing anything.

Pass each worker the package's absolute skill paths, applicable operator overrides, selected model, fixed input revision, evidence/output paths, and budget. Verify that Pi and pstack are loaded in that worker: a project-local package or trust decision does not automatically carry into every new worktree. Herdr's `idle` status means it is waiting, not that the requested task passed. Require the promised evidence before accepting completion.

## Mapping

| Upstream | Herdr | pi-subagents fallback |
|---|---|---|
| swarm worker, `environment: "cloud"` | one worktree and one Pi agent per worker; `agent wait` each | `runs.all([...])` in a `workflowScript`, each item `worktree: true`, `context: "fresh"` |
| `cloud_base_branch` | `worktree create --base <ref>` | `baseRef` (named refs only, clean checkout) |
| autopilot PR owner | long-lived pane; the owner uses gh and pushes only as authorized; reports over intercom | bounded async `delegate` with exported diff/evidence before exit; not a durable owner |
| shipping or autopilot verifier | a separate fresh pane per PR, at the PR head | `runs.run` with `baseRef: refs/heads/<pr-branch>`, `context: "fresh"` |
| orchestrate worker or verifier | a pane per unit, state tracked by branch and PR | workflow lanes |
| figure-it-out owner | persistent pane plus intercom | none that is durable; say so |
| Cursor dashboard | `agent list`, `agent get` | `subagent({ action: "status" })` |

pi-subagents limits to state when you use the fallback:
- Worktree retention, timeouts, nesting and parent-lifetime behavior depend on the installed version. Inspect the backend's handoff/patch before cleanup. A durable PR owner must not silently become a temporary child.
- If a named base ref is required, create/resolve it only within the authorized repository. Verify its exact SHA before starting each writer.
- Missing Herdr is not permission to silently switch execution tools. Offer the bounded fallback only when it preserves the requested product and the host allows it; otherwise stop and name the missing capability.

With neither Herdr nor pi-subagents, a step that needs parallel owners or an independent verifier stops and names the gap. Do not play several workers in one context.

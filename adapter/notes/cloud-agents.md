# Cloud agents on Pi

Upstream runs workers, PR owners, and verifiers as Cursor cloud agents: a fresh VM per agent that outlives the chat. On Pi, use Herdr when it is installed, pi-subagents otherwise. When neither fits the need, stop and name the gap.

## Herdr: one Pi session per worker

Check first:
- `command -v herdr` succeeds.
- `herdr session list --json` shows the session to use. If more than one exists and the user named none, ask which.

Running swarm, autopilot-full, autopilot-stack, shipping, orchestrate, or figure-it-out with Herdr available authorizes this, inside one verified session and this repository only: create one worktree workspace and one Pi agent per worker. Close only what you created. Never run `herdr server stop`, reuse an existing pane, or use `--current`. Every command carries `--session <S>`.

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

`worktree remove` refuses a dirty worktree. Push or save the work first, and use `--force` only after that.

## Mapping

| Upstream | Herdr | pi-subagents fallback |
|---|---|---|
| swarm worker, `environment: "cloud"` | one worktree and one Pi agent per worker; `agent wait` each | `runs.all([...])` in a `workflowScript`, each item `worktree: true`, `context: "fresh"` |
| `cloud_base_branch` | `worktree create --base <ref>` | `baseRef` (named refs only, clean checkout) |
| autopilot PR owner | long-lived pane; the owner pushes and runs `gh`; reports over intercom | async `delegate` that pushes before it exits; `resume` for later turns; set `timeoutMs`, the default cap is 30 minutes |
| shipping or autopilot verifier | a separate fresh pane per PR, at the PR head | `runs.run` with `baseRef: refs/heads/<pr-branch>`, `context: "fresh"` |
| orchestrate worker or verifier | a pane per unit, state tracked by branch and PR | workflow lanes |
| figure-it-out owner | persistent pane plus intercom | none that is durable; say so |
| Cursor dashboard | `agent list`, `agent get` | `subagent({ action: "status" })` |

pi-subagents limits to state when you use the fallback:
- Its worktrees are removed when the run ends, after it captures a patch. A worker that must own a branch or PR pushes before it exits.
- Runs end with the parent session.
- Nesting stops at two levels.
- `baseRef` rejects raw SHAs and expressions like `HEAD~1`.

With neither Herdr nor pi-subagents, a step that needs parallel owners or an independent verifier stops and names the gap. Do not play several workers in one context.

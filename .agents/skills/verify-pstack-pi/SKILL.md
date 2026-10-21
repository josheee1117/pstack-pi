---
name: verify-pstack-pi
description: "Drive pstack-pi in a real Pi TUI the way a user does, and keep the proof. Use when a change to the /pstack command, the status bar, or the plan widget needs evidence from the interactive app rather than npm test."
---

# Verify pstack-pi

pstack-pi is a Pi package. The user installs it with `pi install -l`, starts `pi` in a project, and types `/pstack`, `/pstack status`, `/pstack off`, and `/skill:pstack-*`. This skill launches that TUI in tmux, types those commands, and saves the screen.

The surface is the Pi TUI. `pi -p` and `pi --mode rpc` are not a substitute: they do not render the status bar or the plan widget. The package also ships a Node CLI, `node adapter/worktree-audit.mjs`, which this skill does not drive.

Verified against Pi 1.3.0 (`/opt/homebrew/bin/pi`), tmux 3.7b, on macOS. The README names Pi 1.1.0. `pi --version` reported 1.2.0 earlier in the same session and 1.3.0 by the time the proof run started, so record the version doctor prints. Re-run this skill after a Pi upgrade. A user's `~/.agents/skills/` can print a `[Skill conflicts]` banner at startup. That banner is not a failure.

## Launch

Run the helper from the repo root. It creates a throwaway run under `/tmp/verify-pstack-pi/`, copies only the `cpa` provider into that run's agent dir, installs this repo into a throwaway project, and starts Pi in a new tmux session.

```bash
.agents/skills/verify-pstack-pi/scripts/drive.sh launch
```

The command prints the run directory, such as `/tmp/verify-pstack-pi/run-Ab12`. Every later command uses the newest run that still has a live tmux session (else the most recently modified run), or `VERIFY_PSTACK_RUN=<that directory>` when more than one run exists.

Ready means the footer shows `deepseek-flash-latest`. The helper waits for that string. A process that merely stays alive is not ready.

What launch does, so a failed run can be repeated by hand:

1. `mkdir` a run with `agent/`, `project/`, and `evidence/`.
2. Copy `providers.cpa` from `~/.pi/agent/models.json` into `<run>/agent/models.json`. Write `<run>/agent/settings.json` with `defaultProvider: cpa`, `defaultModel: deepseek-flash-latest`, `defaultThinkingLevel: off`, `quietStartup: true`. Copy nothing else. Do not copy `sessions/`, `auth.json`, or `trust.json`.
3. `cd <run>/project && PI_CODING_AGENT_DIR=<run>/agent pi install -l <repo> --approve`. Then `pi list --approve` lists the repo under Project packages.
4. `tmux new-session -d -s <session> -x 140 -y 44 -c <run>/project` with `PI_CODING_AGENT_DIR=<run>/agent` and `exec pi --approve --model cpa/deepseek-flash-latest --thinking off`. The session name is the run directory's basename.

`<repo>` is this checkout. `--approve` trusts the throwaway project for that one process and does not write `~/.pi/agent/trust.json`.

Two runs can exist at once. Each has its own tmux session, agent dir, and project. Never point `PI_CODING_AGENT_DIR` at `~/.pi/agent`, and never install into a real project.

## Doctor

```bash
.agents/skills/verify-pstack-pi/scripts/drive.sh doctor
```

Doctor checks four things and prints `doctor: ok`.

- The tmux session exists.
- Its pane pid is alive.
- The live screen shows `deepseek-flash-latest`.
- The live screen does not say `This project is not trusted`.

It also prints `pi --version`. The keystrokes below were checked on 1.3.0. A different version means they are unverified. Stop and re-check them against that version.

## Drive

Type a slash command with literal keys, then Enter. Do not paste a multiline string. Pi opens a menu on `/` and runs the command on Enter.

```bash
tmux send-keys -t <session> -l -- '/pstack status'
tmux send-keys -t <session> Enter
```

`send-keys -l` types the text. A plain `send-keys "/pstack status"` also types it, but `-l` keeps keys such as `;` from being read as tmux syntax.

The menu filters as you type. `Tab` writes the highlighted entry into the editor and closes the menu. A second `Enter` runs it. `Escape` closes the menu without running anything.

Read the screen with:

```bash
tmux capture-pane -t <session> -p -S -200 -e | sed $'s/\x1b\\[[0-9;?]*[A-Za-z]//g'
```

The helper wraps these steps. Drive one feature:

```bash
.agents/skills/verify-pstack-pi/scripts/drive.sh drive pstack-status
.agents/skills/verify-pstack-pi/scripts/drive.sh drive pstack-task
.agents/skills/verify-pstack-pi/scripts/drive.sh drive slash-menu
```

`pstack-status` needs no model call. `pstack-task` calls `cpa/deepseek-flash-latest` with `/pstack 只回复 pstack-task-ok` and expects a reply line that is exactly `pstack-task-ok`. `slash-menu` proves the command is registered in the menu, then runs it.

Notifications print as a line in the transcript, indented one column in the capture (` pstack mode on.`). The status bar is the footer line `pstack: mode on`. It disappears when the mode is off. There is no `pstack: mode off` line.

## Evidence

Proof lives in `<run>/evidence/`. The helper writes `status-before.txt`, `status-on.txt` and `status-after.txt` for the status feature, `task.txt` plus `task-off.txt` for the task feature, and `menu-open.txt`, `menu.txt` plus `menu-off.txt` for the menu feature. Pi shows only the latest notification and leaves no tmux scrollback, so a capture is only the live screen and each state that matters gets its own capture.

A proof shows both. For the status feature that is `status-on.txt` with the notify text `pstack mode on.` and the footer `pstack: mode on`, then `status-after.txt` with `pstack mode off.` and that footer gone. A transcript that shows only the final off state is not proof.

The feature id is the file name. The entry point is the typed command inside the file.

## Cleanup

```bash
.agents/skills/verify-pstack-pi/scripts/drive.sh cleanup
```

Cleanup kills the tmux session it started. If the pane pid is still alive after that, it sends `SIGTERM` and then `SIGKILL` to that pid only. It then deletes `<run>/project` and `<run>/agent`. It leaves `<run>/evidence/`.

Do not `killall`, `pkill pi`, or `tmux kill-server`. Those match processes this run did not start.

After cleanup, confirm the evidence file is still there and `tmux has-session -t <session>` fails.

## Helpers

`scripts/drive.sh` is the only helper. It is executable. The four commands above are its whole interface: `launch`, `doctor`, `drive <feature-id>`, `cleanup`.

Set `VERIFY_PSTACK_RUN` to an existing run directory to select it. Set `VERIFY_PSTACK_ROOT` to put runs somewhere other than `/tmp/verify-pstack-pi`.

## Keep the map current

When a command's wording or the status text changes, update `features/` in the same change. The maintenance steps live in this repo's `skills/maintain-verification-skill/SKILL.md`.

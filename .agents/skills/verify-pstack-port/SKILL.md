---
name: verify-pstack-port
description: "Drive pstack-port in a real Pi TUI the way a user does, and keep the proof. Use when a change to the /pstack command, the status bar, or the plan widget needs evidence from the interactive app rather than npm test."
---

# Verify pstack-port

pstack-port is a Pi package. The user installs it with `pi install -l`, starts `pi` in a project, and types `/pstack`, `/pstack status`, `/pstack off`, and `/skill:pstack-*`. This skill launches that TUI in tmux, types those commands, and saves the screen.

The surface is the Pi TUI. `pi -p` and `pi --mode rpc` are not a substitute: they do not render the status bar or the plan widget. Non-Pi portable installers (`agy`, `codex`, `opencode`) and `local-skills/pstack-lean` (`scripts/lean-probe.py`) are verified in isolated temp directories via `drive.sh drive adapters` (interactive `agy` IDE / `codex` / `opencode` host UIs are outside this skill's tmux harness; `node adapter/worktree-audit.mjs` is covered by `npm test`). The mode and plan state machine has its own check in `.agents/skills/verify-pstack-mode-state/`; run it when a change touches mode persistence, plan restore, or the step reminder.

Verified Pi baseline: 1.6.1
Verified against Pi 1.3.0–1.6.1 (`/opt/homebrew/bin/pi`), tmux 3.7b, on macOS (`pstack-status`, `pstack-skill`, `skill-load` including `local-skills/pstack-lean`, `slash-menu`, and `adapters` re-verified on Pi 1.6.1 on 2026-11-27 through the magpie gateway). `drive.sh doctor` compares live `pi --version` against `Verified Pi baseline:` above and prints an explicit `WARN: pi version drift:` line whenever they differ, plus checks bidirectional sync between `features/README.md` and `features/*.md`. Re-run this skill and update the baseline after a Pi upgrade. A user's `~/.agents/skills/` can print a `[Skill conflicts]` banner at startup. That banner is not a failure.

## Launch

Run the helper from the repo root. It creates a throwaway run under `/tmp/verify-pstack-port/`, copies only the `magpie` gateway provider into that run's agent dir, installs this repo into a throwaway project, and starts Pi in a new tmux session.

```bash
.agents/skills/verify-pstack-port/scripts/drive.sh launch
```

The command prints the run directory, such as `/tmp/verify-pstack-port/run-Ab12`. Every later command uses the newest run that still has a live tmux session (else the most recently modified run), or `VERIFY_PSTACK_RUN=<that directory>` when more than one run exists.

Ready means the footer shows `deepseek-v4.1-flash`. The helper waits for that string. A process that merely stays alive is not ready.

What launch does, so a failed run can be repeated by hand:

1. `mkdir` a run with `agent/`, `project/`, and `evidence/`.
2. Copy `providers.magpie` from `~/.pi/agent/models.json` into `<run>/agent/models.json`. Write `<run>/agent/settings.json` with `defaultProvider: magpie`, `defaultModel: workbuddy/deepseek-v4.1-flash`, `defaultThinkingLevel: max`, `quietStartup: true`. Copy nothing else. Do not copy `sessions/`, `auth.json`, or `trust.json`.
3. `cd <run>/project && PI_CODING_AGENT_DIR=<run>/agent pi install -l <repo> --approve`. Then `pi list --approve` lists the repo under Project packages.
4. `tmux new-session -d -s <session> -x 140 -y 44 -c <run>/project` with `PI_CODING_AGENT_DIR=<run>/agent` and `exec pi --approve --model magpie/workbuddy/deepseek-v4.1-flash --thinking max`. The session name is the run directory's basename.

`<repo>` is this checkout. `--approve` trusts the throwaway project for that one process and does not write `~/.pi/agent/trust.json`.

Two runs can exist at once. Each has its own tmux session, agent dir, and project. Never point `PI_CODING_AGENT_DIR` at `~/.pi/agent`, and never install into a real project.

## Doctor

```bash
.agents/skills/verify-pstack-port/scripts/drive.sh doctor
```

Doctor checks four things and prints `doctor: ok`.

- The tmux session exists.
- Its pane pid is alive.
- The live screen shows `deepseek-v4.1-flash`.
- The live screen does not say `This project is not trusted`.

It also checks `features/README.md` against `features/*.md`, prints `pi --version`, and emits `WARN: pi version drift:` whenever live `pi --version` differs from `Verified Pi baseline:` in this file (last verified on Pi 1.6.1). A version drift warning means TUI keystrokes must be re-checked and the baseline updated.

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
.agents/skills/verify-pstack-port/scripts/drive.sh drive pstack-status
.agents/skills/verify-pstack-port/scripts/drive.sh drive pstack-task
.agents/skills/verify-pstack-port/scripts/drive.sh drive pstack-skill
.agents/skills/verify-pstack-port/scripts/drive.sh drive skill-load
.agents/skills/verify-pstack-port/scripts/drive.sh drive plan-widget
.agents/skills/verify-pstack-port/scripts/drive.sh drive slash-menu
.agents/skills/verify-pstack-port/scripts/drive.sh drive adapters
```

`pstack-status` needs no model call. `pstack-task` calls `magpie/workbuddy/deepseek-v4.1-flash` with `/pstack 只回复 pstack-task-ok` and expects a reply line that is exactly `pstack-task-ok`. `pstack-skill` makes the same check through `/skill:pstack`, which turns the mode on without the `/pstack` command. `skill-load` finds `/skill:pstack-interrogate`, `/skill:pstack-statechart`, and `/skill:pstack-lean` in the `/` menu with their descriptions, then runs each with a read-only question about its body (`generalPurpose`, `tlc.out`, and `lean-probe.py`). It does not run a review, model check, or download. `plan-widget` asks the model to call `pstack_plan` with a two-step demo plan and checks the widget above the editor, then clears it with `/pstack off`. `slash-menu` proves the command is registered in the menu, then runs it. `adapters` runs isolated non-Pi installer tests (`agy`, `codex`, `opencode`) and `lean-probe.py --self-test`, writing `adapters.txt`.

Notifications print as a line in the transcript, indented one column in the capture (` pstack mode on.`). The status bar is the footer line `pstack: mode on`. It disappears when the mode is off. There is no `pstack: mode off` line.

## Evidence

Proof lives in `<run>/evidence/`. The helper writes `status-before.txt`, `status-on.txt` and `status-after.txt` for the status feature, `task.txt` plus `task-off.txt` for the task feature, `skill-entry.txt` plus `skill-entry-off.txt` for the `/skill:pstack` entry, `skill-interrogate-menu.txt`, `skill-interrogate-run.txt`, `skill-statechart-menu.txt` and `skill-statechart-run.txt` for skill loading, `plan-on.txt` plus `plan-off.txt` for the plan widget, and `menu-open.txt`, `menu.txt` plus `menu-off.txt` for the menu feature. Pi shows only the latest notification and leaves no tmux scrollback, so a capture is only the live screen and each state that matters gets its own capture.

A proof shows both. For the status feature that is `status-on.txt` with the notify text `pstack mode on.` and the footer `pstack: mode on`, then `status-after.txt` with `pstack mode off.` and that footer gone. A transcript that shows only the final off state is not proof.

The feature id is the file name. The entry point is the typed command inside the file.

## Cleanup

```bash
.agents/skills/verify-pstack-port/scripts/drive.sh cleanup
```

Cleanup kills the tmux session it started. If the pane pid is still alive after that, it sends `SIGTERM` and then `SIGKILL` to that pid only. It then deletes `<run>/project` and `<run>/agent`. It leaves `<run>/evidence/`.

Do not `killall`, `pkill pi`, or `tmux kill-server`. Those match processes this run did not start.

After cleanup, confirm the evidence file is still there and `tmux has-session -t <session>` fails.

## Helpers

`scripts/drive.sh` is the only helper. It is executable. The four commands above are its whole interface: `launch`, `doctor`, `drive <feature-id>`, `cleanup`.

Set `VERIFY_PSTACK_RUN` to an existing run directory to select it. Set `VERIFY_PSTACK_ROOT` to put runs somewhere other than `/tmp/verify-pstack-port`.

## Keep the map current

When a command's wording or the status text changes, update `features/` in the same change. The maintenance steps live in this repo's `skills/maintain-verification-skill/SKILL.md`.

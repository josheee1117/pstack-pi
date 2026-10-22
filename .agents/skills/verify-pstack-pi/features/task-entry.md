# Task entry

`/pstack` followed by a task turns the mode on and sends that task through the pstack entry skill. The model answers in the same TUI, and the footer shows the mode.

## Sub-features

- `task-send` submits a task from the `/pstack` command.
- `task-reply` shows the model's reply in the transcript.
- `task-mode` leaves the footer on `pstack: mode on` after the reply.

## How to get to it (user POV)

- Type `/pstack 只回复 pstack-task-ok` and press Enter.
- Type `/skill:pstack 只回复 pstack-skill-entry-ok` and press Enter. This entry sends the task without going through the `/pstack` command, and it turns the mode on by itself.

## Driving it with tmux

Preconditions:

- `drive.sh doctor` printed `doctor: ok`.
- `<run>/agent/models.json` contains the `cpa` provider, copied at launch.
- `cpa/deepseek-flash-latest` answered `pi -p --model cpa/deepseek-flash-latest "只回复 ok"` with `ok` at least once on this machine. If that probe fails, skip this feature and say the probe failed. Do not claim the direct command proved it.

- **Send the task.** Type `/pstack 只回复 pstack-task-ok` and press Enter. The transcript shows the expanded entry skill, then a line whose text is `pstack-task-ok`.
- **Send it through the skill command.** With the mode off, type `/skill:pstack 只回复 pstack-skill-entry-ok` and press Enter. The transcript shows a line whose text is `pstack-skill-entry-ok`, and the footer gains `pstack: mode on` even though `/pstack` was never typed.
- **Mode stays on.** After either reply, the footer shows `pstack: mode on`. The token counter in the footer is no longer `0.0%`, because the reply spent tokens.
- **Turn it off.** Type `/pstack off` and press Enter. The transcript gains ` pstack mode off.` and the footer line disappears.
- **Proof.** `drive.sh drive pstack-task` writes `<run>/evidence/task.txt` after the reply: a line that is exactly `pstack-task-ok` and the footer `pstack: mode on`. The typed command has scrolled off by then and Pi keeps no scrollback, so the reply token stands for it. `task-off.txt` is the screen after `/pstack off`, with ` pstack mode off.` and no footer. `drive.sh drive pstack-skill` writes the same pair for the skill entry: `skill-entry.txt` and `skill-entry-off.txt`.

## Gotchas

- This call spends a real model request. Do not loop it.
- `PI_OFFLINE=1` did not stop this call on Pi 1.2.0, checked before this machine moved to 1.3.0. Do not treat an offline flag as evidence that no request was sent.
- The entry skill's text is long and contains `ok` inside words such as `playbook`. That is why the tasks ask for the tokens `pstack-task-ok` and `pstack-skill-entry-ok` and the helper matches only a line that is that token. Never fall back to matching `ok`.
- No plan widget appears for this one-line task. Absence of the widget is not a failure.

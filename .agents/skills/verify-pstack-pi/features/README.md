# pstack-pi verification map

This directory is the maintained source for verifying what a user sees in the Pi TUI after installing pstack-pi. Read this index, then follow one feature file.

## Baseline preconditions

- Launch with `.agents/skills/verify-pstack-pi/scripts/drive.sh launch`.
- The run directory it prints is the only state this run may touch.
- The throwaway project has this repo installed, and `drive.sh doctor` prints `doctor: ok`.
- Doctor prints the Pi version. The keystrokes in this map were checked on Pi 1.3.0. The footer shows `deepseek-flash-latest`.
- Drive only the tmux session this launch started.

## Driving conventions

- Start each recipe from a fresh launch unless the recipe says otherwise.
- Type commands with `tmux send-keys -t <session> -l`, then `Enter`. Keep the typed text unchanged.
- `Tab` completes the highlighted slash entry. `Escape` cancels the menu.
- Wait for the notify text or the status line named in the recipe. Do not wait a fixed time and assume it worked.
- Cleanup deletes the project and the agent dir. It does not delete `evidence/`.

## Proof and skip reporting

- Capture the typed command and the screen after the app reacts, not only the final screen.
- Save the capture under `<run>/evidence/<feature-id>.txt`.
- A status change is proved by the footer line appearing or disappearing, not by the notify text alone.
- A model reply is proved by the reply text in the transcript.
- Record which feature file and which entry point produced the artifact.
- If an entry point cannot be reached, write the command you typed and the precondition that failed. Do not mark it verified through a different entry point.

## Feature entry contract

Each feature file has an H1, one paragraph, then four H2 sections: `Sub-features`, `How to get to it (user POV)`, `Driving it with tmux`, `Gotchas`.

## Features

- [Mode status](./mode-status.md) turns the mode on and off and reads it back with `/pstack status`.
- [Task entry](./task-entry.md) runs `/pstack` with a task and checks the model reply.
- [Slash menu](./slash-menu.md) finds `/pstack` in the `/` menu and runs the completed command.

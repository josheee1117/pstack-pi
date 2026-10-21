# Mode status

`/pstack` turns the session mode on, `/pstack off` turns it off, and `/pstack status` prints which one it is. The footer grows a `pstack: mode on` line while the mode is on and drops that line when it is off.

## Sub-features

- `status-off` reports the mode before anything turns it on.
- `status-on` turns the mode on and shows it in the footer.
- `status-read` reports the mode again after it is on.
- `status-clear` turns the mode off and removes the footer line.

## How to get to it (user POV)

- Type `/pstack status` and press Enter.
- Type `/pstack` and press Enter.
- Type `/pstack off` and press Enter.
- Type `/` , filter to `pstack`, press Tab, type ` status` or ` off`, and press Enter.

## Driving it with tmux

Preconditions:

- `drive.sh doctor` printed `doctor: ok` for this run.
- The session has not been sent `/pstack` yet. Relaunch if it has.

- **Read the initial state.** Type `/pstack status` and press Enter. The transcript gains the line ` pstack mode off.`. The footer has no `pstack: mode on` line.
- **Turn it on.** Type `/pstack` and press Enter. The transcript gains ` pstack mode on. Later turns stay in it; /pstack off leaves.` and the footer gains `pstack: mode on`.
- **Read it back.** Type `/pstack status` and press Enter. The transcript gains ` pstack mode on.` and the footer still shows `pstack: mode on`.
- **Turn it off.** Type `/pstack off` and press Enter. The transcript gains ` pstack mode off.` and the last lines of the screen no longer contain `pstack: mode on`.
- **Menu entry.** From a fresh launch, type `/`, then `pstack`, press Tab, type ` status`, and press Enter. The same ` pstack mode off.` line appears. This entry is not covered by `drive.sh drive pstack-status`.
- **Proof.** `drive.sh drive pstack-status` writes three captures to `<run>/evidence/`, because Pi shows only the latest notification: `status-before.txt` has ` pstack mode off.`; `status-on.txt` has ` pstack mode on.` and the footer `pstack: mode on`; `status-after.txt` has ` pstack mode off.` and no `pstack: mode on` footer.

## Gotchas

- The notify text is indented one column in `capture-pane` output. Match ` pstack mode on.`, not a line that starts at column zero.
- Off does not print a status-bar replacement. Assert that `pstack: mode on` is gone from the footer. Pi keeps no tmux scrollback, so the earlier on state is only in `status-on.txt`.
- `/pstack off` also clears the plan widget. This recipe does not create a plan, so it cannot prove that clearing.
- Enter on a filtered menu runs the highlighted command instead of the typed text. Press Tab to leave the menu before typing ` status`, or type the whole command with `send-keys -l` so the menu never steals Enter.

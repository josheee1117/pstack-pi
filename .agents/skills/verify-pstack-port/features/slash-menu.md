# Slash menu

Typing `/` opens the command menu. Filtering with `pstack` lists the `/pstack` command and the `skill:pstack-*` commands. Tab completes the highlighted entry, and Enter runs it.

## Sub-features

- `menu-open` opens the menu and filters it to pstack commands.
- `menu-complete` completes `/pstack` with Tab and runs it with Enter.
- `menu-cancel` closes the menu with Escape and types nothing.

## How to get to it (user POV)

- Type `/` in the empty editor.
- Keep typing to filter. Arrow keys move the highlight.
- Press Tab to complete, then Enter to run.
- Press Escape to cancel.

## Driving it with tmux

Preconditions:

- `drive.sh doctor` printed `doctor: ok`.
- The editor is empty. Press Ctrl-c once if it is not. Ctrl-c on an empty editor exits Pi, so do not press it twice.

- **Open and filter.** Type `/`, then `pstack`. The menu shows a highlighted row whose description contains `Turn pstack mode on for this session`, and a row `skill:pstack`. The footer still has no `pstack: mode on`, because highlighting does not run the command.
- **Complete and run.** Press Tab. The menu closes and the editor contains `/pstack`. Press Enter. The transcript gains ` pstack mode on. Later turns stay in it; /pstack off leaves.` and the footer gains `pstack: mode on`.
- **Cancel.** From a fresh launch, type `/`, then press Escape. The menu closes and the footer does not gain `pstack: mode on`, but the editor still holds the `/` you typed. Press Ctrl-c once to clear it; Ctrl-c on an empty editor exits Pi. This entry is not covered by `drive.sh drive slash-menu`; its capture is `<run>/evidence/menu-cancel.txt`.
- **Proof.** `drive.sh drive slash-menu` writes `<run>/evidence/menu-open.txt` with the filtered menu (`Turn pstack mode on for this session`), `menu.txt` right after Enter with the footer `pstack: mode on`, and `menu-off.txt` after `/pstack off`.

## Gotchas

- Enter while the menu is open runs the highlighted command. It does not insert a newline, and it does not type the literal text you wanted once the filter has a selection.
- Escape closes the menu and leaves the typed text in the editor. Clear it with Ctrl-c before the next recipe.
- The highlight starts on `pstack`, before `skill:pstack`. Tab completes `/pstack`. Do not assume the first row is a skill.
- The menu shows about 56 matches for `pstack` on Pi 1.3.0 with this package installed. The count moves when skills are added. Match the description text, not the count.
- `[Skill conflicts]` at the top of the screen comes from the user's `~/.agents/skills/`. It is unrelated to this menu.

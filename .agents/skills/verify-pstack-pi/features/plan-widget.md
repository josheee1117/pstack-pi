# Plan widget

When the model reports a plan through the `pstack_plan` tool, a widget above the editor shows the playbook name, how many steps are finished, each step with a status icon, and the pstack skill the current step uses. The user cannot type this widget. A model tool call creates it, `/pstack off` clears it, and a finished plan leaves once the turn ends.

## Sub-features

- `plan-shown` shows `pstack · <playbook> · <finished>/<total>` and the steps.
- `plan-stays` keeps an unfinished plan on screen after the reply and after Pi stops working.
- `plan-clear-off` clears the widget with `/pstack off`.
- `plan-done-settles` shows a finished plan with ` ✓` while the turn runs, then removes it once Pi stops.

## How to get to it (user POV)

- Let the model open a playbook on any task. The widget appears above the editor. The model calls `pstack_plan`; that tool is not in its list until the mode or a pstack skill turns it on.
- Run `/pstack off` to clear a plan whose steps no longer matter.

## Driving it with tmux

Preconditions:

- `drive.sh doctor` printed `doctor: ok`.
- `cpa/deepseek-flash-latest` answers, as in [task entry](./task-entry.md).

- **Show an unfinished plan.** Type `/pstack 只调用一次 pstack_plan 工具：playbook 填 demo，两步，第一步 status done，第二步 status active。然后只回复 plan-widget-ok。不要调用其他工具。` and press Enter. The screen gains `pstack · demo · 1/2`, then `✓ 第一步` and `▶ 第二步`, and the footer shows `pstack: mode on`.
- **Unfinished plan stays.** After the reply `plan-widget-ok` and Pi stops working, the widget is still on screen with `1/2`.
- **Off clears it.** Type `/pstack off`. The transcript gains ` pstack mode off.`, the footer line disappears, and `pstack · demo` is gone from the screen.
- **Finished plan leaves.** Type `/pstack 调用一次 pstack_plan，playbook 填 done-demo，两步都 status done，然后只回复 plan-done-ok。不要调用其他工具。` While Pi works the screen shows `pstack · done-demo · 2/2 ✓`. After `plan-done-ok` and Pi stops, the widget is gone.
- **Proof.** `drive.sh drive plan-widget` writes `<run>/evidence/plan-on.txt` (widget `pstack · demo · 1/2`) and `plan-off.txt` (the notify and no `pstack · demo`). The finished case was driven by hand: `plan-done-working.txt` shows `pstack · done-demo · 2/2 ✓`; `plan-done-settled.txt` shows the reply and no widget.

## Gotchas

- This spends a real model request, and it only works when the model obeys the `pstack_plan` instruction. A model that writes prose instead leaves the widget empty. The reply token and the widget line both prove the tool ran.
- A step's skill column shows the short skill name, or `?` when the model names a skill the package does not ship. `流程自带` covers a step whose playbook is itself the work.
- The title is clipped to the terminal width and the step list windows around the current step, so a plan longer than seven steps shows only nearby steps.
- A finished plan is only visible while the turn runs. A capture taken after Pi stops cannot prove it.
- `/pstack status` does not put `pstack_plan` in the tool list, so it cannot create a plan on its own.

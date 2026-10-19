---
name: verify-pstack-mode-state
description: "Check the pstack mode and plan state machine in extensions/pstack.js. Use when a change touches mode on/off, session restore, the plan widget, or the \"still shows step\" reminder, and after editing that file."
---

# Verify the pstack mode and plan state

The mode flag, the plan on the user's console, and the "still shows step" reminder live in `extensions/pstack.js`. This check searches every order of those steps, up to six session-branch entries.

## The property

Turning the mode back on never brings back a plan the user already turned off, a finished plan never asks for another reminder, an ignored plan stops after two reminders, and resuming a session shows only what that session's own record replays to.

## The harm

If this breaks, a user who typed `/pstack off` still sees the old plan and still gets nagged, or a resumed session shows a plan from a different point in the conversation.

## Run it

From the repo root:

```
.claude/skills/verify-pstack-mode-state/check.sh
```

The script calls `~/.local/bin/tlc` (TLC 2.19, needs Java 11 or later) on `ModeState.tla` with `ModeState.cfg`, one worker, and deletes TLC's scratch states when it finishes. A pass ends with `Model checking completed. No error has been found.` and exit code 0. A failure ends with `Invariant <name> is violated.` and a numbered trace. Exit code 12 means a violated invariant.

| Invariant | In the code's words |
|---|---|
| OffClearsPlan | After `/pstack off`, turning the mode on does not restore a plan. A plan reported after that is new. |
| DonePlanIsQuiet | A finished plan draws no reminder. It leaves on the next settle or resume. |
| AbandonedStops | An open plan is reminded at most twice (`NUDGE_LIMIT`) until the model reports the plan again. |
| BranchAgrees | Right after `session_start` or `session_tree`, mode and plan match a replay of that branch. |

## Scope

Checked, as one step each, matching `extensions/pstack.js`:

- Turn the mode on (`/pstack`, `/pstack <task>`, `/skill:pstack`). Lines 381-384 and 484-485.
- `/pstack off`. Lines 468-471.
- The model reports an open plan, or a finished plan, through `pstack_plan`. Lines 323-324.
- Any other tool result, which may append the reminder. Lines 419-424.
- The agent settles and drops a finished plan. Lines 437-438.
- Resume or tree switch replays the branch. Lines 340-363.

`NUDGE_EVERY` is 6 and `NUDGE_LIMIT` is 2 (lines 107-108). The branch holds at most six entries. Each entry is one of `mode_on`, `mode_off`, `plan_open`, `plan_done`. A longer branch only repeats those four kinds. The checked run on 2026-10-19 searched 39613 distinct states in about one second.

## Bounds and assumptions

- One session, one branch. The model does not switch to a second branch with different entries. `session_start` and `session_tree` both call `restoreState`, so one replay action covers both.
- A plan is either open or finished. The check does not model step text, step order, or the widget's line wrapping.
- `ReportDone` requires an open plan. The code also accepts a finished plan with nothing open before it, and an empty `steps` list that clears the widget. Neither is in the model.
- The session can be read. The `catch` in `restoreState` (lines 360-362), which leaves both flags off, is not in the model.
- `/pstack off` writes its `mode_off` entry in the same step that clears the plan. The code does those two writes together (lines 469-471).
- `restored` is a model flag, not a variable in the code. It means "the last thing that happened was a replay", which is when `BranchAgrees` applies. A pass says nothing about states the model never represents.

## What a failure looks like

Read the trace from State 1. Each later state names the action. Map it back:

| Model | Code |
|---|---|
| TurnOn | user enters the mode |
| TurnOff | `/pstack off` |
| ReportOpen | `pstack_plan` with a step that is not done or skipped |
| ReportDone | `pstack_plan` whose every step is done or skipped |
| OtherTool | a tool result that is not `pstack_plan` |
| Settle | `agent_settled` |
| SwitchBranch | `session_start` or `session_tree` |

A real bug is a trace whose steps the code can actually run, and whose end state breaks one of the four sentences above. A modeling error is a trace that needs a step the code cannot take, such as a plan entry and an off entry changing the widget in one loop iteration. `restoreState` handles them as two entries (lines 348-356). Do not weaken an invariant to make a trace go away. If the current code violates one, report the trace in the code's words and leave the product code alone unless the user asks for a fix.

## When the code changes

Re-run the check after any edit to `extensions/pstack.js` that touches `modeOn`, `plan`, `restoreState`, `planNudge`, `agent_settled`, or the `/pstack` command handler. The line numbers above are the map. `Restore` and `BranchAgrees` each spell out the replay. `Restore` mirrors the code; `BranchAgrees` is the intended behavior. A code change goes into `Restore` only. Edit `BranchAgrees` only when the intended behavior itself changes, and say so in the change, because editing both the same way hides exactly the break this check exists to catch. If a change adds a step the model does not have, or splits one model step into two code steps, update `ModeState.tla` in the same change and say what the new step maps to. A rename that moves a line but keeps the step is a comment edit, then a re-run.

## What this does not check

The adapter flag, prompt sections, the widget's exact lines, and nudge text are covered by `tests/extension.test.js`, not by this model. Run `npm test` for those.

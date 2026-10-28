# Skill loading

A skill the package ships must appear in Pi's `/` menu under `skill:<name>` with its description, and typing that command must put the skill's body in front of the model. This is the check that a sync added its skills to the package correctly.

## Sub-features

- Discovery: `/skill:<name>` is listed in the `/` autocomplete menu, with the Chinese description from the skill's `SKILL.md`.
- Loading: `/skill:<name>` runs, and the reply proves the body reached the model.

## How to get to it (user POV)

Install the package, start Pi, type `/`, then `skill:pstack-interrogate` or `skill:pstack-statechart`. The menu shows the entry and its description. Tab completes it and Enter runs it.

## Driving it with tmux

```bash
.agents/skills/verify-pstack-pi/scripts/drive.sh drive skill-load
```

It checks interrogate, then statechart. For each skill, it types `/skill:pstack-<name>` and captures the menu. Then it closes the menu with Escape, appends a read-only question to the text left in the editor, and runs it.

The interrogate question asks for the adversary's agent type in the Fan out section. The answer is `generalPurpose`. The statechart question asks for the raw TLC output file in the Read the report section. The answer is `tlc.out`. Neither answer appears in the command or the skill's description. Every skill except `/skill:pstack-setup` is hidden from the system prompt listing. The questions forbid tool calls, reviews, model checks, and downloads.

The captures are `skill-interrogate-menu.txt`, `skill-interrogate-run.txt`, `skill-statechart-menu.txt`, and `skill-statechart-run.txt` under the run's `evidence/` directory.

## Gotchas

- The `/` menu only lists skills while the setting that registers them is on. Pi calls it `enableSkillCommands`; it is on by default.
- A reply alone does not prove the body arrived. The unit test `tests/discovery.test.js` expands every skill through Pi's own `_expandSkillCommand`, which is the real expansion code; this feature proves the same path through the TUI.
- Adding a skill upstream means adding its directory name to `tests/helpers.js` and a row to `docs/coverage.md`. Both fail the suite when missed.

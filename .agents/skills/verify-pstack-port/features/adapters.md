# Portable adapters & local skills

Beyond the Pi TUI extension, `pstack-port` ships portable installer/adapter maps for `agy`, `codex`, and `opencode` (`adapter/`) plus local skills under `local-skills/` (`pstack-report`, `pstack-lean` + `scripts/lean-probe.py`).

## Sub-features

- Isolated non-Pi installers & capability maps: `tests/install-agy.test.js`, `tests/install-codex.test.js`, `tests/install.test.js`, and `tests/adapter.test.js` run against temporary home/config directories and assert generated plugin/skill symlinks, placeholder substitution, and override wiring.
- Local skill expansion & static structural probe: `tests/local-skills.test.js` expands `/skill:pstack-report` and `/skill:pstack-lean` through Pi's real `_expandSkillCommand` and runs `local-skills/pstack-lean/scripts/lean-probe.py --self-test`.

## How to get to it (user POV)

Run the installer for `agy`, `codex`, or `opencode` per `docs/install.md`, or invoke `/skill:pstack-lean` in Pi / read `local-skills/pstack-lean/SKILL.md` in `agy` and `codex`.

## Driving it with tmux

```bash
.agents/skills/verify-pstack-port/scripts/drive.sh drive adapters
```

Saves the full isolated installer and probe test transcript to `<run>/evidence/adapters.txt`. `drive skill-load` also drives `/skill:pstack-lean` live inside the Pi TUI (`skill-lean-menu.txt`, `skill-lean-run.txt`).

## Gotchas

- Interactive `agy` IDE, `codex` TUI, and `opencode` TUI host UIs are external applications and are not launched by `drive.sh`; `drive adapters` verifies their real filesystem installers and generated bundle layouts in isolated temp directories.

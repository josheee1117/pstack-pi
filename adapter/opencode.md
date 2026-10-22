# pstack on opencode

The pstack skills were written for Cursor. On opencode, read them through this map, plus `adapter/overrides.md` for the package rules. The package root is the directory that holds this `adapter/` folder, /Users/hejiayuan/code_me/pstack-pi on this machine. Use only tools present in your session and check their schema before calling them; this map does not grant permissions.

## Finding files

- The skills are `skills/<name>/SKILL.md` under the package root, and `~/.config/opencode/skills/pstack-<name>/SKILL.md` when the install symlinks them there. The `skill` tool loads them by `id`, as `pstack-<name>`. The user's global rules reveal only `pstack-setup`; load any other skill by its exact id.
- A project skill (`.cursor/skills/<name>/`) goes in `.agents/skills/<name>/`, never `.pi/skills/`: many repos ignore `.pi/`, and only Pi reads it. This covers `verify-<app>/` from create-verification-skill and create-formal-verification-skill, the `verify-*` skill maintain-verification-skill edits, and automate-me's `<handle>-mode/` mode skill. opencode reads `.agents/skills/` and `.claude/skills/` itself, so both work here.
- After writing a project skill, create the relative symlink `.claude/skills/<name>` pointing at `../../.agents/skills/<name>`, and skip that step when anything already exists at that path. Pi, Codex, and opencode read `.agents/skills/`, Claude Code reads only `.claude/skills/`, so the link keeps one copy for all four tools.
- maintain-verification-skill step 0 looks for its target in this order: `.agents/skills/verify-*`, then `.claude/skills/verify-*`, then `.pi/skills/verify-*`. The last two are old locations: when a real directory matches there, name it and tell the user to move it to `.agents/skills/` and add the `.claude` symlink. Do not move it yourself.

## Tools

- The todolist is `todowrite`.
- `AskQuestion` is `question`.
- `Task` is `subagent`. It takes `agent` instead of `subagent_type`, a 3-5 word `description`, the brief as `prompt`, and `sessionID` instead of `task_id` to continue a previous child. `background: true` runs it asynchronously and a completion notification arrives by itself; do not poll.
- Its `model` is `providerID/modelID`, or `providerID/modelID#variant`. The tool says never to set it unless the user asked; a pstack role line naming a model is such an ask.
- bash is `shell`. `apply_patch` is `patch`. `read`, `write`, `edit`, `glob`, `grep`, and `skill` keep their names.
- `isolation: "worktree"` has no tool equivalent: run `git worktree add <path> -b pstack/<name> <base>` first and give the child `<path>` as its working directory.
- `paths:` auto-attach does not exist. When you edit `.ts` or `.tsx` files, read `skills/typescript-best-practices/SKILL.md` under the package root.

## Models

- Role models live in `~/.pi/agent/pstack-models.md`. Read `~/.pi/agent/pstack-roles.md` when the first is missing. The setup skill writes the first.
- A role line's value is written for Pi as `provider/id` with an optional `:thinking` suffix. opencode has no such suffix: pass the part before `:` and say the reasoning level was dropped.

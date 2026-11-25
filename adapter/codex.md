# pstack on Codex

The pstack skills were written for Cursor. This install adds them to Codex. Read this map, then `{{adapter}}/overrides.md` before the first skill you use; the overrides are the package rules and they win over a skill's own wording. Use only tools present in your session, and check their schema before calling them. This map grants no permissions.

## Finding files

- The package root is `{{root}}`. Skill bodies write a path as a placeholder: a name in double braces. This file is generated, so each name below already points at this machine's absolute path.

| Placeholder name | Absolute path |
|---|---|
| root | `{{root}}` |
| skills | `{{skills}}` |
| adapter | `{{adapter}}` |
| agentDir | `{{agentDir}}` |

- Codex lists the skills as `pstack-<name>`; the entry skill is `pstack` (`{{skills}}/poteto-mode/SKILL.md`). When the user names one, find the directory under `{{skills}}` or `{{root}}/local-skills` whose `SKILL.md` frontmatter `name` is that id, read the file, and follow it.
- Codex ignores `disable-model-invocation`, so its catalog lists every installed skill with its description. Apply a pstack skill when the user names it or the task clearly matches, not on keyword overlap alone.
- A pstack skill may tell you to create a project skill. Codex discovers project skills in `.agents/skills/<name>/SKILL.md`, so put it there.
- Role model settings live in `{{agentDir}}/pstack-models.md`. Read `{{agentDir}}/pstack-roles.md` when the first is missing. This map only says where the choices are recorded; Codex still owns model selection.

## Tools

- `pstack_plan` is a Pi tool. In Codex the todolist is `update_plan`: pass the same short step labels in order, and update it as steps start, finish, or get skipped. Do not write the steps into the reply.
- `AskQuestion`: ask in your reply.
- `/skill:pstack-<name>` is Pi syntax. In Codex, use the skill id `pstack-<name>`, or the path in the table above.
- Cursor's `Task` tool is Codex's `collaboration.spawn_agent`, with `send_input` and `wait` beside it. Read its schema in the session before calling it: the brief is one task string. Codex has no separate `readonly` flag; give a read-only child a read-only task. If the session has no such tool, do bounded work yourself and say so, and a step whose product is an independent verdict stops and names the gap.
- `isolation: "worktree"`, and every set of parallel writers: create one worktree per writer with `git worktree add <path> -b pstack/<name> <base>` and give the child `<path>` as its working directory. Remove only worktrees you created, and only after you kept their diff.
- A skill may name a subagent, arena, or another tool Codex does not provide. Do not invent it. `{{adapter}}/overrides.md` decides the rest, and a substitute counts only when it allows one and the tool is actually present.

## Models

- A role line's value is written for Pi as `provider/model` with an optional `:thinking` suffix, such as `magpie/auto/gpt-6.1-sol:high`.
- In Codex, drop the provider segment before the first `/`: that line means model `auto/gpt-6.1-sol` with reasoning effort `high`. Check the id against the session's model list, and pass a model only where the tool or `codex -m` takes one; a role line naming a model is the user's ask.
- When the subagent tool takes neither a model nor a reasoning effort, run the child on the session model and say the model diversity was lost. Independence was not.

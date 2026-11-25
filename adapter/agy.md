# pstack on agy (Antigravity)

The pstack skills were written for Cursor. This installed plugin adds them to agy. Read this map, then `{{adapter}}/overrides.md` before the first skill you use; the overrides are the package rules and they win over a skill's own wording. Use only tools present in your session, and check their schema before calling them. This map grants no permissions.

## Finding files

- The package root is `{{root}}`. Skill bodies write a path as a placeholder: a name in double braces. This file is generated, so each name below already points at this machine's absolute path.

| Placeholder name | Absolute path |
|---|---|
| root | `{{root}}` |
| skills | `{{skills}}` |
| adapter | `{{adapter}}` |
| agentDir | `{{agentDir}}` |

- The plugin exposes the package skills as `pstack-<name>`; the entry skill is `pstack` (`{{skills}}/poteto-mode/SKILL.md`). Run `/skills` in agy to list them. The package marks them `disable-model-invocation: true`, so agy may keep them out of the model's automatic skill list; when the user names one, find the directory under `{{skills}}` or `{{root}}/local-skills` whose `SKILL.md` frontmatter `name` is that id, read the file, and follow it.
- A pstack skill may tell you to create a project skill. agy discovers project skills in `.agents/skills/<name>/SKILL.md`, so put it there.
- Role model settings live in `{{agentDir}}/pstack-models.md`. Read `{{agentDir}}/pstack-roles.md` when the first is missing. This map only says where the choices are recorded; agy still owns model selection.

## Tools

- `pstack_plan` is a Pi tool and does not exist here. When a skill asks for it, use agy's own task list if the session has one; otherwise skip the call and keep the plan in the reply.
- A skill may name a subagent, arena, or another tool that agy does not provide. Do not invent it. Do the work in this session, or say which capability is missing. Use a substitute only when `{{adapter}}/overrides.md` allows it and the tool is actually present.
- `/skill:pstack-<name>` is Pi syntax. In agy, load the skill by its id `pstack-<name>`.

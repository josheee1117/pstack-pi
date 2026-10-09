# pstack on Pi

The pstack skills were written for Cursor. On Pi, read them through this map. Package root: {{root}}. User and project capability mappings take precedence. Use only tools actually present and inspect their installed schemas before calling them; this map does not grant permissions.

## Finding files

- A skill named in bold or as a command (**how**, `/tdd`) is {{skills}}/<name>/SKILL.md. `**<x>** principle skill` and `principle-<x>` are {{skills}}/principle-<x>/SKILL.md. The mode's skill (poteto-mode, `/poteto-mode`) is {{skills}}/poteto-mode/SKILL.md.
- A playbook named in bold (**Feature**, **Opening a PR**, **Babysit**) is {{skills}}/poteto-mode/playbooks/<kebab-case name>.md. **Writing the reply** and **Comments** are sections of the mode's skill.
- `pstack/skills/<x>`, `git show origin/main:pstack/skills/<x>`, and `~/.cursor/plugins/.../pstack` all mean files in this package. Read them from disk.
- `.cursor/skills/` is `.pi/skills/`. `~/.cursor/skills/` is `{{agentDir}}/skills/`.
- Before you follow one of these, read the note it names:
  - Chat transcripts, `agent-transcripts/` (recall, reflect, automate-me, eval, show-me-your-work audits, worktree-cleanup): {{adapter}}/notes/sessions.md.
  - Cloud agents, `environment: "cloud"`, long-lived owners (swarm, autopilot-full, autopilot-stack, shipping, orchestrate, figure-it-out): {{adapter}}/notes/cloud-agents.md.
  - `control-ui`, CDP, screenshots, traces (bug-fix, visual-parity, runtime-forensics, perf-issue, prototype, create-verification-skill): {{adapter}}/notes/browser.md.
  - MCP sources (why, and reviewers that look up tickets or chat): {{adapter}}/notes/sources.md.

## Subagents

- Cursor's `Task` tool is the `subagent` tool from the pi-subagents package. If this session has no `subagent` tool, do bounded work yourself and say so. A step whose product is an independent verdict stops and names the gap.
- One child is one call: `subagent({ agent, task, context: "fresh", async: true, model })`. `run_in_background: true` is `async: true`. N parallel children are N such calls in one reply. Do not write workflow scripts. Their interface changes between pi-subagents versions.
- `subagent_type: "generalPurpose"` and `"poteto-agent"` map to agent `delegate`. `readonly: true` maps to agent `scout` with a read-only task. Always pass `context: "fresh"` for an independent judgment. Agent names and tool allowlists alone are not a security boundary; verify the actual child context and allowed capabilities.
- `isolation: "worktree"`, and every set of parallel writers: before launching, create one worktree per writer with `git worktree add <path> -b pstack/<name> <base>` and pass `<path>` as `cwd`. Remove only worktrees you created, and only after you kept their diff.
- An async child's result arrives by itself, after your current tool calls or as a new turn when you are idle. Do not poll for it. `subagent({ action: "status", id })` shows one child, `subagent({ action: "steer", id, message })` redirects a running one, `subagent({ action: "stop", id })` ends one, and `subagent({ action: "resume", id, message })` continues a finished one. A status result does not prove a child completed its task.
- The user watches and steers children with `/subagents-fleet`. Name it when they ask to see the workers.
- Every child's brief includes the relevant skill, a fixed artifact, the requested scope, and the applicable overrides. Have it read {{adapter}}/overrides.md and {{adapter}}/platform.md; if it lacks the package extension, give it the already resolved paths and overrides in the brief. Do not assume it inherited mode state or instructions.
- Comment Sicko maps to `delegate` with `context: "fresh"`, given {{root}}/agents/comment-sicko.md as its instructions. Changes still require the user's scope and authorization.
- For MCP investigations use the optional packaged `pstack-investigator` agent with `async: true` and `context: "fresh"`. Its tool list includes `mcp`; pi-mcp-adapter must be installed in the child environment. See the source note before launching.
- Skill requirements never widen another tool's authorization. If the host requires explicit delegation approval, obtain it before creating workers.

## Models

- The `/setup-pstack` rule `~/.cursor/rules/pstack-models.mdc` is `{{agentDir}}/pstack-models.md` (installs of the earlier port wrote `{{agentDir}}/pstack-roles.md`; read that when the first is missing). The setup skill writes the first. A role line's value is a Pi model, `provider/id` with an optional `:thinking` suffix, passed as `model`.
- Upstream default slugs (claude-…-xhigh, grok-…, gpt-…) do not exist here. When a role has no line, or its value is `auto` or `inherit-parent`, pass `model: "inherit"`. Omitting `model` uses the agent's configured default, which is not the session model.
- A panel meant to span models (arena, architect, interrogate, reflect) may run on one model in fresh contexts. Say that model diversity was lost. Independence was not.

## Cursor tools and commands

- `AskQuestion`: ask in your reply.
- The todolist: a checklist in your reply, or a `todo.md` next to the decision trail for long work.
- `/goal`: an optional pi-goal command, typed by the user; discover its installed tool names rather than assuming they exist. `/loop` for a fixed interval: use pi-subagents scheduling only if its installed schema exposes it. With neither available, make bounded progress and report that automatic wakeup is unavailable. Never promise a tick that nothing will fire, or add a scheduler dependency merely to handle a small task.
- `cursor-team-kit`: `/deslop` is the project's own lint and format tools. `control-cli` is bash, with tmux for interactive TUIs. `control-ui` is in notes/browser.md.
- Cursor's built-in `create-skill`: the Agent Skills format (a directory with `SKILL.md` and `name` and `description` frontmatter) plus playbooks/authoring-a-skill.md. Cursor's built-in `babysit` skill does not exist here. Use playbooks/babysit.md.
- MCP servers in Cursor's `mcps/` folder: the `mcp` tool from pi-mcp-adapter. See notes/sources.md.
- Image generation (teach): a mermaid diagram or an ASCII sketch.
- `paths:` auto-attach does not exist. When you edit `.ts` or `.tsx` files, read the typescript-best-practices skill.
- `scripts/watch-pr` and `scripts/orch` need `bun`. The orch frontier needs Graphite's `gt`. If one is missing, say so and use `gh pr checks --watch` and `gh pr view --json`, or the playbook's own fallback.
- The help skill (poteto-help, typed here as `/skill:pstack-help`) answers for Cursor. On Pi, install is `pi install -l <package>` then `/reload`. The mode that stays on is `/pstack`, left with `/pstack off`; Custom Modes and Option+Enter do not exist. Users type a skill as `/skill:pstack-<name>`, except `/skill:pstack` (poteto-mode), `/skill:pstack-setup`, and `/skill:pstack-teach-me`. Its README and `docs/guide/` links are not shipped: point to {{root}}/README.md, {{root}}/docs/install.md, and {{root}}/docs/coverage.md, and give the upstream guide's public URL only as Cursor background. `make-bot-ui` is not in this package.
- A run's built-in PR tool does not exist here. Use the resolved forge.
- "Cursor restart" is a Pi restart or `/reload`. "Cursor dashboard" is `/subagents-fleet` for the user and `subagent({ action: "status" })` for you.

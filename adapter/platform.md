# pstack on Pi

The pstack skills were written for Cursor. On Pi, read them through this map. Package root: {{root}}.

## Finding files

- A skill named in bold or as a command (**how**, `/tdd`) is {{skills}}/<name>/SKILL.md. `**<x>** principle skill` and `principle-<x>` are {{skills}}/principle-<x>/SKILL.md. The mode's skill (poteto-mode, `/poteto-mode`) is {{skills}}/poteto-mode/SKILL.md.
- A playbook named in bold (**Feature**, **Opening a PR**, **Babysit**) is {{skills}}/poteto-mode/playbooks/<kebab-case name>.md. **Writing the reply** and **Comments** are sections of the mode's skill.
- `pstack/skills/<x>`, `git show origin/main:pstack/skills/<x>`, and `~/.cursor/plugins/.../pstack` all mean files in this package. Read them from disk.
- `.cursor/skills/` is `.pi/skills/`. `~/.cursor/skills/` is `~/.pi/agent/skills/`.
- Before you follow one of these, read the note it names:
  - Chat transcripts, `agent-transcripts/` (recall, reflect, automate-me, eval, show-me-your-work audits, worktree-cleanup): {{adapter}}/notes/sessions.md.
  - Cloud agents, `environment: "cloud"`, long-lived owners (swarm, autopilot-full, autopilot-stack, shipping, orchestrate, figure-it-out): {{adapter}}/notes/cloud-agents.md.
  - `control-ui`, CDP, screenshots, traces (bug-fix, visual-parity, runtime-forensics, perf-issue, prototype, create-verification-skill): {{adapter}}/notes/browser.md.
  - MCP sources (why, and reviewers that look up tickets or chat): {{adapter}}/notes/sources.md.

## Subagents

- Cursor's `Task` tool is the `subagent` tool from the pi-subagents package. If this session has no `subagent` tool, do bounded work yourself and say so. A step whose product is an independent verdict stops and names the gap.
- `subagent_type: "generalPurpose"` and `"poteto-agent"` map to agent `delegate`. `readonly: true` maps to agent `scout`. Always pass `context: "fresh"`. Never use `worker` for a review or a verdict: it forks the parent conversation.
- A `poteto-agent` child's task starts by telling it to read the mode's skill and this map ({{adapter}}/platform.md).
- Comment Sicko maps to `delegate` with `context: "fresh"`, given {{root}}/agents/comment-sicko.md as its instructions.
- A child that needs MCP tools runs with `async: true`, and its tools include `mcp`.
- `run_in_background: true` is the default async mode. Collect results with `bg_wait` or `subagent({ action: "status", id })`.
- Running a pstack skill that prescribes delegation is the operator's request to delegate, within the overrides.

## Models

- The `/setup-pstack` rule `~/.cursor/rules/pstack-models.mdc` is `~/.pi/agent/pstack-models.md` (installs of the earlier port wrote `~/.pi/agent/pstack-roles.md`; read that when the first is missing). The setup skill writes the first. A role line's value is a Pi model, `provider/id` with an optional `:thinking` suffix, passed as `model`.
- Upstream default slugs (grok-…, claude-…-max, gpt-…-max) do not exist here. When a role has no line, or its value is `auto` or `inherit-parent`, pass `model: "inherit"`. Omitting `model` uses the agent's configured default, which is not the session model.
- A panel meant to span models (arena, architect, interrogate, reflect) may run on one model in fresh contexts. Say that model diversity was lost. Independence was not.

## Cursor tools and commands

- `AskQuestion`: ask in your reply.
- The todolist: a checklist in your reply, or a `todo.md` next to the decision trail for long work.
- `/goal`: the pi-goal command, typed by the user. The model reports with `goal_complete`, `goal_blocked`, and `goal_wait`. `/loop` for a fixed interval: pi-subagents `schedule.create`. With neither installed, poll on a bounded budget and report between polls. Never promise a tick that nothing will fire.
- `cursor-team-kit`: `/deslop` is the project's own lint and format tools. `control-cli` is bash, with tmux or a herdr pane for interactive TUIs. `control-ui` is in notes/browser.md.
- Cursor's built-in `create-skill`: the Agent Skills format (a directory with `SKILL.md` and `name` and `description` frontmatter) plus playbooks/authoring-a-skill.md. Cursor's built-in `babysit` skill does not exist here. Use playbooks/babysit.md.
- MCP servers in Cursor's `mcps/` folder: the `mcp` tool from pi-mcp-adapter. See notes/sources.md.
- Image generation (teach): a mermaid diagram or an ASCII sketch.
- `paths:` auto-attach does not exist. When you edit `.ts` or `.tsx` files, read the typescript-best-practices skill.
- `scripts/watch-pr` and `scripts/orch` need `bun`. The orch frontier needs Graphite's `gt`. If one is missing, say so and use `gh pr checks --watch` and `gh pr view --json`, or the playbook's own fallback.
- "Cursor restart" is a Pi restart or `/reload`. "Cursor dashboard" is `subagent({ action: "status" })` or `herdr agent list`.

# Session records on Pi

Upstream reads Cursor chat transcripts at `~/.cursor/projects/<slug>/agent-transcripts/`. Pi keeps its own records. Read only this project's records, never another project's.

## Where they live

- Use the current session path supplied by the pstack adapter (from Pi's `sessionManager.getSessionFile()`). Some Pi distributions also set `$PI_SESSION_FILE` inside bash; original Pi 0.73.1 does not. If no persisted path is available, report that limitation rather than guessing a session from its timestamp.
- A project's default sessions are in `<agent dir>/sessions/<encoded cwd>/`; an explicit `--session-dir` takes precedence. Prefer the parent directory of the known current session and check each file's header before reading its contents.
  - The agent dir is `$PI_CODING_AGENT_DIR` if set, else `~/.pi/agent`.
  - The encoded cwd is `--` + the absolute path with the leading `/` dropped and every `/`, `\`, or `:` turned into `-` + `--`. So `/Users/you/proj` becomes `--Users-you-proj--`.
  - Compute it with `printf -- '--%s--' "$(pwd -P | sed 's#^/##; s#[/\\:]#-#g')"`.
- Files are `<ISO timestamp>_<session id>.jsonl`. The name sorts by start time. Order by modification time (`ls -t`) to find recent activity.
- pi-subagents stores a child's session in a directory next to its parent's file: `<parent file without .jsonl>/<id>/run-<n>/session.jsonl`. `subagent({ action: "status", id, view: "transcript" })` shows it without reading files.
- A session started in a git worktree is filed under that worktree's own path.

## Format

- One JSON object per line. The first line is the header: `{"type":"session","version":3,"id":…,"timestamp":…,"cwd":…}`. Use `cwd` to confirm the project.
- Conversation lines are `{"type":"message","message":{"role":…,"content":…}}` with role `user`, `assistant`, `toolResult`, or `system`.
- An assistant `content` is a list of `{type:"text"}`, `{type:"thinking"}`, and `{type:"toolCall", name, arguments}` blocks. A `toolResult` names its `toolName`.
- Other line types: `model_change`, `compaction` (a summary replacing older turns), `branch_summary`, `custom`, `label`, `session_info` (the session name).
- Entries form a tree through `parentId`, so a file can hold abandoned branches. Follow `parentId` back from the last entry for the active line.

## Mapping upstream steps

- "The workspace's transcripts" and `agent-transcripts/` mean the project session directory above. The Cursor layouts (flat, nested, `subagents/`) mean the session files plus the pi-subagents child directories.
- "Find the active transcript by its first line" means use the explicit current session path from the adapter, or `$PI_SESSION_FILE` where supported.
- Encoded directories are not unique: confirm the header's `cwd` belongs to this project before searching messages. Do not follow symlinks into unrelated records. Modification time selects recency, not ownership.
- Search only the validated project corpus with `rg -l '<term>' <session dir>`, then read bounded matching portions. Do not glob the entire user sessions root.
- worktree-cleanup: `scripts/worktree-audit.sh` already reads these directories for its LAST_CHAT column.

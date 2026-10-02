#!/usr/bin/env bash
# Read-only Pi worktree audit. PI_CODING_AGENT_DIR selects the sessions root;
# --session-dir selects an explicit project corpus. No fetch or deletion.
# Node owns filesystem operations so paths with spaces and both BSD/GNU hosts work.
set -eu
root=$(CDPATH= cd -- "$(dirname -- "$0")/../../.." && pwd -P)
exec node "$root/adapter/worktree-audit.mjs" "$@"

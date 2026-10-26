#!/bin/bash
# Drive one isolated Pi TUI that has this repo installed, and leave the proof.
# Usage: drive.sh <launch|doctor|drive|cleanup> [feature-id]
# Reads VERIFY_PSTACK_RUN if set. Otherwise uses the newest run under /tmp/verify-pstack-pi/.
set -u

REPO="$(cd "$(dirname "$0")/../../../.." && pwd)"
ROOT="${VERIFY_PSTACK_ROOT:-/tmp/verify-pstack-pi}"
READY='deepseek-flash-latest'
CMD_PAUSE=0.4

die() { echo "drive.sh: $*" >&2; exit 1; }

latest_run() {
  [ -n "${VERIFY_PSTACK_RUN:-}" ] && { echo "$VERIFY_PSTACK_RUN"; return; }
  # mktemp names are random, so name order says nothing. Prefer a run whose
  # tmux session is alive, else the most recently modified one.
  local run
  for run in $(ls -td "$ROOT"/run-* 2>/dev/null); do
    tmux has-session -t "$(basename "$run")" 2>/dev/null && { echo "$run"; return; }
  done
  ls -td "$ROOT"/run-* 2>/dev/null | head -1
}

run_of() {
  local run
  run="$(latest_run)"
  [ -n "$run" ] && [ -d "$run" ] || die "no run directory; launch first"
  echo "$run"
}

session_of() { basename "$(run_of)"; }

pane_pid() { tmux list-panes -t "$(session_of)" -F '#{pane_pid}' 2>/dev/null | head -1; }

# Print the pane with ANSI stripped. Pi's TUI leaves no tmux scrollback
# (history_size is 0), so this is only the live screen.
capture() {
  local raw text
  raw="$(tmux capture-pane -t "$(session_of)" -p -S "${1:--200}" -e 2>/dev/null)" || die "tmux session $(session_of) is not running"
  text="$(printf '%s\n' "$raw" | sed $'s/\x1b\\[[0-9;?]*[A-Za-z]//g')"
  printf '%s\n' "$text"
}

wait_for() {
  local needle="$1" tries="${2:-20}" screen
  while [ "$tries" -gt 0 ]; do
    screen="$(capture -30 || true)"
    printf '%s\n' "$screen" | grep -q "$needle" && return 0
    tries=$((tries - 1))
    sleep 0.3
  done
  return 1
}

type_cmd() {
  tmux send-keys -t "$(session_of)" -l -- "$1" || die "cannot type into $(session_of)"
  sleep "$CMD_PAUSE"
  tmux send-keys -t "$(session_of)" Enter
}

# /pstack off clears the status line rather than printing a replacement, so the
# proof is the notify text plus the absence of the status line.
status_off() {
  local screen="$1"
  printf '%s\n' "$screen" | grep -q "pstack mode off." || return 1
  printf '%s\n' "$screen" | tail -4 | grep -q "pstack: mode on" && return 1
  return 0
}

copy_config() {
  local agent="$1"
  mkdir -p "$agent"
  VERIFY_AGENT="$agent" python3 - <<'PY'
import json, os
agent = os.environ["VERIFY_AGENT"]
src = json.load(open(os.path.expanduser("~/.pi/agent/models.json")))
json.dump({"providers": {"cpa": src["providers"]["cpa"]}}, open(os.path.join(agent, "models.json"), "w"))
json.dump({
    "defaultProvider": "cpa",
    "defaultModel": "deepseek-flash-latest",
    "defaultThinkingLevel": "off",
    "quietStartup": True,
}, open(os.path.join(agent, "settings.json"), "w"))
PY
}

launch() {
  command -v pi >/dev/null || die "pi is not on PATH"
  command -v tmux >/dev/null || die "tmux is not on PATH"
  [ -f "$HOME/.pi/agent/models.json" ] || die "~/.pi/agent/models.json is missing, so the cpa provider cannot be copied"
  mkdir -p "$ROOT"
  local run session
  run="$(mktemp -d "$ROOT/run-XXXX")"
  session="$(basename "$run")"
  mkdir -p "$run/project" "$run/evidence"
  # Pin every later helper call in this launch to the new run, so the ready
  # check reads this session and not another live run.
  VERIFY_PSTACK_RUN="$run"
  copy_config "$run/agent" || die "could not copy the cpa provider from ~/.pi/agent/models.json"
  [ -f "$run/agent/models.json" ] && [ -f "$run/agent/settings.json" ] || die "agent config was not written to $run/agent"
  ( cd "$run/project" && PI_CODING_AGENT_DIR="$run/agent" pi install -l "$REPO" --approve ) >&2 || die "pi install failed"
  tmux new-session -d -s "$session" -x 140 -y 44 -c "$run/project" \
    "export PI_CODING_AGENT_DIR='$run/agent'; export TERM='${TERM:-xterm-256color}'; exec pi --approve --model cpa/deepseek-flash-latest --thinking off" \
    || die "tmux new-session failed"
  if ! wait_for "$READY" 30; then
    capture -40 >&2 || true
    die "Pi did not reach a ready prompt"
  fi
  echo "$run"
}

doctor() {
  local run screen pid
  run="$(run_of)"
  tmux has-session -t "$(session_of)" 2>/dev/null || die "tmux session $(session_of) is gone"
  pid="$(pane_pid)"
  [ -n "$pid" ] || die "pane has no pid"
  kill -0 "$pid" 2>/dev/null || die "pi process $pid is not alive"
  screen="$(capture -40)"
  printf '%s\n' "$screen" | grep -q "$READY" || die "ready footer is missing"
  printf '%s\n' "$screen" | grep -q "This project is not trusted" && die "project is not trusted; packages are ignored"
  ( cd "$run/project" && PI_CODING_AGENT_DIR="$run/agent" pi --version )
  echo "run=$run"
  echo "session=$(session_of)"
  echo "pid=$pid"
  echo "doctor: ok"
}

save_proof() {
  local run="$1" name="$2"
  capture -200 > "$run/evidence/$name.txt"
  echo "$run/evidence/$name.txt"
}

drive_status() {
  local run before after
  run="$(run_of)"
  type_cmd "/pstack status"
  wait_for "pstack mode off." 15 || die "/pstack status did not report the mode"
  before="$(capture -40)"
  printf '%s\n' "$before" | grep -q "pstack mode off." || die "missing 'pstack mode off.'"
  save_proof "$run" "status-before" >/dev/null
  type_cmd "/pstack"
  wait_for "pstack: mode on" 15 || die "status bar did not show pstack: mode on"
  type_cmd "/pstack status"
  wait_for "pstack mode on." 15 || die "/pstack status did not report the mode on"
  # Pi replaces the last notification, so the on state needs its own capture.
  capture -40 | grep -q "pstack: mode on" || die "status bar is missing pstack: mode on"
  save_proof "$run" "status-on" >/dev/null
  type_cmd "/pstack off"
  wait_for "pstack mode off." 15 || die "/pstack off did not notify"
  after="$(capture -60)"
  status_off "$after" || die "status bar still shows pstack: mode on after /pstack off"
  save_proof "$run" "status-after"
}

drive_task() {
  local run
  run="$(run_of)"
  # A token that appears nowhere in the skill text, so only the reply matches.
  type_cmd "/pstack 只回复 pstack-task-ok"
  wait_for "^ *pstack-task-ok *$" 40 || die "the model did not answer pstack-task-ok"
  capture -40 | grep -q "pstack: mode on" || die "status bar is missing pstack: mode on after the reply"
  save_proof "$run" "task" >/dev/null
  type_cmd "/pstack off"
  wait_for "pstack mode off." 15 || die "/pstack off did not notify after the task"
  save_proof "$run" "task-off"
}

drive_skill() {
  local run
  run="$(run_of)"
  # The alternate entry point: /skill:pstack turns the mode on by itself.
  type_cmd "/skill:pstack 只回复 pstack-skill-entry-ok"
  wait_for "^ *pstack-skill-entry-ok *$" 40 || die "the model did not answer pstack-skill-entry-ok"
  capture -40 | grep -q "pstack: mode on" || die "status bar is missing pstack: mode on after /skill:pstack"
  save_proof "$run" "skill-entry" >/dev/null
  type_cmd "/pstack off"
  wait_for "pstack mode off." 15 || die "/pstack off did not notify after /skill:pstack"
  save_proof "$run" "skill-entry-off"
}

# Proves a skill is registered and that its body reaches the model. The token
# asked for appears only in that skill's body, which is hidden from the prompt
# listing, so the model cannot answer it without the expansion.
drive_load() {
  local run session
  run="$(run_of)"
  session="$(session_of)"
  tmux send-keys -t "$session" '/'
  sleep "$CMD_PAUSE"
  tmux send-keys -t "$session" -l -- "skill:pstack-statechart"
  sleep 0.8
  capture -30 | grep -q "skill:pstack-statechart" || die "the slash menu did not list skill:pstack-statechart"
  save_proof "$run" "skill-menu" >/dev/null
  # Escape closes the menu and keeps the typed text in the editor.
  tmux send-keys -t "$session" Escape
  sleep "$CMD_PAUSE"
  tmux send-keys -t "$session" -l -- " 只回答一个问题，只回复一个词：要把一个已有的 TLA+ 模型画成图，用哪个方向？"
  sleep "$CMD_PAUSE"
  tmux send-keys -t "$session" Enter
  wait_for "from-spec" 40 || die "the model did not answer from-spec, so the skill body did not reach it"
  save_proof "$run" "skill-run"
}

drive_plan() {
  local run
  run="$(run_of)"
  # The widget only exists because the model calls pstack_plan, so this spends
  # a real request and needs a model that follows the instruction.
  type_cmd "/pstack 只调用一次 pstack_plan 工具：playbook 填 demo，两步，第一步 status done，第二步 status active。然后只回复 plan-widget-ok。不要调用其他工具。"
  wait_for "pstack · demo · 1/2" 60 || die "the plan widget did not show the demo plan"
  save_proof "$run" "plan-on" >/dev/null
  type_cmd "/pstack off"
  wait_for "pstack mode off." 15 || die "/pstack off did not notify after the plan"
  capture -40 | grep -q "pstack · demo" && die "the plan widget survived /pstack off"
  save_proof "$run" "plan-off"
}

drive_menu() {
  local run session
  run="$(run_of)"
  session="$(session_of)"
  tmux send-keys -t "$session" '/'
  sleep "$CMD_PAUSE"
  tmux send-keys -t "$session" -l -- "pstack"
  sleep 0.6
  capture -30 | grep -q "Turn pstack mode on" || die "the slash menu did not list /pstack"
  save_proof "$run" "menu-open" >/dev/null
  tmux send-keys -t "$session" Tab
  sleep "$CMD_PAUSE"
  tmux send-keys -t "$session" Enter
  wait_for "pstack: mode on" 15 || die "Tab then Enter did not run /pstack"
  save_proof "$run" "menu" >/dev/null
  type_cmd "/pstack off"
  wait_for "pstack mode off." 15 || die "/pstack off did not notify after the menu"
  save_proof "$run" "menu-off"
}

cleanup() {
  local run session pid
  run="$(run_of)"
  session="$(basename "$run")"
  if tmux has-session -t "$session" 2>/dev/null; then
    pid="$(tmux list-panes -t "$session" -F '#{pane_pid}' | head -1)"
    tmux kill-session -t "$session"
    if [ -n "$pid" ]; then
      for _ in 1 2 3 4 5; do
        kill -0 "$pid" 2>/dev/null || break
        sleep 0.2
      done
      if kill -0 "$pid" 2>/dev/null; then
        kill "$pid" 2>/dev/null || true
        sleep 0.5
        kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null || true
      fi
    fi
  fi
  tmux has-session -t "$session" 2>/dev/null && die "session $session survived cleanup"
  rm -rf "$run/project" "$run/agent"
  echo "cleaned $run; evidence remains in $run/evidence"
}

case "${1:-}" in
  launch) launch ;;
  doctor) doctor ;;
  drive)
    case "${2:-}" in
      pstack-status) drive_status ;;
      pstack-task) drive_task ;;
      pstack-skill) drive_skill ;;
      skill-load) drive_load ;;
      plan-widget) drive_plan ;;
      slash-menu) drive_menu ;;
      *) die "unknown feature '${2:-}'. Use pstack-status, pstack-task, pstack-skill, skill-load, plan-widget, or slash-menu" ;;
    esac
    ;;
  cleanup) cleanup ;;
  *) die "usage: drive.sh <launch|doctor|drive|cleanup> [feature-id]" ;;
esac

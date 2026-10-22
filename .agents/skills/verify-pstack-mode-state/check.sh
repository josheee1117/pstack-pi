#!/bin/sh
# Model-check extensions/pstack.js mode and plan state.
# TLC 2.19, invoked as: ~/.local/bin/tlc
set -e
cd "$(dirname "$0")"
exec "$HOME/.local/bin/tlc" -workers 1 -cleanup -metadir "${TMPDIR:-/tmp}/verify-pstack-mode-state" -config ModeState.cfg ModeState.tla

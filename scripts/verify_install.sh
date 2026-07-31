#!/usr/bin/env sh
set -eu
HA_CONFIG="${1:-/config}"
BASE="$HA_CONFIG/custom_components/trouble_championship"

grep '"version": "0.0.2"' "$BASE/manifest.json"
grep 'STORAGE_VERSION = 1' "$BASE/const.py"
grep 'PANEL_COMPONENT = "trouble-league-panel-v002"' "$BASE/const.py"
grep -q '?v=0.0.2' "$BASE/__init__.py"
grep -q '.matrix-wrap{' "$BASE/frontend/trouble-league-panel.js"
grep -q '.hof-grid{display:grid' "$BASE/frontend/trouble-league-panel.js"
echo "OK: Board Game Tracker v0.0.2 CSS repair is installed."

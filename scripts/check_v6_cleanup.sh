#!/usr/bin/env sh
set -eu
CFG="${1:-/config}/configuration.yaml"

echo "Checking for obsolete Trouble panel YAML..."
if grep -nE 'trouble-league-panel|trouble-championship-panel|url_path:[[:space:]]*trouble-(league|arcade)' "$CFG"; then
  echo
  echo "REMOVE the matching Trouble panel item from panel_custom before restarting."
  exit 2
fi

echo "OK: no obsolete Trouble panel YAML found."

#!/usr/bin/env sh
set -eu

REPO_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
HA_CONFIG="${1:-/config}"

echo "Deploying Trouble Championship from: $REPO_DIR"
echo "Home Assistant config directory:     $HA_CONFIG"

if [ ! -d "$HA_CONFIG/custom_components" ]; then
  echo "ERROR: $HA_CONFIG/custom_components does not exist."
  exit 1
fi

# Only replace source code. Never touch /config/.storage.
rm -rf "$HA_CONFIG/custom_components/trouble_championship"
cp -R "$REPO_DIR/custom_components/trouble_championship" \
      "$HA_CONFIG/custom_components/trouble_championship"

mkdir -p "$HA_CONFIG/www"
cp "$REPO_DIR/www/trouble-league-panel.js" \
   "$HA_CONFIG/www/trouble-league-panel.js"

echo
echo "Deployment complete."
echo "The event log in $HA_CONFIG/.storage was not modified."
echo "Restart Home Assistant, then hard-refresh the browser."

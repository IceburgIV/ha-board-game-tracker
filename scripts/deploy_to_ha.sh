#!/usr/bin/env sh
set -eu

REPO_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
HA_CONFIG="${1:-/config}"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_ROOT="$HA_CONFIG/trouble_championship_backups"
BACKUP_DIR="$BACKUP_ROOT/$STAMP"

echo "Creating rollback backup: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

if [ -d "$HA_CONFIG/custom_components/trouble_championship" ]; then
  cp -a "$HA_CONFIG/custom_components/trouble_championship" "$BACKUP_DIR/integration"
fi

mkdir -p "$BACKUP_DIR/storage"
for file in "$HA_CONFIG"/.storage/trouble_championship.*; do
  [ -e "$file" ] || continue
  cp -a "$file" "$BACKUP_DIR/storage/"
done

echo "Deploying self-contained integration..."
rm -rf "$HA_CONFIG/custom_components/trouble_championship"
mkdir -p "$HA_CONFIG/custom_components"
cp -a "$REPO_DIR/custom_components/trouble_championship" \
      "$HA_CONFIG/custom_components/trouble_championship"

echo "Deployment complete."
echo "No /config/www copy and no panel_custom YAML are required."
echo "Restart Home Assistant, then refresh the browser."

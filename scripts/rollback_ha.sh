#!/usr/bin/env sh
set -eu

HA_CONFIG="${1:-/config}"
BACKUP_ROOT="$HA_CONFIG/trouble_championship_backups"
BACKUP_DIR="${2:-}"

if [ -z "$BACKUP_DIR" ]; then
  BACKUP_DIR="$(find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d | sort | tail -n 1)"
fi

if [ -z "$BACKUP_DIR" ] || [ ! -d "$BACKUP_DIR" ]; then
  echo "ERROR: No rollback backup found."
  exit 1
fi

echo "Rolling back from: $BACKUP_DIR"

if [ -d "$BACKUP_DIR/integration" ]; then
  rm -rf "$HA_CONFIG/custom_components/trouble_championship"
  cp -a "$BACKUP_DIR/integration" "$HA_CONFIG/custom_components/trouble_championship"
fi

if [ -d "$BACKUP_DIR/storage" ]; then
  for file in "$BACKUP_DIR"/storage/*; do
    [ -e "$file" ] || continue
    cp -a "$file" "$HA_CONFIG/.storage/"
  done
fi

echo "Rollback files restored."
echo "Run: ha core check && ha core restart"

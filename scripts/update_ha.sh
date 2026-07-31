#!/usr/bin/env sh
set -eu

REPO_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$REPO_DIR"

echo "Updating repository..."
git pull --ff-only

echo "Deploying updated files..."
sh "$REPO_DIR/scripts/deploy_to_ha.sh" "${1:-/config}"

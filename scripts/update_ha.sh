#!/usr/bin/env sh
set -eu
REPO_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$REPO_DIR"
git pull --ff-only
sh "$REPO_DIR/scripts/deploy_to_ha.sh" "${1:-/config}"
ha core check
ha core restart

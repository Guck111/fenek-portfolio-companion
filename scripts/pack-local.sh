#!/usr/bin/env bash
# Builds and packs the project into a .mcpb installable in Claude Desktop.
# Builds first (needs tsc from devDeps), then prunes, then packs, and
# restores devDeps unconditionally on EXIT so the dev workflow keeps working.
set -euo pipefail

trap 'echo "[pack-local] restoring devDependencies..."; npm install --silent' EXIT

echo "[pack-local] building TypeScript..."
npm run build

echo "[pack-local] pruning to production deps..."
npm prune --omit=dev --silent

echo "[pack-local] packing .mcpb..."
mcpb pack

echo
echo "[pack-local] done. Bundle: $(ls -lh ./*.mcpb | tail -1)"

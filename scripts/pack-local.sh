#!/usr/bin/env bash
# Builds and packs the project into a .mcpb installable in Claude Desktop.
# Builds first (needs tsc from devDeps), stashes the lockfile-verified mcpb CLI,
# then prunes, then packs with that stashed copy (never whatever `mcpb` happens
# to be on PATH), and restores devDeps unconditionally on EXIT.
set -euo pipefail

TOOLING_DIR=$(mktemp -d)
trap 'echo "[pack-local] restoring devDependencies..."; npm install --silent; rm -rf "$TOOLING_DIR"' EXIT

echo "[pack-local] building TypeScript..."
npm run build

echo "[pack-local] stashing lockfile-verified mcpb CLI..."
BIN_REL=$(node -p "const b = require('@anthropic-ai/mcpb/package.json').bin; typeof b === 'string' ? b : b.mcpb")
cp -R node_modules "$TOOLING_DIR/node_modules"
MCPB_CLI="$TOOLING_DIR/node_modules/@anthropic-ai/mcpb/$BIN_REL"

echo "[pack-local] pruning to production deps..."
npm prune --omit=dev --silent

echo "[pack-local] packing .mcpb..."
node "$MCPB_CLI" pack

echo
echo "[pack-local] done. Bundle: $(ls -lh ./*.mcpb | tail -1)"

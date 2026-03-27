#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# Render build script for AESTHETICS (single-service deployment)
# Build command on Render: bash render-build.sh
# ─────────────────────────────────────────────────────────────────
set -e

echo ">>> Installing dependencies..."
npm install -g pnpm
pnpm install --frozen-lockfile

echo ">>> Building frontend (Vite)..."
# Vite config requires PORT and BASE_PATH at build time.
# PORT is a dummy value for build only; BASE_PATH=/ means served from root.
PORT=3000 BASE_PATH=/ NODE_ENV=production \
  pnpm --filter @workspace/aesthetic-wallpapers run build

echo ">>> Building backend (API server)..."
pnpm --filter @workspace/api-server run build

echo ">>> Build complete."
echo "    Frontend → artifacts/aesthetic-wallpapers/dist/public"
echo "    Backend  → artifacts/api-server/dist/index.mjs"

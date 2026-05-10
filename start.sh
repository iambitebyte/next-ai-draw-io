#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_NAME="next-ai-draw-io"

echo "Building standalone output..."
npm run build

echo "Starting ${APP_NAME} with pm2..."
pm2 start "${SCRIPT_DIR}/.next/standalone/server.js" \
    --name "${APP_NAME}" \
    --cwd "${SCRIPT_DIR}"

echo "Done. Use 'pm2 logs ${APP_NAME}' to view logs."

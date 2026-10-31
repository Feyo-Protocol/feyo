#!/usr/bin/env bash
# Run after npm ci and npm run build. Uses a pinned ephemeral browser-test dependency.
set -euo pipefail
npm install --no-save --package-lock=false @playwright/test@1.56.1
npx playwright install chromium
npx playwright test --config playwright.config.mjs

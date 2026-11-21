#!/usr/bin/env bash
# Run after npm ci, npm run test:browser:install, and npm run build.
set -euo pipefail
npm run test:browser

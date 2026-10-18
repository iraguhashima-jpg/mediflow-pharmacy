#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../backend"
node src/seed.js

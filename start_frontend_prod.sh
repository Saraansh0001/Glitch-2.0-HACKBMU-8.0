#!/usr/bin/env bash
set -e

echo "Single-host production mode is enabled."
echo "Starting full app via start_backend_prod.sh on http://localhost:5050 ..."
"$(dirname "$0")/start_backend_prod.sh"

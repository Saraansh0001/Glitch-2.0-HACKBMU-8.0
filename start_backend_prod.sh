#!/usr/bin/env bash
set -e

ROOT_DIR="$(dirname "$0")"

cd "$ROOT_DIR/frontend"
npm install --no-audit
npm run build

cd "$ROOT_DIR/backend"

if [ -d "venv" ]; then
  source venv/bin/activate
else
  python3 -m venv venv
  source venv/bin/activate
fi

python -m pip install -r requirements.txt

export FLASK_ENV=production
export PORT="${PORT:-5050}"
export FRONTEND_ORIGIN="${FRONTEND_ORIGIN:-http://localhost:${PORT}}"

python -m gunicorn -w 2 -b 0.0.0.0:"$PORT" app.main:app

#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/backend"

if [ ! -d "venv" ]; then
  python3 -m venv venv
fi

source venv/bin/activate
python -m pip install -r requirements.txt

export FLASK_ENV=development
export SECRET_KEY=satyanetra-dev-secret-2024
export PORT=5000

python -m flask --app app.main run --port "$PORT"

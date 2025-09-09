#!/usr/bin/env bash
set -eo pipefail  # leave -u off for now; we re-enable after conda activate
# set -x  # uncomment to debug

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT_BACKEND="${PORT_BACKEND:-8000}"

echo "==> Bootstrapping conda environment 'gbros'"

# --- Temporarily relax nounset for conda init/activate ---
set +u
if command -v conda >/dev/null 2>&1; then
  eval "$(conda shell.bash hook)"
else
  for CAND in "$HOME/miniconda3/etc/profile.d/conda.sh" \
              "$HOME/anaconda3/etc/profile.d/conda.sh" \
              "/opt/conda/etc/profile.d/conda.sh"; do
    if [[ -f "$CAND" ]]; then
      # shellcheck source=/dev/null
      source "$CAND"
      break
    fi
  done
  if ! command -v conda >/dev/null 2>&1; then
    echo "Error: conda not found. Please install Miniconda/Anaconda or add it to PATH." >&2
    exit 1
  fi
fi

if ! conda activate gbros >/dev/null 2>&1; then
  echo "Error: conda env 'gbros' not found. Create it and install backend deps (fastapi, uvicorn, orjson)." >&2
  exit 1
fi
set -u
# --- nounset back on ---

# Prefer repo-level data directory if present
DATA_DIR="$ROOT_DIR/data"
if [[ ! -d "$DATA_DIR" ]]; then
  DATA_DIR="$ROOT_DIR/backend/data"
fi

# Cleanup trap (defined early) — guard PID existence
cleanup() {
  printf "\n==> Stopping backend%s\n" "${BACKEND_PID:+ (pid $BACKEND_PID)}"
  if [[ -n "${BACKEND_PID:-}" ]]; then
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

# replace your backend launch with this
echo "==> Starting backend (uvicorn) on :$PORT_BACKEND using DATA_DIR=$DATA_DIR"
pushd "$ROOT_DIR/backend" >/dev/null
  # sanity check (optional, but nice for debugging)
  python - <<'PY' || { echo "Conda env doesn't have fastapi/uvicorn"; exit 1; }
import sys
print("Python:", sys.executable)
import fastapi, uvicorn
print("fastapi ok, uvicorn ok")
PY

  DATA_DIR="$DATA_DIR" python -m uvicorn app.main:app \
    --reload --host 0.0.0.0 --port "$PORT_BACKEND" &
  BACKEND_PID=$!
popd >/dev/null

echo "==> Launching frontend dev server (opens browser)"
pushd "$ROOT_DIR/frontend" >/dev/null
  npm run dev -- --open
popd >/dev/null

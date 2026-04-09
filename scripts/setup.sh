#!/bin/bash
# First-time bootstrap for OpenAgent on a fresh machine.
#
# This script only handles what `openagent setup` cannot do itself — create
# the Python venv and install the package — and then delegates everything
# else (Docker, OS service registration, image pulls, checks) to
# `openagent setup --full`.
#
# Usage:
#   ./scripts/setup.sh            # minimal: venv + pip install + doctor
#   ./scripts/setup.sh --full     # also run `openagent setup --full`
#
# Prerequisites: Python 3.11+

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
MODE="${1:-}"
RUNTIME_ROOT="${OPENAGENT_HOME:-$HOME/.openagent}"
VENV_DIR="$RUNTIME_ROOT/runtime/venv"
CONFIG_PATH="$RUNTIME_ROOT/openagent.yaml"
MEMORIES_DIR="$RUNTIME_ROOT/memories"

cd "$PROJECT_DIR"

echo "=== OpenAgent bootstrap ==="

# 1. Python venv
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating Python virtual environment..."
    mkdir -p "$(dirname "$VENV_DIR")"
    python3 -m venv "$VENV_DIR"
fi

echo "Upgrading pip/setuptools/wheel..."
"$VENV_DIR/bin/pip" install --quiet --upgrade pip setuptools wheel

echo "Installing openagent-framework..."
if [ -f "pyproject.toml" ]; then
    "$VENV_DIR/bin/pip" install --quiet -e ".[all]"
else
    "$VENV_DIR/bin/pip" install --quiet "openagent-framework[all]"
fi

# 2. Memories dir
mkdir -p "$MEMORIES_DIR"

# 3. Config check
if [ ! -f "$CONFIG_PATH" ]; then
    echo ""
    echo "WARNING: no openagent.yaml found at $CONFIG_PATH."
    echo "Create one before running 'openagent serve'."
fi

echo ""
echo "=== Running openagent doctor ==="
"$VENV_DIR/bin/openagent" doctor || true

# 4. Optional: full platform setup (Docker, OS service, image pulls)
if [ "$MODE" = "--full" ] || [ "$MODE" = "full" ]; then
    echo ""
    echo "=== Running openagent setup --full ==="
    "$VENV_DIR/bin/openagent" setup --full || {
        echo "openagent setup --full reported errors — see above."
    }
fi

echo ""
echo "=== Bootstrap complete ==="
echo ""
echo "Next steps:"
echo "  openagent doctor            # verify environment"
echo "  openagent setup --full      # install Docker + OS service + pull images"
echo "  ./scripts/start.sh          # start OpenAgent in a screen session"

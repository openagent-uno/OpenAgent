#!/bin/bash
# setup-syncthing-mac.sh — install and configure Syncthing on macOS so it
# can pair with an OpenAgent VPS and sync the memory vault as a local
# folder you can open with the native Obsidian desktop client.
#
# Usage:
#   ./setup-syncthing-mac.sh [VAULT_DIR]
#
# VAULT_DIR defaults to ~/Documents/OpenAgent-Vault.
#
# What it does:
#   1. Installs Homebrew if missing (optional, asks first).
#   2. `brew install syncthing` and `brew services start syncthing`.
#   3. Waits for the Syncthing daemon to come up (GUI on 127.0.0.1:8384).
#   4. Creates VAULT_DIR if it doesn't exist.
#   5. Reads the local Mac's device ID and prints it.
#   6. Prints step-by-step pairing instructions (the VPS is on the other
#      side; you paste device IDs into both GUIs).

set -e

VAULT_DIR="${1:-$HOME/Documents/OpenAgent-Vault}"
SYNCTHING_CONFIG="$HOME/Library/Application Support/Syncthing"
GUI_URL="http://127.0.0.1:8384"

echo "=== OpenAgent Syncthing setup (macOS) ==="
echo

# ---- 1. Homebrew ----
if ! command -v brew &> /dev/null; then
    echo "Homebrew is not installed."
    read -rp "Install Homebrew now? [y/N] " ans
    if [[ "$ans" =~ ^[Yy]$ ]]; then
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    else
        echo "Aborting. Install brew yourself and re-run this script."
        exit 1
    fi
fi

# ---- 2. Syncthing ----
if ! command -v syncthing &> /dev/null; then
    echo "Installing Syncthing via Homebrew..."
    brew install syncthing
else
    echo "Syncthing is already installed: $(syncthing --version 2>/dev/null | head -1)"
fi

echo
echo "Starting Syncthing as a LaunchAgent..."
brew services start syncthing >/dev/null 2>&1 || true
# brew services start is idempotent; if already running, leave it alone
brew services list | grep -E '^syncthing' | head -1

# ---- 3. Wait for daemon ----
echo
echo -n "Waiting for Syncthing daemon to be ready"
for i in $(seq 1 30); do
    if [ -f "$SYNCTHING_CONFIG/config.xml" ]; then
        echo "  OK"
        break
    fi
    echo -n "."
    sleep 1
done
if [ ! -f "$SYNCTHING_CONFIG/config.xml" ]; then
    echo
    echo "ERROR: Syncthing config never appeared at:"
    echo "  $SYNCTHING_CONFIG/config.xml"
    echo "Check 'brew services list' and try again."
    exit 1
fi

# ---- 4. Vault directory ----
echo
if [ ! -d "$VAULT_DIR" ]; then
    echo "Creating vault directory: $VAULT_DIR"
    mkdir -p "$VAULT_DIR"
else
    echo "Vault directory already exists: $VAULT_DIR"
fi

# ---- 5. Extract device ID ----
# Syncthing's local device is the first <device> in config.xml that has
# no <address> child pointing somewhere remote. For fresh installs this is
# always the first one. We use python for XML parsing since it's built-in
# on every macOS.
DEVICE_ID=$(python3 -c "
import xml.etree.ElementTree as ET
tree = ET.parse('$SYNCTHING_CONFIG/config.xml')
root = tree.getroot()
d = root.find('./device')
print(d.get('id') if d is not None else '')
")

if [ -z "$DEVICE_ID" ]; then
    echo "ERROR: could not read Syncthing device ID from config.xml"
    exit 1
fi

# ---- 6. Print next steps ----
cat <<EOF

──────────────────────────────────────────────────────────────────────
  Mac Syncthing is ready.
──────────────────────────────────────────────────────────────────────

  This Mac's device ID:
    $DEVICE_ID

  GUI on this Mac:
    $GUI_URL

  Vault directory (open this in Obsidian later):
    $VAULT_DIR

──────────────────────────────────────────────────────────────────────
  Pairing steps
──────────────────────────────────────────────────────────────────────

  On the VPS (where openagent serve is running), SSH in and forward the
  remote Syncthing GUI so you can open it in your Mac browser:

    ssh -L 8385:127.0.0.1:8384 ubuntu@YOUR_VPS_HOST

  Then in your Mac browser open:

    http://127.0.0.1:8385        ← VPS Syncthing GUI
    http://127.0.0.1:8384        ← Mac Syncthing GUI (this one)

  1. In the VPS GUI (:8385), click "Add Remote Device" and paste
     THIS Mac's device ID:
         $DEVICE_ID
     Save.

  2. In the Mac GUI (:8384), a popup should appear asking to accept
     the VPS device. Accept it.

  3. In the VPS GUI, find the folder "openagent-memories", click Edit,
     switch to the "Sharing" tab, and tick the newly-added Mac device.
     Save.

  4. In the Mac GUI, a popup should appear asking whether to accept the
     shared folder. Accept it, then choose:
         Folder path: $VAULT_DIR

  5. Sync starts automatically. Watch the progress bar in either GUI.

  6. Once the first sync finishes, open Obsidian → Open folder as vault
     → pick $VAULT_DIR. You now have the same memory vault as the
     VPS, editable on both sides, kept in sync by Syncthing.

──────────────────────────────────────────────────────────────────────
EOF

# Examples

Sanitized copies of a real production OpenAgent deployment.

## `openagent.yaml`

Full production-style config with:
- 10+ user MCPs (GitHub, Firebase, Google Play, App Store Connect, Sentry, ClickUp, SSH, Google Workspace, Google Analytics, Quo)
- All 7 bundled defaults enabled (filesystem, editor, web-search, shell, computer-control, chrome-devtools, messaging)
- Telegram channel with an allowlist
- Syncthing aux service for bidirectional vault sync with your laptop
- Scheduler with three recurring tasks (health-check, git-sync, daily-costs-report)
- Dream mode (nightly maintenance)
- Auto-update every 6h from PyPI

Every secret and host-specific string has been replaced with a `YOUR_*` placeholder or a `${ENV_VAR}` reference. Before using:

1. Copy the file: `cp docs/examples/openagent.yaml ~/OpenAgent/openagent.yaml`
2. Replace every `YOUR_*` placeholder with a real value
3. Either inline your tokens or export the `${VAR}` references as env vars in your shell / systemd unit
4. Delete the MCPs you don't need — the file is long on purpose, not because every deployment needs all of them

## `setup-syncthing-mac.sh`

Companion script for macOS. Installs Syncthing via Homebrew, starts it as a LaunchAgent via `brew services`, creates a local vault directory, and prints step-by-step instructions for pairing your Mac with the VPS that's running OpenAgent.

Usage:

```bash
# default vault path: ~/Documents/OpenAgent-Vault
./docs/examples/setup-syncthing-mac.sh

# or pick your own
./docs/examples/setup-syncthing-mac.sh ~/Documents/MyVault
```

The script prints the Mac's Syncthing device ID and walks you through the six clicks (three on each side) that complete the handshake.

## `workspace-mcp.service`

A systemd `--user` unit file for running the Google Workspace MCP as a standalone HTTP service alongside OpenAgent. The `openagent.yaml` example above references it via `url: http://localhost:8000/mcp`.

Key gotcha: FastMCP (which workspace-mcp uses under the hood) crashes on a non-TTY stdout when Rich colors are enabled, so the unit sets `PYTHONUNBUFFERED=1`, `NO_COLOR=1` and `TERM=dumb`. Without these the service exits immediately with code 1.

Install:

```bash
pipx install workspace-mcp         # or `uv tool install workspace-mcp`
mkdir -p ~/.config/systemd/user
cp docs/examples/workspace-mcp.service ~/.config/systemd/user/
# edit the placeholders
systemctl --user daemon-reload
systemctl --user enable --now workspace-mcp
# on a headless VPS:
sudo loginctl enable-linger $USER
```

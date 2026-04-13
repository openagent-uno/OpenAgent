# Getting Started

This guide installs the **Agent Server**. The CLI Client and Desktop App are separate downloads that connect to a running server.

## Installation

### Option A: Standalone Executable (recommended)

Download the latest executable for your platform from [GitHub Releases](https://github.com/geroale/OpenAgent/releases):

- **macOS**: `openagent-*-macos-arm64.tar.gz` (Apple Silicon) or `openagent-*-macos-x64.tar.gz` (Intel)
- **Linux**: `openagent-*-linux-x64.tar.gz`
- **Windows**: `openagent-*-windows-x64.zip`

Extract and run — no Python required. The executable bundles all dependencies and self-updates from GitHub Releases.

::: info Prerequisites
Node.js 18+ is required for the built-in MCP servers (filesystem, editor, shell, web-search, etc.).
:::

### Option B: pip install

```bash
pip install openagent-framework[all]
```

Individual extras:
```bash
pip install openagent-framework          # core server runtime
pip install openagent-framework[telegram] # + Telegram
pip install openagent-framework[discord]  # + Discord
pip install openagent-framework[whatsapp] # + WhatsApp
pip install openagent-framework[websocket] # + WebSocket channel
pip install openagent-framework[voice]    # + local voice transcription (faster-whisper)
pip install openagent-framework[all]      # everything
```

## First Run

### With agent directory (recommended for multi-agent)

```bash
openagent serve ./my-agent
```

This creates `./my-agent/` with a default `openagent.yaml`, database, memory vault, and logs. Edit `./my-agent/openagent.yaml` to configure your agent.

### Without agent directory (legacy)

Create `openagent.yaml` in your working directory (or in `~/.config/openagent/` on Linux, `~/Library/Application Support/OpenAgent/` on macOS, `%APPDATA%\OpenAgent\` on Windows):

```yaml
name: my-agent

model:
  provider: claude-cli
  model_id: claude-sonnet-4-6
  permission_mode: bypass

channels:
  telegram:
    token: ${TELEGRAM_BOT_TOKEN}
```

```bash
openagent serve
```

The agent will:
1. Load config from `openagent.yaml`
2. Connect all configured MCPs (8 defaults + your custom ones)
3. Start configured channels (Telegram, Discord, WebSocket, etc.)
4. Start the scheduler (if enabled)

Send a message to your Telegram bot — it will respond.

## Running Multiple Agents

Each agent runs from its own directory with independent config, database, memory, and port:

```bash
openagent serve ./agent-work    # starts on port 8765
openagent serve ./agent-home    # auto-selects next available port
```

List running agents:
```bash
openagent list
```

Migrate existing data to an agent directory:
```bash
openagent migrate --to ./my-agent
```

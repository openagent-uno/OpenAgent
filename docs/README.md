# OpenAgent

Simplified LLM agent framework with MCP tools, persistent memory, and multi-channel support. Model-agnostic — all models get the same tools and capabilities.

## Quick Start

```bash
pip install openagent-framework[all]
```

Create `openagent.yaml`:

```yaml
name: my-agent

model:
  provider: claude-cli       # uses Claude Pro/Max membership (not API)

channels:
  telegram:
    token: ${TELEGRAM_BOT_TOKEN}
```

Start:

```bash
openagent serve
```

---

## Models

OpenAgent supports multiple LLM providers. Every model gets the same MCP tools — no provider-specific behavior.

### Claude CLI (Claude Code SDK) — uses membership, not API

```yaml
model:
  provider: claude-cli
  model_id: claude-sonnet-4-6
  permission_mode: bypass     # auto-approve all tool calls (for agent use)
```

Requires `claude` CLI installed and authenticated (`claude login`). Uses your Claude Pro/Max membership — flat rate, not pay-per-token.

### Claude API (Anthropic SDK)

```yaml
model:
  provider: claude-api
  model_id: claude-sonnet-4-6
  api_key: ${ANTHROPIC_API_KEY}
```

### Z.ai GLM / Any OpenAI-compatible

```yaml
model:
  provider: zhipu
  model_id: glm-5                              # or glm-4-plus, glm-4-flash, glm-4
  api_key: ${ZAI_API_KEY}                       # also accepts ZHIPU_API_KEY
  base_url: https://api.z.ai/api/paas/v4        # new Z.ai endpoint (replaces open.bigmodel.cn)
```

Works with Ollama, vLLM, LM Studio — just change `base_url`:

```yaml
model:
  provider: zhipu
  model_id: llama3
  base_url: http://localhost:11434/v1
  api_key: ollama
```

---

## MCP (Model Context Protocol)

All MCP tools are available to every model — model-agnostic by design. OpenAgent includes **7 default MCPs** that load automatically.

### Default MCPs (always loaded)

| Name | Source | What it does | Requires |
|---|---|---|---|
| `filesystem` | Official [@modelcontextprotocol/server-filesystem](https://www.npmjs.com/package/@modelcontextprotocol/server-filesystem) | Read, write, list, search files | Node.js |
| `editor` | Bundled | `edit` (find-replace), `grep` (regex search), `glob` (pattern match) | Node.js |
| `web-search` | Bundled [web-search-mcp](https://github.com/mrkrsl/web-search-mcp) | Web search + page fetch, no API key | Node.js + Playwright |
| `shell` | Bundled | `shell_exec`, `shell_which` — cross-platform shell | Node.js |
| `computer-control` | Bundled | Screenshot, mouse, keyboard (macOS/Linux/Windows) | Node.js |
| `chrome-devtools` | Bundled [chrome-devtools-mcp](https://www.npmjs.com/package/chrome-devtools-mcp) | Browser automation, DOM, performance (29+ tools) | Node.js + Chrome |
| `messaging` | Bundled | `telegram_send_message/file`, `discord_send_message/file`, `whatsapp_send_message/file` | Channel tokens in config |

The messaging MCP auto-detects which channel tokens are configured and only registers tools for active channels.

### Disabling Defaults

```yaml
mcp_defaults: false                    # disable all
mcp_disable: ["computer-control"]      # disable specific ones
```

### Adding Your Own MCPs

User MCPs are merged on top of defaults. Same name = override.

```yaml
mcp:
  # Any stdio MCP (Node, Python, Go, Rust — anything)
  - name: github
    command: ["github-mcp-server", "stdio"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: ${GITHUB_TOKEN}

  # npx-based MCPs
  - name: sentry
    command: ["npx", "-y", "@sentry/mcp-server@latest"]
    env:
      SENTRY_ACCESS_TOKEN: ${SENTRY_TOKEN}

  # Remote MCP (SSE or Streamable HTTP, with automatic fallback)
  - name: remote-tool
    url: "http://localhost:8080/sse"

  # Remote MCP with OAuth (opens browser for first-time login)
  - name: service
    url: "https://mcp.example.com/sse"
    oauth: true
```

### Important: Claude CLI and `--mcp-config`

When using `claude-cli` as the model provider, OpenAgent passes all MCPs to Claude CLI via `--mcp-config`. Known constraints:

- **Requires Claude CLI 2.1.96+** (older versions ignore `--mcp-config`)
- **Do NOT use `cwd` field** in MCP config — Claude CLI silently drops servers with `cwd`
- **`type: stdio` is required** in the JSON config for each server
- Use **absolute paths** in commands/args (no relative paths)

These are handled automatically by OpenAgent — you just write `openagent.yaml` normally.

---

## Memory

OpenAgent's long-term memory is a plain **Obsidian-compatible markdown vault**. The agent reads and writes `.md` files directly via the [`mcpvault`](https://www.npmjs.com/package/@bitbonsai/mcpvault) MCP — no custom index, no full-text engine, no proprietary format. The files on disk *are* the database.

Session history (the per-conversation message log) is handled separately by the Claude Agent SDK's `resume=session_id`; OpenAgent no longer keeps it in SQLite. The SQLite file is only used for scheduled tasks.

### Configuration

```yaml
memory:
  db_path: "./openagent.db"     # SQLite — scheduled tasks only
  vault_path: "./memories"      # Obsidian markdown vault
```

### How it works

- The agent writes notes as `.md` files inside `vault_path/`
- MCPVault exposes `list_notes`, `read_note`, `write_note`, `search_notes`, `get_backlinks`, etc.
- Open the same `memories/` folder in Obsidian desktop and you get graph view, backlinks and plugin support for free
- Or enable the built-in **Obsidian web** service (see [Services](#services)) to run Obsidian desktop *inside a browser*, directly on the VPS

### Memory file format

```markdown
---
title: Deploy Wardrobe Service
type: reference
tags: [k8s, wardrobe, ovh]
created: 2026-04-07
---

# Deploy Wardrobe Service

rsync + docker build + k3s import...
See also: [[server-architecture]]
```

`[[wikilinks]]`, tags and YAML frontmatter are standard Obsidian conventions. Nothing is OpenAgent-specific.

---

## Services

Auxiliary services run alongside the agent and are managed by the same lifecycle (`openagent serve` starts them, shutdown stops them). Each service is a plug-in — currently there's one built-in, `obsidian_web`, and the same pattern can host a VNC server, a Caddy reverse proxy, or anything else that needs to live next to the agent.

### Obsidian web (built-in)

Runs the real Obsidian desktop app inside a Docker container (`lscr.io/linuxserver/obsidian`) with KasmVNC as the web frontend. The `memories/` vault is mounted read/write into the container, so any note the agent writes is visible immediately in the UI, and vice versa.

```yaml
services:
  obsidian_web:
    enabled: true
    port: 8200
    username: admin
    password: ${OBSIDIAN_PASSWORD}      # required
    vault_path: /home/ubuntu/OpenAgent/memories
```

Access: `http://<host>:8200` → KasmVNC login → full Obsidian desktop. Graph view, plugins, themes all work. The container uses `--restart=unless-stopped`, so it survives agent crashes too.

Requires Docker on the host. `openagent setup --full` installs Docker on Linux automatically and pulls the image for you.

Manual control:

```bash
openagent services status       # check every configured aux service
openagent services start
openagent services stop
```

---

## Channels

All channels support text, images, files, voice, and video. Live status updates show what the agent is doing ("⏳ Thinking..." → "🔧 Using shell_exec..." → response).

### Telegram

```yaml
channels:
  telegram:
    token: ${TELEGRAM_BOT_TOKEN}
    allowed_users: ["123456789", "987654321"]   # optional whitelist
```

### Discord

```yaml
channels:
  discord:
    token: ${DISCORD_BOT_TOKEN}
```

Responds to DMs and @mentions.

### WhatsApp (Green API)

No WhatsApp Business account needed.

```yaml
channels:
  whatsapp:
    green_api_id: ${GREEN_API_ID}
    green_api_token: ${GREEN_API_TOKEN}
```

### Running Multiple Channels

```bash
openagent serve                        # all configured channels
openagent serve -ch telegram           # specific channel
```

### Media Support

The agent can send files by including markers in responses:
```
[IMAGE:/path/to/chart.png]
[FILE:/path/to/report.pdf]
[VOICE:/path/to/memo.ogg]
```

---

## Scheduler

Cron tasks stored in SQLite — survive reboots. The scheduler runs as part of `openagent serve`.

```yaml
scheduler:
  enabled: true
  tasks:
    - name: health-check
      cron: "*/30 * * * *"
      prompt: "Check services. If any is down, use telegram_send_message to alert."
    - name: daily-report
      cron: "0 9 * * *"
      prompt: "Generate and send the daily report."
```

### CLI Management

```bash
openagent task add --name "test" --cron "* * * * *" --prompt "say hello"
openagent task list
openagent task remove <id>
openagent task enable <id>
openagent task disable <id>
```

---

## Doctor & Setup

`openagent doctor` checks the environment and reports missing pieces. `openagent setup` installs them — Docker, OS service, aux service images — as far as each platform allows.

```bash
openagent doctor              # environment report, non-destructive
openagent setup               # register OpenAgent as an OS service (default)
openagent setup --with-docker # also install Docker where automatable
openagent setup --pull-images # also pre-pull images for every enabled aux service
openagent setup --full        # everything: Docker + OS service + image pulls
openagent install             # alias for `setup --full`
```

Platform support for automatic Docker install:

| Platform | Docker install | Notes |
|---|---|---|
| Linux (apt / dnf / pacman / zypper / apk) | **Fully automated** | Requires sudo. Enables the systemd unit and adds the current user to the `docker` group. |
| macOS | `brew install --cask docker` | Docker Desktop is a GUI app; you still have to launch it once to accept the EULA. |
| Windows | `winget install Docker.DockerDesktop` | Reboot required afterwards. |

`openagent setup --full` is idempotent: running it on an already-configured machine will just verify and move on.

### OS service

`openagent setup` registers OpenAgent as a platform-native service so it auto-starts on boot and auto-restarts on crash:

- **Linux** — systemd user unit at `~/.config/systemd/user/openagent.service`, with `Restart=always` and `SuccessExitStatus=75` so the auto-updater's exit code 75 triggers a clean restart. You also want `loginctl enable-linger <user>` so the service survives logout on a headless VPS.
- **macOS** — launchd plist at `~/Library/LaunchAgents/com.openagent.serve.plist`, with `KeepAlive` / `SuccessfulExit=false`.
- **Windows** — `.bat` wrapper + Task Scheduler entry (`ONLOGON`, with an internal restart loop).

```bash
# Linux
systemctl --user status openagent
journalctl --user -u openagent -f

# macOS
launchctl list com.openagent.serve

# uninstall (any platform)
openagent uninstall
```

---

## Auto-update

OpenAgent can check PyPI on a schedule and upgrade itself in place.

```yaml
auto_update:
  enabled: true
  mode: auto                    # auto | notify | manual
  check_interval: "17 */6 * * *"  # every 6h at minute :17
```

Modes:
- `auto` — pip upgrade + notify (if messaging MCP is configured) + exit with code 75. The OS service manager (systemd / launchd / Task Scheduler) catches the exit and restarts the process with the new code already installed.
- `notify` — pip upgrade + notify, but don't restart. New code takes effect on the next manual restart.
- `manual` — pip upgrade only. No notification, no restart.

Requires `auto_update.enabled: true` **and** an OS service supervising the process — otherwise exit 75 just kills it.

Manual update at any time:

```bash
openagent update              # check PyPI, upgrade if newer
```

---

## Dream mode

Dream mode is a built-in nightly maintenance task. When enabled, it runs a prompt that cleans `/tmp`, consolidates duplicate memory files, runs a system health check, and writes an audit log into the vault.

```yaml
dream_mode:
  enabled: true
  time: "3:00"                  # local time, converted to cron
  # or:
  # cron: "0 3 * * *"
```

---

## VPS Deployment

For a fresh Linux VPS, the whole setup is three commands:

```bash
# 1. Install
pip install 'openagent-framework[all]'

# 2. Create openagent.yaml (see the YAML reference below)
# 3. One-shot setup: Docker + systemd service + image pulls
openagent setup --full
```

`openagent setup --full` leaves you with a running systemd user service, the Obsidian web UI (if enabled) on its configured port, and auto-update ready to pick up future releases from PyPI. After that you only interact with systemd:

```bash
systemctl --user restart openagent
systemctl --user stop openagent
systemctl --user start openagent
journalctl --user -u openagent -f           # live logs
tail -f ~/.openagent/logs/openagent.out.log # stdout log
```

Upgrading manually (rarely needed if `auto_update.enabled: true`):

```bash
pip install --upgrade 'openagent-framework[all]'
systemctl --user restart openagent
```

The agent cannot modify its own code — only `openagent.yaml` and `memories/` are writable.

---

## Full YAML Config Reference

```yaml
name: my-agent

system_prompt: |
  You are a helpful assistant.

model:
  provider: claude-cli           # claude-cli | claude-api | zhipu
  model_id: claude-sonnet-4-6
  permission_mode: bypass        # bypass | auto | default (Claude CLI only)
  # api_key: ${API_KEY}          # for claude-api or zhipu
  # base_url: https://...        # for zhipu/OpenAI-compatible

mcp_defaults: true               # load default MCPs (filesystem, editor, shell, etc.)
# mcp_disable: ["computer-control"]  # disable specific defaults

mcp:                             # user MCPs (merged on top of defaults)
  - name: github
    command: ["github-mcp-server", "stdio"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: ${GITHUB_TOKEN}

  - name: sentry
    command: ["npx", "-y", "@sentry/mcp-server@latest"]
    env:
      SENTRY_ACCESS_TOKEN: ${SENTRY_TOKEN}

  - name: remote
    url: "https://mcp.example.com/sse"
    oauth: true                  # enables OAuth flow for first-time auth

memory:
  db_path: "./openagent.db"     # SQLite: scheduled tasks only
  vault_path: "./memories"      # Obsidian markdown vault

channels:
  telegram:
    token: ${TELEGRAM_BOT_TOKEN}
    allowed_users: ["123456789"]
  discord:
    token: ${DISCORD_BOT_TOKEN}
  whatsapp:
    green_api_id: ${GREEN_API_ID}
    green_api_token: ${GREEN_API_TOKEN}

services:
  obsidian_web:
    enabled: true
    port: 8200
    username: admin
    password: ${OBSIDIAN_PASSWORD}
    vault_path: ./memories

scheduler:
  enabled: true
  tasks:
    - name: health-check
      cron: "*/30 * * * *"
      prompt: "Check services and alert if down."

dream_mode:
  enabled: true
  time: "3:00"                   # local time (converted to cron)

auto_update:
  enabled: true
  mode: auto                     # auto | notify | manual
  check_interval: "17 */6 * * *"
```

Environment variables are substituted using `${VAR_NAME}` syntax.

---

## CLI Reference

```bash
# Chat / serve
openagent chat                         # interactive chat
openagent chat -m zhipu                # use a specific provider
openagent chat --model-id glm-4-flash  # override model ID
openagent chat -s session-123          # resume session
openagent serve                        # start agent + channels + scheduler + aux services
openagent serve -ch telegram           # only a specific channel

# Doctor & setup
openagent doctor                       # environment report
openagent setup                        # install as OS service only
openagent setup --with-docker          # + install Docker (Linux automated, Mac/Win brew/winget)
openagent setup --pull-images          # + pre-pull images for enabled aux services
openagent setup --full                 # everything (same as `install`)
openagent install                      # alias of `setup --full`
openagent uninstall                    # remove the OS service
openagent status                       # OS service status

# Auxiliary services
openagent services status              # report each aux service (Obsidian web, ...)
openagent services start
openagent services stop

# Scheduled tasks
openagent task add -n "name" -c "cron" -p "prompt"
openagent task list
openagent task remove <id>
openagent task enable <id>
openagent task disable <id>

# Updates
openagent update                       # manual pip upgrade from PyPI

# MCP
openagent mcp list                     # list connected MCP tools

# Globals
openagent -c custom.yaml serve         # custom config file
openagent -v serve                     # verbose/debug logging
```

---

## PyPI

```bash
pip install openagent-framework          # core + CLI
pip install openagent-framework[telegram] # + Telegram
pip install openagent-framework[discord]  # + Discord
pip install openagent-framework[whatsapp] # + WhatsApp
pip install openagent-framework[all]      # everything
```

Release: `./release.sh patch|minor|major` → GitHub Actions builds + publishes to PyPI automatically.

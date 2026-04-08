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
  model_id: glm-4
  api_key: ${ZHIPU_API_KEY}
  base_url: https://open.bigmodel.cn/api/paas/v4
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

Dual memory system: quick facts in SQLite + detailed knowledge in Obsidian-compatible `.md` files.

### Configuration

```yaml
memory:
  db_path: "./openagent.db"       # SQLite: sessions, messages, facts, scheduled tasks
  knowledge_dir: "./memories"     # Obsidian-compatible .md files (FTS5 indexed)
  auto_extract: true              # auto-extract facts + knowledge from conversations
```

### How It Works

- **Session history**: every message stored immediately in SQLite
- **Quick facts**: short preferences extracted automatically → SQLite
- **Knowledge base**: detailed docs → `.md` files with YAML frontmatter, `[[wikilinks]]`, tags
- **Hybrid search**: FTS5 snippets injected into context (compact, not full files)
- **Obsidian-compatible**: open `memories/` in Obsidian for graph view

### Memory File Format

```markdown
---
topic: deploy
tags: [k8s, wardrobe, ovh]
links: [[server-architecture]]
created: 2026-04-07T12:00:00
---
# Deploy Wardrobe Service
rsync + docker build + k3s import...
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

## Auto-Start (System Service)

```bash
openagent install     # register as system service
openagent uninstall   # remove
openagent status      # check if running
```

- **macOS**: launchd (`~/Library/LaunchAgents/`)
- **Linux**: systemd user unit (`~/.config/systemd/user/`)
- **Windows**: Task Scheduler

---

## VPS Deployment

For deploying on a VPS (the primary use case):

### 1. Install

```bash
pip install openagent-framework[all]
```

### 2. Create config

```yaml
# openagent.yaml — single file, all config
name: my-agent
model:
  provider: claude-cli
  permission_mode: bypass
memory:
  db_path: ./openagent.db
  knowledge_dir: ./memories
mcp_defaults: true
mcp:
  - name: github
    command: ["github-mcp-server", "stdio"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: ${GITHUB_TOKEN}
channels:
  telegram:
    token: ${TELEGRAM_BOT_TOKEN}
    allowed_users: ["YOUR_TELEGRAM_ID"]
scheduler:
  enabled: true
  tasks: []
```

### 3. Start

```bash
# Foreground
openagent serve

# Background (recommended for VPS)
screen -dmS openagent bash -c 'openagent serve > openagent.log 2>&1'

# Or use the bundled scripts
./start.sh    # kills old instance, waits for Telegram cooldown, starts in screen
./stop.sh     # clean stop
```

### 4. Upgrade

```bash
pip install --upgrade openagent-framework[all]
./stop.sh && ./start.sh
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
  db_path: "./openagent.db"
  knowledge_dir: "./memories"
  auto_extract: true

channels:
  telegram:
    token: ${TELEGRAM_BOT_TOKEN}
    allowed_users: ["123456789"]
  discord:
    token: ${DISCORD_BOT_TOKEN}
  whatsapp:
    green_api_id: ${GREEN_API_ID}
    green_api_token: ${GREEN_API_TOKEN}

scheduler:
  enabled: true
  tasks:
    - name: health-check
      cron: "*/30 * * * *"
      prompt: "Check services and alert if down."
```

Environment variables are substituted using `${VAR_NAME}` syntax.

---

## CLI Reference

```bash
openagent chat                         # interactive chat
openagent chat -m zhipu                # use specific provider
openagent chat --model-id glm-4-flash  # override model ID
openagent chat -s session-123          # resume session
openagent serve                        # start all channels + scheduler
openagent serve -ch telegram           # start specific channel
openagent task add -n "name" -c "cron" -p "prompt"
openagent task list
openagent task remove <id>
openagent mcp list                     # list connected MCP tools
openagent install                      # install as system service
openagent uninstall                    # remove system service
openagent status                       # check service status
openagent -c custom.yaml serve        # use custom config file
openagent -v serve                     # verbose/debug mode
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

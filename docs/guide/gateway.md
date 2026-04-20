# Gateway

The Gateway is OpenAgent's single public interface — a WebSocket + REST
server on one port (default 8765). Every client — desktop app, CLI,
Telegram/Discord/WhatsApp bridges, custom scripts — talks to the agent
through it. Internally it is an aiohttp application that hosts both the
WebSocket endpoint (`/ws`) and the full REST surface (`/api/*`) on the
same port.

```
 ┌────────────────────────────────────────────────────────┐
 │  Agent Directory (./my-agent)                          │
 │  ┌─────────────────────────┐                           │
 │  │   OpenAgent Core        │  openagent.yaml           │
 │  │   Agent + MCPs          │  openagent.db             │
 │  └──────────┬──────────────┘  memories/                │
 │             │                  logs/                   │
 │  ┌──────────▼──────────────┐  .port                    │
 │  │      Gateway            │                           │
 │  │   WS + REST (aiohttp)   │                           │
 │  │   Port auto-allocated   │                           │
 │  └──────────┬──────────────┘                           │
 └─────────────┼──────────────────────────────────────────┘
               │
  ┌────────────┼────────────────┐
  │            │                 │
┌─▼──────┐ ┌──▼─────────┐ ┌────▼───┐
│Bridges │ │ Desktop App│ │  CLI   │
│TG/DC/WA│ │ (Electron) │ │(term.) │
└────────┘ └────────────┘ └────────┘
```

## Port allocation

When running multiple agents, each gets its own Gateway on a separate
port. If the preferred port is busy, the next available port is
auto-allocated (scans +1 through +99). The actual port is written to
`<agent_dir>/.port` so clients and tooling can discover it without
guessing.

## WebSocket protocol

All traffic on `/ws` is JSON. See `openagent/gateway/protocol.py` for the
canonical message-type constants.

**Client → Server**

| Type      | Payload                                                  | Purpose                          |
|-----------|----------------------------------------------------------|----------------------------------|
| `auth`    | `{token, client_id}`                                     | Handshake; must be first message |
| `message` | `{text, session_id, attachments?}`                       | Send a user turn to the agent    |
| `command` | `{name: stop\|clear\|new\|reset\|…, session_id}`         | Slash-command equivalents        |
| `ping`    | `{}`                                                     | Keep-alive                       |

**Server → Client**

| Type             | Payload                                                         | Purpose                                   |
|------------------|-----------------------------------------------------------------|-------------------------------------------|
| `auth_ok`        | `{agent_name, version}`                                         | Handshake accepted                        |
| `queued`         | `{position}`                                                    | Message accepted, waiting in FIFO queue   |
| `status`         | `{text, session_id}`                                            | Live progress (tool use, thinking, …)     |
| `response`       | `{text, session_id, model, attachments}`                        | Final agent reply for a turn              |
| `error`          | `{text}`                                                        | Recoverable error                         |
| `command_result` | `{text}`                                                        | Response to a slash command               |
| `pong`           | `{}`                                                            | Keep-alive ack                            |

Attachments use markers in reply text (`[IMAGE:/path]`, `[FILE:/path]`,
`[VOICE:/path]`, `[VIDEO:/path]`) which the gateway strips and moves into
the structured `attachments` array — see [Channels → Media Support](./channels.md#media-support).

## REST API

```
# Health + identity
GET    /api/health                → agent status
GET    /api/agent-info            → agent name, dir, port, version

# Config
GET    /api/config                → read full config
PUT    /api/config                → replace full config
PATCH  /api/config/{section}      → update one section

# Vault (Obsidian-compatible markdown notes)
GET    /api/vault/notes           → list notes
GET    /api/vault/notes/{path}    → read note content + frontmatter + links
PUT    /api/vault/notes/{path}    → write/update note
DELETE /api/vault/notes/{path}    → delete note
GET    /api/vault/graph           → {nodes, edges} wikilink graph
GET    /api/vault/search?q=…      → full-text search

# Usage / pricing
GET    /api/usage                 → monthly spend summary
GET    /api/usage/daily           → day-by-day breakdown
GET    /api/usage/pricing         → price-per-million table

# Models & providers
GET    /api/models                → list provider configs (masked keys)
POST   /api/models                → add a provider
PUT    /api/models/{name}         → update a provider
DELETE /api/models/{name}         → remove a provider
GET    /api/models/active         → current active model config
PUT    /api/models/active         → set active model
POST   /api/models/{name}/test    → send a smoke test prompt
GET    /api/models/catalog        → configured models with pricing
GET    /api/models/providers      → provider catalog
GET    /api/providers             → list configured providers
POST   /api/providers/test        → validate a provider config

# MCPs
GET    /api/mcps                  → list configured MCP servers
POST   /api/mcps                  → add a custom MCP
PUT    /api/mcps/{name}           → update a custom MCP
DELETE /api/mcps/{name}           → remove a custom MCP
POST   /api/mcps/{name}/enable    → enable (triggers hot reload)
POST   /api/mcps/{name}/disable   → disable (triggers hot reload)

# Scheduled tasks
GET    /api/scheduled-tasks       → list cron tasks
POST   /api/scheduled-tasks       → create
PUT    /api/scheduled-tasks/{id}  → update
DELETE /api/scheduled-tasks/{id}  → delete

# File uploads
POST   /api/upload                → save uploaded file, returns {path, filename, transcription?}

# Logs
GET    /api/logs                  → recent events
DELETE /api/logs                  → clear

# Lifecycle
POST   /api/update                → check for update, install, restart
POST   /api/restart               → restart agent
```

Test coverage for each endpoint lives under `scripts/tests/` — run
`bash scripts/test_openagent.sh` to validate the full surface.

## Session queueing

The Gateway owns a `SessionManager` that enforces **one active run per
client** with a FIFO queue for anything submitted while a turn is in
flight. Clients get an immediate `queued` acknowledgement with their
queue position, then stream `status` events until the run finishes with a
`response`. A `command: stop` cancels the active run and drops the queue.

## Bridges

Bridges (Telegram, Discord, WhatsApp) are thin adapters — ~130–195 lines
each — that translate a platform's SDK to the Gateway WS protocol. They
connect as normal WebSocket clients and multiplex platform users onto the
agent via distinct `session_id`s.

### Writing a custom bridge

```python
from openagent.bridges.base import BaseBridge

class MyBridge(BaseBridge):
    name = "my-platform"

    async def _run(self):
        response = await self.send_message(text, session_id)
        # Send response.get("text") back to user
```

See [Channels](./channels.md) for the platform-facing feature matrix
(allow-lists, voice transcription, stop buttons, etc.).

## CLI client

A separate package, `openagent-cli`, connects to any Gateway over
WebSocket:

```bash
pip install openagent-cli
openagent-cli connect localhost:8765 --token mysecret
```

It is the reference implementation of the protocol above and supports
the same slash commands as the desktop app and bridges.

## Remote access

For remote connections, an SSH tunnel is the simplest option:

```bash
ssh -L 8765:localhost:8765 user@vps
```

This avoids exposing the Gateway port directly. The `token` field under
`channels.websocket` is a shared-secret check, not a replacement for
transport security.

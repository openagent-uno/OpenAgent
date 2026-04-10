# Architecture

## Gateway

The Gateway is OpenAgent's single public interface — a WebSocket + REST server on one port (default 8765). All clients connect through it.

```
                    ┌─────────────────────────┐
                    │   OpenAgent Core        │
                    │   Agent + MCPs          │
                    └──────────┬──────────────┘
                               │
                    ┌──────────▼──────────────┐
                    │      Gateway            │
                    │   WS + REST (aiohttp)   │
                    │   Port 8765             │
                    └──────────┬──────────────┘
                               │
          ┌────────────────────┼────────────────┐
          │                    │                 │
    ┌─────▼──────┐      ┌─────▼──────┐   ┌─────▼──────┐
    │  Bridges   │      │ Desktop App│   │    CLI     │
    │ TG/DC/WA   │      │ (Electron) │   │ (terminal) │
    └────────────┘      └────────────┘   └────────────┘
```

### WebSocket Protocol

See `openagent/gateway/protocol.py` for the full spec.

### REST API

```
GET  /api/health                → agent status
GET  /api/vault/notes           → list notes
GET  /api/vault/graph           → graph data
GET  /api/config                → read config
PATCH /api/config/{section}     → update config section
```

## Bridges

Thin adapters: Telegram/Discord/WhatsApp SDK ↔ Gateway WS protocol. ~130-195 lines each.

### Writing a Custom Bridge

```python
from openagent.bridges.base import BaseBridge

class MyBridge(BaseBridge):
    name = "my-platform"

    async def _run(self):
        response = await self.send_message(text, session_id)
        # Send response.get("text") back to user
```

## CLI Client

Separate package (`openagent-cli`). Connects to any Gateway via WS.

```bash
pip install openagent-cli
openagent-cli connect localhost:8765 --token mysecret
```

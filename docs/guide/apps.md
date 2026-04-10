# Apps & Distribution

OpenAgent is not a single installer. It is a **model-agnostic agent system** with three independent apps that are released together but installed separately.

## 1. Agent Server

This is the actual OpenAgent runtime in `openagent/`.

- Runs the model provider, MCP tools, memory, channels, scheduler, and auto-update flow
- Installs as `openagent-framework`
- Lives on the machine where the agent should run continuously

Typical install:

```bash
pip install openagent-framework[all]
openagent serve
```

## 2. CLI Client

This is the terminal client for talking to a running OpenAgent server.

- Installs as `openagent-cli`
- Connects to any OpenAgent Gateway over WebSocket
- Useful for ops, remote access, and low-friction local usage

Typical install:

```bash
pip install openagent-cli
openagent-cli connect localhost:8765 --token mysecret
```

## 3. Desktop App

This is the Electron app for chat, memory browsing, graph exploration, MCP configuration, and settings.

- Distributed as platform-specific binaries on GitHub Releases
- Connects to a running Agent Server
- Does not replace the server install

## Distribution Model

- Tagged GitHub releases are the shared download point for all three apps.
- The Agent Server and CLI Client are attached as Python package artifacts.
- The Desktop App is attached as macOS, Windows, and Linux installers.
- The Agent Server also supports install and auto-update flows after installation.

## Model-Agnostic Behavior

OpenAgent keeps the same operating surface across providers:

- Same MCP tools
- Same memory behavior
- Same channels and scheduler
- Same clients

Changing the model should not change how the system is operated.

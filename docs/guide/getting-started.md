# Getting Started

Welcome! This page walks you from zero to a running agent in a few minutes. Pick the path that matches how you want to use OpenAgent — no account, no sign-up, nothing to configure upfront.

## The pieces, in plain English

OpenAgent ships as four things that work together:

- **Web App** — opens in your browser. Nothing to install.
- **Agent Server** — the actual agent. Runs on your computer (or a server you own) and keeps your agent alive.
- **Desktop App** — a native chat window for the agent. Optional.
- **CLI Client** — a terminal client. Optional.

You only *need* the **Agent Server**. Everything else is a way to talk to it.

## Try it first (zero install)

Open the hosted web app in any browser:

<div style="margin: 1.5rem 0;">
  <a href="https://openagent.uno/app/" class="download-pill" style="display:inline-block; padding: 0.75rem 1.5rem; font-weight: 600;">→ Open the Web App</a>
</div>

You'll still need an Agent Server running somewhere to connect to. Grab one below.

## Download

Pick your platform — each card below auto-updates to the latest release.

<ReleaseDownloads />

::: tip Which do I need?
Start with just the **Agent Server**. Add the **Desktop App** or **CLI Client** later if you want them.
:::

## Install

### macOS

Double-click the `.pkg` installer. It's signed and notarized — Finder launches it with no warnings. The server lands at `/usr/local/bin/openagent`.

Prefer the terminal?

```bash
curl -fsSL https://openagent.uno/install.sh | sh
```

### Linux

```bash
curl -fsSL https://openagent.uno/install.sh | sh
```

Works on any modern distro (glibc ≥ 2.31).

### Windows

Extract the `.zip` and double-click `openagent.exe`. On first launch Windows SmartScreen will show a prompt — click **More info → Run anyway**.

## First run

Pick a folder for your agent's data and start it:

```bash
openagent serve ./my-agent
```

That's it. The command creates `./my-agent/` with a default config, database, and memory vault, then starts the agent on a local port. Open the Web App or Desktop App and point it at the address shown in the terminal.

Edit `./my-agent/openagent.yaml` to change the model, add channels (Telegram, Discord…), or wire up MCP tools.

## Running multiple agents

Each folder is a separate agent with its own memory, config, and port:

```bash
openagent serve ./agent-work
openagent serve ./agent-home
```

List everything that's running:

```bash
openagent list
```

## Alternative: install via pip

Prefer Python? The server is also available as a pip package:

```bash
pip install openagent-framework[all]
openagent serve ./my-agent
```

Individual extras (`[telegram]`, `[discord]`, `[whatsapp]`, `[websocket]`, `[voice]`) let you skip the deps you don't need.

## Next steps

- [Configure your agent](./config-reference.md)
- [Pick a model](./models.md)
- [Add MCP tools](./mcp.md)
- [Connect a channel](./channels.md)

# Downloads

OpenAgent is distributed as **three independent apps**:

1. **Agent Server**: the persistent runtime in `openagent/`, installed on the machine that should actually run the agent, channels, memory, scheduler, and auto-updater.
2. **CLI Client**: a separate terminal client that connects to any running OpenAgent Gateway.
3. **Desktop App**: the Electron UI for chat, MCPs, memory, and configuration.

All three are conceptually separate. You usually install the Agent Server on the host that will run the agent, then use either the CLI Client or the Desktop App from your workstation.

## Install Flow

### 1. Agent Server

Install this if you want to run OpenAgent itself.

```bash
pip install openagent-framework[all]
openagent serve
```

- GitHub Releases attach the Agent Server Python package as release assets.
- The Agent Server owns installation, service setup, and auto-update behavior.
- This is the component that talks to models, MCP servers, memory, channels, and scheduled jobs.

### 2. CLI Client

Install this if you want a terminal UI for an already running OpenAgent server.

```bash
pip install openagent-cli
openagent-cli connect localhost:8765 --token mysecret
```

- The CLI is a separate app and does not run the agent server for you.
- It connects to any OpenAgent Gateway over WebSocket.
- Tagged releases attach CLI package artifacts alongside the other release assets.

### 3. Desktop App

Install this if you want the Electron UI.

- **macOS**: download the `.dmg`, open it, and move OpenAgent to Applications.
- **Windows**: download the `.exe` installer and complete the setup flow.
- **Linux**: download the `.AppImage` or `.deb`, then launch the app and connect it to a running Agent Server.

The Desktop App is also independent: it is a client, not the runtime itself.

## Latest Release Assets

The cards below always target the latest stable GitHub release and separate the artifacts by Agent Server, CLI Client, and Desktop App.

<ReleaseDownloads />

## Build From Source

```bash
cd app
./setup.sh
./build.sh macos
./build.sh windows
./build.sh linux
```

## Release Workflow

- Tagged releases publish three artifact families:
  - Agent Server Python package
  - CLI Client Python package
  - Desktop App installers and update metadata
- The download cards above update automatically when a new stable GitHub release is published.
- If the latest release predates a given artifact family, browse the full release history or build from source.

# Setup & Deployment

## VPS Quick Setup

### Standalone Executable (recommended)

```bash
# Download the latest release for your platform
curl -LO https://github.com/geroale/OpenAgent/releases/latest/download/openagent-linux-x64.tar.gz
tar xzf openagent-linux-x64.tar.gz

# Start with an agent directory
./openagent/openagent serve ./my-agent

# Register as OS service
./openagent/openagent -d ./my-agent setup
```

### pip install

```bash
pip install 'openagent-framework[all]'
openagent setup --full
```

## Doctor & Setup

```bash
openagent doctor                 # environment report
openagent setup                  # register as OS service
openagent setup --full           # everything
openagent install                # alias for setup --full
```

With an agent directory:
```bash
openagent -d ./my-agent doctor
openagent -d ./my-agent setup
```

## OS Service

OpenAgent registers as a platform-native service. When using agent directories, each agent gets a unique service name derived from the directory name.

### Default (single agent)

- **Linux** — systemd user unit (`~/.config/systemd/user/openagent.service`)
- **macOS** — launchd plist (`~/Library/LaunchAgents/com.openagent.serve.plist`)
- **Windows** — Task Scheduler entry with restart loop

### Per-agent (multi-agent)

- **Linux** — `openagent-<dirname>.service`
- **macOS** — `com.openagent.<dirname>.plist`
- **Windows** — `OpenAgent-<dirname>` task

```bash
# Linux (default agent)
systemctl --user status openagent
journalctl --user -u openagent -f

# Linux (named agent)
systemctl --user status openagent-my-agent
journalctl --user -u openagent-my-agent -f

# macOS
launchctl list com.openagent.serve       # default
launchctl list com.openagent.my-agent    # named

# Uninstall (any platform)
openagent uninstall
openagent -d ./my-agent uninstall       # specific agent
```

## Auto-Update

```yaml
auto_update:
  enabled: true
  mode: auto                    # auto | notify | manual
  check_interval: "17 */6 * * *"
```

- `auto` — upgrade + exit 75 (OS service restarts with new code)
- `notify` — upgrade + notify, no restart
- `manual` — upgrade only

The update mechanism adapts to the installation type:
- **Standalone executable**: downloads the latest release from GitHub, verifies checksum, and swaps the binary in place
- **pip install**: runs `pip install --upgrade openagent-framework`

Manual: `openagent update`

## Data Paths

### With agent directory (recommended)

When using `openagent serve ./my-agent`, all data lives inside the agent directory:

```
my-agent/
├── openagent.yaml    # configuration
├── openagent.db      # SQLite database
├── memories/         # memory vault
└── logs/             # log files
```

### Without agent directory (legacy)

OpenAgent stores files in platform-standard directories:

| Platform | Path |
|----------|------|
| macOS | `~/Library/Application Support/OpenAgent/` |
| Linux | `~/.config/openagent/` (config), `~/.local/share/openagent/` (data) |
| Windows | `%APPDATA%\OpenAgent\` |

Override with `-c /path/to/openagent.yaml` or set paths in config.

### Migrating to agent directory

```bash
openagent migrate --to ./my-agent
```

This copies your existing config, database, and memories from platform-standard paths to the new agent directory.

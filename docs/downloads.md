# Downloads

OpenAgent has four surfaces: the hosted [Web App](https://openagent.uno/app/), the **Agent Server** (the runtime), the **CLI Client**, and the **Desktop App**. The Web App needs no install — the other three are downloaded independently and connect to a running Agent Server.

## Latest builds

<ReleaseDownloads />

## Web App

Open [openagent.uno/app](https://openagent.uno/app/) in any browser and point it at a running Agent Server. Same React Native codebase as the Desktop App — useful when you can't install a native binary.

## Agent Server

Single self-contained executable — no Python required.

```bash
curl -fsSL https://openagent.uno/install.sh | sh
```

The script picks the right asset, verifies SHA-256, installs it into `$PATH`, and clears the macOS quarantine attribute. Pass `--prefix DIR` to override the install location.

Manual download:

```bash
tar xzf openagent-<ver>-<platform>-<arch>.tar.gz
chmod +x openagent
./openagent serve ./my-agent
```

First launch extracts bundled runtime assets (~5–10 s); later launches start in under a second. The binary self-updates from GitHub Releases.

**Platform notes**

- **macOS** — unsigned binary. Run `xattr -dr com.apple.quarantine ./openagent`, or right-click → Open once.
- **Linux** — `chmod +x ./openagent`. Any modern distro (glibc ≥ 2.31).
- **Windows** — SmartScreen → **More info** → **Run anyway**, once per install.

## CLI Client

Single-file terminal client for a running Gateway.

```bash
curl -fsSL https://openagent.uno/install.sh | sh -s -- --cli
```

Manual: extract `openagent-cli-<ver>-<platform>-<arch>.(tar.gz|zip)` and run `./openagent-cli connect localhost:8765 --token mysecret`. Same Gatekeeper / SmartScreen notes as the server.

## Desktop App

Electron installers per platform:

- **macOS** — `openagent-app-<ver>-macos-<arch>.dmg` (`arm64` for Apple Silicon, `x64` for Intel).
- **Windows** — `openagent-app-<ver>-windows-x64.exe`.
- **Linux** — `openagent-app-<ver>-linux-x64.AppImage` or `.deb`.

The `latest*.yml` files attached to each release are Electron auto-update metadata — you don't download them manually.

## Build from source

```bash
cd app
./setup.sh
./build.sh macos   # or windows, linux
```

For the server/CLI executables see `scripts/build-executable.sh` and the PyInstaller specs (`openagent.spec`, `cli.spec`).

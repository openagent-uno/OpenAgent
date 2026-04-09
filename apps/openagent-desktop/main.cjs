const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const { spawn } = require("node:child_process");

const activeTunnels = new Map();

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 760,
    backgroundColor: "#0c1117",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const explicitUrl = process.env.OPENAGENT_CONTROL_URL;
  if (explicitUrl) {
    win.loadURL(explicitUrl);
    return;
  }

  const builtHtml = path.resolve(__dirname, "../openagent-control/dist/index.html");
  win.loadFile(builtHtml);
}

function runCli(args) {
  return new Promise((resolve, reject) => {
    const cmd = process.env.OPENAGENT_CLI || "openagent";
    const child = spawn(cmd, args, {
      cwd: process.cwd(),
      env: process.env,
      shell: process.platform === "win32",
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim() || stderr.trim());
      } else {
        reject(new Error(stderr.trim() || stdout.trim() || `CLI exited with ${code}`));
      }
    });
  });
}

ipcMain.handle("openagent:service", async (_event, action) => {
  if (!["install", "start", "stop", "restart", "status", "uninstall"].includes(action)) {
    throw new Error(`Unsupported service action: ${action}`);
  }
  if (action === "status") {
    return runCli(["service", "status"]);
  }
  return runCli(["service", action]);
});

ipcMain.handle("openagent:ssh-open", async (_event, options = {}) => {
  const localPort = Number(options.localPort || 8765);
  const remotePort = Number(options.remotePort || 8765);
  const args = [];
  if (options.identityFile) {
    args.push("-i", options.identityFile);
  }
  if (options.port) {
    args.push("-p", String(options.port));
  }
  args.push("-N", "-L", `${localPort}:127.0.0.1:${remotePort}`);
  args.push(options.user ? `${options.user}@${options.host}` : options.host);

  const child = spawn("ssh", args, {
    stdio: "ignore",
    detached: false,
  });
  const tunnelId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  activeTunnels.set(tunnelId, child);
  child.on("exit", () => {
    activeTunnels.delete(tunnelId);
  });
  return { id: tunnelId, localPort };
});

ipcMain.handle("openagent:ssh-close", async (_event, tunnelId) => {
  const child = activeTunnels.get(tunnelId);
  if (child) {
    child.kill();
    activeTunnels.delete(tunnelId);
  }
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

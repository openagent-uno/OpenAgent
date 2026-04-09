const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("openAgentDesktop", {
  isDesktop: true,
  service: {
    install: () => ipcRenderer.invoke("openagent:service", "install"),
    start: () => ipcRenderer.invoke("openagent:service", "start"),
    stop: () => ipcRenderer.invoke("openagent:service", "stop"),
    restart: () => ipcRenderer.invoke("openagent:service", "restart"),
    status: () => ipcRenderer.invoke("openagent:service", "status"),
  },
  ssh: {
    openTunnel: (options) => ipcRenderer.invoke("openagent:ssh-open", options),
    closeTunnel: (id) => ipcRenderer.invoke("openagent:ssh-close", id),
  },
});

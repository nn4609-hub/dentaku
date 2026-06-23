const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopApi", {
  isElectron: true,
  setAlwaysOnTop: (enabled) => ipcRenderer.invoke("always-on-top:set", enabled),
});

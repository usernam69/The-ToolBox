// Gives the pages one small, safe bridge: start the home-network server for chat/drawing.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('toolboxDesktop', {
  startLan: () => ipcRenderer.invoke('lan:start'),
});

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('API', {
  request: (...args) => {
    return ipcRenderer.invoke('request', ...args)
  },
  receive: (channel, func) => {
    ipcRenderer.on(channel, (_event, ...args) => func(...args));
  }
});
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('steamShell', {
  quit: () => ipcRenderer.invoke('quit-game'),
})

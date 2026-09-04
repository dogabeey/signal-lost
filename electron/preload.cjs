const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('steamShell', {
  quit: () => ipcRenderer.invoke('quit-game'),
  getStatus: () => ipcRenderer.invoke('steam-status'),
  unlockAchievement: (achievementId) => ipcRenderer.invoke('steam-unlock-achievement', achievementId),
})

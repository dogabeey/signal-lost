const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('steamShell', {
  quit: () => ipcRenderer.invoke('quit-game'),
  getStatus: () => ipcRenderer.invoke('steam-status'),
  unlockAchievement: (achievementId) => ipcRenderer.invoke('steam-unlock-achievement', achievementId),
  getAchievementStates: (achievementIds) => ipcRenderer.invoke('steam-achievement-states', achievementIds),
  getDisplaySettings: () => ipcRenderer.invoke('display-settings'),
  setFullscreen: (fullscreen) => ipcRenderer.invoke('set-fullscreen', fullscreen),
  setResolution: (width, height) => ipcRenderer.invoke('set-resolution', width, height),
})

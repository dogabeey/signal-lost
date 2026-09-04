import { app, BrowserWindow, ipcMain, screen } from 'electron'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const rendererEntry = path.join(currentDirectory, '..', 'dist', 'index.html')
const require = createRequire(import.meta.url)

// Keep this list in sync with Steamworks' Achievement Configuration page.
const STEAM_ACHIEVEMENTS = new Set([
  'ARTIFACT_BROKEN_RADAR', 'ARTIFACT_FTL_SCHEMATICS', 'ARTIFACT_SUPPLY_DEPOT',
  'ARTIFACT_BROKEN_EXTRACTOR', 'ARTIFACT_CONSTRUCTION_BOT', 'ARTIFACT_ALIENTECH_GIZMO',
  'ARTIFACT_BROKEN_HARD_DRIVE', 'ARTIFACT_HUBBLE_TELESCOPE', 'ARTIFACT_DARK_CORE', 'ARTIFACT_MAP_TO_EARTH',
])

let steamClient = null
let steamError = null

function initialiseSteamworks() {
  try {
    const steamworks = require('steamworks.js')
    const configuredAppId = Number.parseInt(process.env.STEAM_APP_ID ?? '', 10)
    steamClient = Number.isSafeInteger(configuredAppId) && configuredAppId > 0 ? steamworks.init(configuredAppId) : steamworks.init()
    steamworks.electronEnableSteamOverlay()
  } catch (error) {
    steamError = error instanceof Error ? error.message : String(error)
    console.warn(`[Steamworks] unavailable: ${steamError}`)
  }
}

function getSteamStatus() {
  if (!steamClient) return { available: false, error: steamError }
  try {
    return { available: true, appId: steamClient.utils.getAppId(), playerName: steamClient.localplayer.getName(), steamId: steamClient.localplayer.getSteamId().steamId64.toString() }
  } catch (error) {
    return { available: false, error: error instanceof Error ? error.message : String(error) }
  }
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 540,
    backgroundColor: '#101b25',
    autoHideMenuBar: true,
    fullscreen: app.isPackaged,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(currentDirectory, 'preload.cjs'),
    },
  })

  window.loadFile(rendererEntry)
}

app.whenReady().then(() => {
  ipcMain.handle('quit-game', () => app.quit())
  ipcMain.handle('display-settings', () => {
    const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const display = screen.getDisplayNearestPoint(window?.getBounds() ?? { x: 0, y: 0 })
    return { fullscreen: Boolean(window?.isFullScreen()), width: window?.getContentSize()[0] ?? 1280, height: window?.getContentSize()[1] ?? 720, maxWidth: display.workAreaSize.width, maxHeight: display.workAreaSize.height }
  })
  ipcMain.handle('set-fullscreen', (_event, fullscreen) => {
    const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    if (!window || typeof fullscreen !== 'boolean') return false
    window.setFullScreen(fullscreen)
    return window.isFullScreen()
  })
  ipcMain.handle('set-resolution', (_event, width, height) => {
    const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const allowedResolutions = new Set(['1280x720', '1600x900', '1920x1080', '2560x1440'])
    if (!window || !allowedResolutions.has(`${width}x${height}`)) return false
    window.setFullScreen(false)
    window.setContentSize(width, height)
    return true
  })
  ipcMain.handle('steam-status', () => getSteamStatus())
  ipcMain.handle('steam-unlock-achievement', (_event, achievementId) => {
    if (!steamClient || typeof achievementId !== 'string' || !STEAM_ACHIEVEMENTS.has(achievementId)) return false
    try { return steamClient.achievement.activate(achievementId) } catch (error) { console.warn(`[Steamworks] could not unlock ${achievementId}:`, error); return false }
  })
  ipcMain.handle('steam-achievement-states', (_event, achievementIds) => {
    if (!steamClient || !Array.isArray(achievementIds)) return {}
    return Object.fromEntries(achievementIds.filter((id) => typeof id === 'string' && STEAM_ACHIEVEMENTS.has(id)).map((id) => {
      try { return [id, steamClient.achievement.isActivated(id)] } catch { return [id, false] }
    }))
  })
  createWindow()

  app.on('activate', () => {
    if (!BrowserWindow.getAllWindows().length) createWindow()
  })
})

app.on('window-all-closed', () => app.quit())

initialiseSteamworks()

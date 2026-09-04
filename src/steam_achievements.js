const ARTIFACT_ACHIEVEMENTS = Object.freeze({
  'broken-radar': 'ARTIFACT_BROKEN_RADAR',
  'ftl-schematics': 'ARTIFACT_FTL_SCHEMATICS',
  'supply-depot': 'ARTIFACT_SUPPLY_DEPOT',
  'broken-extractor': 'ARTIFACT_BROKEN_EXTRACTOR',
  'construction-bot': 'ARTIFACT_CONSTRUCTION_BOT',
  'alientech-gizmo': 'ARTIFACT_ALIENTECH_GIZMO',
  'broken-hard-drive': 'ARTIFACT_BROKEN_HARD_DRIVE',
  'hubble-telescope': 'ARTIFACT_HUBBLE_TELESCOPE',
  'dark-core': 'ARTIFACT_DARK_CORE',
  'map-to-earth': 'ARTIFACT_MAP_TO_EARTH',
})

export function unlockSteamAchievementForArtifact(artifactId) {
  const achievementId = ARTIFACT_ACHIEVEMENTS[artifactId]
  if (!achievementId || !window.steamShell?.unlockAchievement) return
  window.steamShell.unlockAchievement(achievementId).catch((error) => console.warn('[Steamworks] achievement unlock failed:', error))
}

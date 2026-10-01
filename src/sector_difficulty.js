// Scale encounter pressure relative to each sector's existing balance.
// Sector I stays at 1x; Sector IX reaches 1.25x, with a linear ramp between.
export function getSectorDifficultyMultiplier(sectorIndex) {
  const progress = Math.min(8, Math.max(0, sectorIndex)) / 8
  return 1 + progress * 0.25
}

// Time-stretch the existing fall animation: 50% speed in I, 100% in IX.
export function getSectorMeteorSpeedMultiplier(sectorIndex) {
  const progress = Math.min(8, Math.max(0, sectorIndex)) / 8
  return 0.5 + progress * 0.5
}

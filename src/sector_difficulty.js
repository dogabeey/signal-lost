// Scale encounter pressure relative to each sector's existing balance.
// Sector I stays at 1x; Sector IX reaches 1.25x, with a linear ramp between.
export function getSectorDifficultyMultiplier(sectorIndex) {
  const progress = Math.min(8, Math.max(0, sectorIndex)) / 8
  return 1 + progress * 0.25
}

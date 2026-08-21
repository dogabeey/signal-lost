export const BUILDING_CONFIG = {
  placementRadius: 10,
  minimumSpacing: 2.2,
  spawnClearance: 2.5,
  types: {
    chronoGenerator: {
      name: 'Chrono Generator', unlockCost: 35, baseCost: 180, costMultiplier: 1.35,
      color: '#63f5cd', effect: { range: 4, slow: 0.22 },
      upgrades: { range: { base: 180, step: 0.2 }, effectiveness: { base: 240, step: 0.02 } },
    },
    gapGenerator: {
      name: 'Gap Generator', unlockCost: 55, baseCost: 260, costMultiplier: 1.4,
      color: '#b59aff', effect: { range: 4, duration: 3, period: 10 },
      upgrades: { range: { base: 260, step: 0.2 }, duration: { base: 300, step: 0.2 }, period: { base: 340, step: -0.2 } },
    },
    autocannon: {
      name: 'Autocannon', unlockCost: 80, baseCost: 350, costMultiplier: 1.45,
      color: '#ff795f', effect: { range: 5, interval: 2.6 },
      upgrades: { range: { base: 360, step: 0.2 }, frequency: { base: 440, step: -0.06 } },
    },
  },
}

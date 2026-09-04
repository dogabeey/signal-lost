import { t } from './localisation.js'

const BUILDING_CONFIG_BASE = {
  placementRadius: 10,
  minimumSpacing: 2.2,
  spawnClearance: 2.5,
  types: {
    chronoGenerator: {
      name: 'Chrono Generator', baseCost: 180, costMultiplier: 1.35,
      color: '#63f5cd', effect: { range: 4, slow: 0.22 },
      upgrades: { range: { base: 180, step: 0.2 }, effectiveness: { base: 240, step: 0.02 } },
    },
    autocannon: {
      name: 'Autocannon', baseCost: 350, costMultiplier: 1.45,
      color: '#ff795f', effect: { range: 5, interval: 2.6 },
      upgrades: { range: { base: 360, step: 0.2 }, frequency: { base: 440, step: -0.06 } },
    },
    droneBay: {
      name: 'Drone Bay', baseCost: 460, costMultiplier: 1.48,
      color: '#79caff', effect: { period: 14, count: 1, droneSpeed: 5 },
      upgrades: { period: { base: 540, step: -0.65 }, count: { base: 880, step: 1 } },
    },
    barrierNode: {
      name: 'Barrier Node', baseCost: 520, costMultiplier: 1.5,
      color: '#76eaff', effect: { range: 4.3, period: 12, duration: 4.5 },
      upgrades: { range: { base: 560, step: 0.28 }, period: { base: 640, step: -0.55 }, duration: { base: 700, step: 0.45 } },
    },
    overclockRelay: {
      name: 'Overclock Relay', baseCost: 580, costMultiplier: 1.52,
      color: '#ffcf76', effect: { range: 5.2, effectiveness: 0.14 },
      upgrades: { range: { base: 620, step: 0.3 }, effectiveness: { base: 760, step: 0.04 } },
    },
    salvageExtractor: {
      name: 'Salvage Extractor', baseCost: 640, costMultiplier: 1.55,
      color: '#8dff9c', effect: { range: 4.8, period: 18, count: 1, cash: 2 },
      upgrades: { period: { base: 720, step: -0.7 }, cash: { base: 820, step: 1.5 }, count: { base: 980, step: 1 } },
    },
  },
}

export const BUILDING_CONFIG = {
  ...BUILDING_CONFIG_BASE,
  types: Object.fromEntries(Object.entries(BUILDING_CONFIG_BASE.types).map(([id, building]) => [id, {
    ...building,
    name: t(`building.${id}.name`, {}, building.name),
    upgrades: Object.fromEntries(Object.entries(building.upgrades).map(([upgradeId, upgrade]) => [upgradeId, { ...upgrade, name: t(`building.upgrade.${upgradeId}`, {}, upgradeId) }])),
  }])),
}

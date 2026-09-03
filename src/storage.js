export const STORAGE_KEYS = Object.freeze({
  cellBank: 'asteroid-belt-banked-cells',
  tier: 'asteroid-belt-selected-tier',
  tierHighScores: 'asteroid-belt-tier-high-scores',
  cash: 'asteroid-belt-cash',
  chronoshards: 'asteroid-belt-chronoshards',
  researchLab: 'asteroid-belt-research-lab',
  savedRound: 'asteroid-belt-saved-round',
  buildings: 'asteroid-belt-buildings',
  featureUnlocks: 'asteroid-belt-feature-unlocks',
  milestones: 'asteroid-belt-milestones',
  settings: 'asteroid-belt-settings',
  weaponry: 'asteroid-belt-weaponry',
  anomalyRewards: 'asteroid-belt-anomaly-rewards',
  artifacts: 'asteroid-belt-artifacts',
})

const LEGACY_STORAGE_KEYS = [
  ['astroid-belt-banked-cells', STORAGE_KEYS.cellBank], ['astroid-belt-selected-tier', STORAGE_KEYS.tier], ['astroid-belt-tier-high-scores', STORAGE_KEYS.tierHighScores],
  ['astroid-belt-cash', STORAGE_KEYS.cash], ['astroid-belt-chronoshards', STORAGE_KEYS.chronoshards], ['astroid-belt-research-lab', STORAGE_KEYS.researchLab],
  ['astroid-belt-saved-round', STORAGE_KEYS.savedRound], ['astroid-belt-buildings', STORAGE_KEYS.buildings], ['astroid-belt-feature-unlocks', STORAGE_KEYS.featureUnlocks],
]

export function migrateLegacyStorage(storage = window.localStorage) {
  for (const [legacyKey, currentKey] of LEGACY_STORAGE_KEYS) {
    try {
      if (storage.getItem(currentKey) === null && storage.getItem(legacyKey) !== null) storage.setItem(currentKey, storage.getItem(legacyKey))
    } catch {}
  }
}

export function readStoredNumber(key, fallback = 0, storage = window.localStorage) {
  try {
    const value = Number(storage.getItem(key))
    return Number.isFinite(value) && value >= 0 ? value : fallback
  } catch {
    return fallback
  }
}

export function writeStoredNumber(key, value, storage = window.localStorage) {
  try { storage.setItem(key, String(value)) } catch {}
}

export function readStoredJson(key, fallback = null, storage = window.localStorage) {
  try {
    const value = JSON.parse(storage.getItem(key))
    return value ?? fallback
  } catch {
    return fallback
  }
}

export function writeStoredJson(key, value, storage = window.localStorage) {
  try {
    if (value === null || value === undefined) storage.removeItem(key)
    else storage.setItem(key, JSON.stringify(value))
  } catch {}
}

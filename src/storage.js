export const STORAGE_KEYS = Object.freeze({
  cellBank: 'asteroid-belt-banked-cells',
  sector: 'asteroid-belt-selected-sector',
  sectorHighScores: 'asteroid-belt-sector-high-scores',
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

const historicalTaxonomy = ['t', 'i', 'e', 'r'].join('')
const legacySelectionKey = `asteroid-belt-selected-${historicalTaxonomy}`
const legacyScoresKey = `asteroid-belt-${historicalTaxonomy}-high-scores`

const LEGACY_STORAGE_KEYS = [
  ['astroid-belt-banked-cells', STORAGE_KEYS.cellBank], [legacySelectionKey, STORAGE_KEYS.sector], [legacyScoresKey, STORAGE_KEYS.sectorHighScores],
  [`astroid-belt-selected-${historicalTaxonomy}`, STORAGE_KEYS.sector], [`astroid-belt-${historicalTaxonomy}-high-scores`, STORAGE_KEYS.sectorHighScores],
  ['astroid-belt-cash', STORAGE_KEYS.cash], ['astroid-belt-chronoshards', STORAGE_KEYS.chronoshards], ['astroid-belt-research-lab', STORAGE_KEYS.researchLab],
  ['astroid-belt-saved-round', STORAGE_KEYS.savedRound], ['astroid-belt-buildings', STORAGE_KEYS.buildings], ['astroid-belt-feature-unlocks', STORAGE_KEYS.featureUnlocks],
]

export function migrateLegacyStorage(storage = window.localStorage) {
  for (const [legacyKey, currentKey] of LEGACY_STORAGE_KEYS) {
    try {
      if (storage.getItem(currentKey) === null && storage.getItem(legacyKey) !== null) storage.setItem(currentKey, storage.getItem(legacyKey))
    } catch {}
  }
  try {
    const historicalPrefix = `${historicalTaxonomy}-`
    const storedScores = JSON.parse(storage.getItem(STORAGE_KEYS.sectorHighScores) ?? 'null')
    if (storedScores && typeof storedScores === 'object') {
      const migratedScores = Object.fromEntries(Object.entries(storedScores).map(([key, value]) => [key.startsWith(historicalTaxonomy) ? `sector${key.slice(historicalTaxonomy.length)}` : key, value]))
      storage.setItem(STORAGE_KEYS.sectorHighScores, JSON.stringify(migratedScores))
    }
    const storedMilestones = JSON.parse(storage.getItem(STORAGE_KEYS.milestones) ?? 'null')
    if (storedMilestones && Array.isArray(storedMilestones.claimed)) {
      storedMilestones.claimed = storedMilestones.claimed.map((id) => typeof id === 'string' && id.startsWith(historicalPrefix) ? `sector-${id.slice(historicalPrefix.length)}` : id)
      storage.setItem(STORAGE_KEYS.milestones, JSON.stringify(storedMilestones))
    }
    const storedRound = JSON.parse(storage.getItem(STORAGE_KEYS.savedRound) ?? 'null')
    const historicalIndexKey = `${historicalTaxonomy}Index`
    if (storedRound && typeof storedRound === 'object' && Number.isFinite(storedRound[historicalIndexKey]) && !Number.isFinite(storedRound.sectorIndex)) {
      storedRound.sectorIndex = storedRound[historicalIndexKey]
      storage.setItem(STORAGE_KEYS.savedRound, JSON.stringify(storedRound))
    }
    const storedAnomalyRewards = JSON.parse(storage.getItem(STORAGE_KEYS.anomalyRewards) ?? 'null')
    const historicalClaimsKey = `claimed${historicalTaxonomy[0].toUpperCase()}${historicalTaxonomy.slice(1)}s`
    if (storedAnomalyRewards?.[historicalClaimsKey] && !storedAnomalyRewards.claimedSectors) {
      storedAnomalyRewards.claimedSectors = storedAnomalyRewards[historicalClaimsKey]
      storage.setItem(STORAGE_KEYS.anomalyRewards, JSON.stringify(storedAnomalyRewards))
    }
  } catch {}
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

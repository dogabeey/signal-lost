import * as THREE from 'three'
import { ANIMATION, CAMERA, COLORS, DIFFICULTY, ENEMY_TYPES as OBSTACLE_TYPES, ENTITIES, FALLING_ROCK_TYPES, GAME, LIGHTING, SCENE, SOUND } from './constants.js'
import { RESEARCH_CONFIG } from './research_config.js'
import { CHEAT_CONFIG } from './cheat_config.js'
import { BUILD_INFO } from './build_info.js'
import { BUILDING_CONFIG } from './building_config.js'
import { TIPS } from './tips.js'
import { MILESTONES } from './milestones.js'
import './style.css'

document.querySelector('#app').innerHTML = `
  <main class="game-shell">
    <canvas id="game" aria-label="Asteroid Belt game canvas"></canvas>
    <header class="hud">
      <div class="hud-left">
        <div class="brand"><span class="brand-mark"></span>ASTEROID BELT</div>
        <div class="cash-balance">CASH <span id="cash">$000</span></div>
        <div class="chronoshard-balance">CHRONOSHARDS <span id="chronoshards">✦ 0</span></div>
      </div>
      <div class="shield-indicators" id="shield-indicators" aria-label="Shield charges"></div>
      <div class="hud-tier" id="hud-tier" aria-label="Current difficulty tier"></div>
      <div class="hud-right"><dl class="stats">
        <div><dt>CELLS</dt><dd id="score">000</dd></div>
        <div><dt>TIME</dt><dd id="time">00:00</dd></div>
      </dl><button class="pause-button" id="pause-button" type="button" aria-label="Pause game">Ⅱ</button></div>
    </header>
    <aside class="instructions"><b>MOVE</b><span>WASD / ARROW KEYS</span></aside>
    <footer class="build-footer" aria-label="Build information">
      <strong>${BUILD_INFO.label}</strong><span>v${BUILD_INFO.version}</span><span>BUILD ${BUILD_INFO.number}</span><span>${BUILD_INFO.date}</span>
    </footer>
    <div class="virtual-joystick" id="virtual-joystick" aria-hidden="true">
      <div class="virtual-joystick-knob"></div>
    </div>
    <div class="cash-indicators" id="cash-indicators" aria-live="polite"></div>
    <div class="milestone-claim-toast hidden" id="milestone-claim-toast" role="status" aria-live="polite"></div>
    <section class="pause-menu hidden" id="pause-menu" aria-label="Pause menu">
      <p class="eyebrow">ROUND PAUSED</p>
      <h2>PAUSE</h2>
      <div class="pause-actions">
        <button id="reset-round-button" type="button">RESET</button>
        <button id="surrender-button" type="button">SURRENDER</button>
        <button class="secondary-button" id="return-menu-button" type="button">RETURN</button>
      </div>
    </section>
    <section class="cheat-console hidden" id="cheat-console" aria-label="Debug console">
      <header><strong>${CHEAT_CONFIG.title}</strong><button id="close-cheat-console" type="button" aria-label="Close debug console">×</button></header>
      <p id="cheat-output">Enter a command.</p>
      <label><span>›</span><input id="cheat-input" type="text" autocomplete="off" spellcheck="false" placeholder="cash 1000"></label>
    </section>
    <section class="overlay" id="overlay" aria-live="polite">
      <div class="menu-content" id="menu-content">
        <p class="eyebrow">A Lionsfall Game</p>
        <h1 id="overlay-title">ASTEROID BELT</h1>
        <p id="overlay-copy">Collect energy cells. Avoid the enemies.</p>
        <p class="game-over-tip" id="game-over-tip" hidden></p>
        <div class="tier-selection" aria-label="Difficulty tier selection">
          <div class="tier-heading"><span class="tier-icon" aria-hidden="true">✦</span><span>Difficulty</span></div>
          <div class="tier-carousel">
            <button class="tier-nav" id="previous-tier" type="button" aria-label="Select previous tier">‹</button>
            <span class="tier-options" id="tier-options" aria-live="polite"></span>
            <button class="tier-nav" id="next-tier" type="button" aria-label="Select next tier">›</button>
          </div>
          <p class="highest-cell">HIGHEST CELL: <span id="highest-cells">000</span></p>
          <p class="tier-requirement" id="tier-requirement"></p>
          <button class="milestone-button" id="open-milestones-button" type="button">VIEW ASCENSION <span class="milestone-claim-count" id="milestone-claim-count" hidden>0</span></button>
        </div>
        <div class="menu-actions">
          <button class="menu-start-button" id="start-button" type="button">START RUN</button>
          <button class="menu-system-button" id="open-lab-button" type="button">RESEARCH LAB</button>
          <button class="menu-system-button" id="open-building-button" type="button">BUILDING SYSTEM</button>
        </div>
      </div>
      <section class="milestones-panel hidden" id="milestones-panel" aria-label="Ascension">
        <div class="milestones-header"><div><p class="eyebrow">BEST SINGLE RUN</p><h2>ASCENSION</h2><p>MAX CELLS <strong id="milestone-max-cells">000</strong></p></div><button class="secondary-button" id="close-milestones-button" type="button">BACK</button></div>
        <div class="milestone-tier-nav"><button id="previous-milestone-tier" type="button" aria-label="View previous milestone tier">‹</button><strong id="milestone-tier-label">TIER 1</strong><button id="next-milestone-tier" type="button" aria-label="View next milestone tier">›</button></div>
        <div class="milestone-track" id="milestone-track"></div>
      </section>
      <section class="lab-panel hidden" id="lab-panel" aria-label="Research Lab">
        <div class="lab-header"><div><p class="eyebrow">PERMANENT UPGRADES</p><h2>RESEARCH LAB</h2></div><button class="secondary-button" id="close-lab-button" type="button">BACK</button></div>
        <p class="lab-balance">CASH <span id="lab-cash">$0</span> · CHRONOSHARDS <span id="lab-chronoshards">✦ 0</span></p>
        <p class="lab-message" id="lab-message" aria-live="polite"></p>
        <h3 id="research-slots-heading">ACTIVE SLOTS</h3><div class="research-slots" id="research-slots"></div>
        <h3>AVAILABLE RESEARCH</h3><label class="research-search"><span>SEARCH</span><input id="research-search" type="search" placeholder="Search research names" autocomplete="off"></label><div class="research-list" id="research-list"></div>
      </section>
      <section class="building-panel hidden" id="building-panel"><div class="lab-header"><div><p class="eyebrow">PERMANENT DEFENSES</p><h2>BUILDING SYSTEM</h2></div><button class="secondary-button" id="close-building-button" type="button">BACK</button></div><p class="lab-balance">CASH <span id="building-cash"></span> · CHRONOSHARDS <span id="building-chronoshards"></span> · SLOTS <span id="building-slots"></span></p><div class="building-actions"><button id="enter-build-mode" type="button">BUILD MODE</button></div><h3>UNLOCK BUILDINGS</h3><div class="building-list" id="building-list"></div></section>
    </section>
    <div class="build-bar hidden" id="build-bar"><span>SELECT A BUILDING</span><div id="build-options"></div><button id="exit-build-mode" type="button">DONE</button></div>
    <section class="building-upgrade hidden" id="building-upgrade"></section>
  </main>
`

const canvas = document.querySelector('#game')
const scoreElement = document.querySelector('#score')
const timeElement = document.querySelector('#time')
const hudTierElement = document.querySelector('#hud-tier')
const shieldIndicators = document.querySelector('#shield-indicators')
const pauseButton = document.querySelector('#pause-button')
const overlay = document.querySelector('#overlay')
const overlayTitle = document.querySelector('#overlay-title')
const overlayCopy = document.querySelector('#overlay-copy')
const gameOverTip = document.querySelector('#game-over-tip')
const startButton = document.querySelector('#start-button')
const menuContent = document.querySelector('#menu-content')
const openMilestonesButton = document.querySelector('#open-milestones-button')
const milestonesPanel = document.querySelector('#milestones-panel')
const closeMilestonesButton = document.querySelector('#close-milestones-button')
const milestoneMaxCells = document.querySelector('#milestone-max-cells')
const milestoneTrack = document.querySelector('#milestone-track')
const milestoneClaimCount = document.querySelector('#milestone-claim-count')
const milestoneClaimToast = document.querySelector('#milestone-claim-toast')
const previousMilestoneTierButton = document.querySelector('#previous-milestone-tier')
const nextMilestoneTierButton = document.querySelector('#next-milestone-tier')
const milestoneTierLabel = document.querySelector('#milestone-tier-label')
const labPanel = document.querySelector('#lab-panel')
const openLabButton = document.querySelector('#open-lab-button')
const openBuildingButton = document.querySelector('#open-building-button')
const buildingPanel = document.querySelector('#building-panel')
const closeBuildingButton = document.querySelector('#close-building-button')
const buildingList = document.querySelector('#building-list')
const buildingCash = document.querySelector('#building-cash')
const buildingChronoshards = document.querySelector('#building-chronoshards')
const buildingSlots = document.querySelector('#building-slots')
const enterBuildModeButton = document.querySelector('#enter-build-mode')
const buildBar = document.querySelector('#build-bar')
const buildOptions = document.querySelector('#build-options')
const exitBuildModeButton = document.querySelector('#exit-build-mode')
const buildingUpgrade = document.querySelector('#building-upgrade')
const closeLabButton = document.querySelector('#close-lab-button')
const labCashElement = document.querySelector('#lab-cash')
const labChronoshardsElement = document.querySelector('#lab-chronoshards')
const labMessageElement = document.querySelector('#lab-message')
const researchSlotsElement = document.querySelector('#research-slots')
const researchSlotsHeading = document.querySelector('#research-slots-heading')
const researchListElement = document.querySelector('#research-list')
const researchSearchInput = document.querySelector('#research-search')
const cheatConsole = document.querySelector('#cheat-console')
const cheatInput = document.querySelector('#cheat-input')
const cheatOutput = document.querySelector('#cheat-output')
const closeCheatConsoleButton = document.querySelector('#close-cheat-console')
const pauseMenu = document.querySelector('#pause-menu')
const resetRoundButton = document.querySelector('#reset-round-button')
const surrenderButton = document.querySelector('#surrender-button')
const returnMenuButton = document.querySelector('#return-menu-button')
const cashElement = document.querySelector('#cash')
const chronoshardsElement = document.querySelector('#chronoshards')
const cashIndicators = document.querySelector('#cash-indicators')
const highestCellsElement = document.querySelector('#highest-cells')
const tierRequirementElement = document.querySelector('#tier-requirement')
const tierOptions = document.querySelector('#tier-options')
const previousTierButton = document.querySelector('#previous-tier')
const nextTierButton = document.querySelector('#next-tier')
const virtualJoystick = document.querySelector('#virtual-joystick')

let lastGameOverTip = ''

function getGameOverTip() {
  const availableTips = TIPS.filter((tip) => tip !== lastGameOverTip)
  const tip = availableTips[Math.floor(Math.random() * availableTips.length)] ?? TIPS[0]
  lastGameOverTip = tip
  return tip
}

const CELL_BANK_STORAGE_KEY = 'asteroid-belt-banked-cells'
const TIER_STORAGE_KEY = 'asteroid-belt-selected-tier'
const TIER_HIGH_SCORES_STORAGE_KEY = 'asteroid-belt-tier-high-scores'
const CASH_STORAGE_KEY = 'asteroid-belt-cash'
const CHRONOSHARDS_STORAGE_KEY = 'asteroid-belt-chronoshards'
const RESEARCH_LAB_STORAGE_KEY = 'asteroid-belt-research-lab'
const SAVED_ROUND_STORAGE_KEY = 'asteroid-belt-saved-round'
const BUILDINGS_STORAGE_KEY = 'asteroid-belt-buildings'
const FEATURE_UNLOCKS_STORAGE_KEY = 'asteroid-belt-feature-unlocks'
const MILESTONES_STORAGE_KEY = 'asteroid-belt-milestones'
const LEGACY_STORAGE_KEYS = [
  ['astroid-belt-banked-cells', CELL_BANK_STORAGE_KEY], ['astroid-belt-selected-tier', TIER_STORAGE_KEY], ['astroid-belt-tier-high-scores', TIER_HIGH_SCORES_STORAGE_KEY],
  ['astroid-belt-cash', CASH_STORAGE_KEY], ['astroid-belt-chronoshards', CHRONOSHARDS_STORAGE_KEY], ['astroid-belt-research-lab', RESEARCH_LAB_STORAGE_KEY],
  ['astroid-belt-saved-round', SAVED_ROUND_STORAGE_KEY], ['astroid-belt-buildings', BUILDINGS_STORAGE_KEY], ['astroid-belt-feature-unlocks', FEATURE_UNLOCKS_STORAGE_KEY],
]
for (const [legacyKey, currentKey] of LEGACY_STORAGE_KEYS) {
  try { if (localStorage.getItem(currentKey) === null && localStorage.getItem(legacyKey) !== null) localStorage.setItem(currentKey, localStorage.getItem(legacyKey)) } catch {}
}
const tierKeys = Object.keys(DIFFICULTY)

function readStoredNumber(key, fallback = 0) {
  try {
    const value = Number(window.localStorage.getItem(key))
    return Number.isFinite(value) && value >= 0 ? value : fallback
  } catch {
    return fallback
  }
}

function writeStoredNumber(key, value) {
  try {
    window.localStorage.setItem(key, String(value))
  } catch {
    // The game remains playable when storage is unavailable.
  }
}

function readSavedRound() {
  try {
    const savedRound = JSON.parse(window.localStorage.getItem(SAVED_ROUND_STORAGE_KEY))
    return savedRound && typeof savedRound === 'object' ? savedRound : null
  } catch {
    return null
  }
}

function persistSavedRound(round) {
  try {
    if (round) window.localStorage.setItem(SAVED_ROUND_STORAGE_KEY, JSON.stringify(round))
    else window.localStorage.removeItem(SAVED_ROUND_STORAGE_KEY)
  } catch {
    // Round saving is optional when browser storage is unavailable.
  }
}

function readStoredTierHighScores() {
  try {
    const storedScores = JSON.parse(window.localStorage.getItem(TIER_HIGH_SCORES_STORAGE_KEY))
    if (!storedScores || typeof storedScores !== 'object') return {}
    return Object.fromEntries(tierKeys.map((tierKey) => [
      tierKey,
      Number.isFinite(storedScores[tierKey]) && storedScores[tierKey] >= 0 ? storedScores[tierKey] : 0,
    ]))
  } catch {
    return {}
  }
}

function writeStoredTierHighScores() {
  try {
    window.localStorage.setItem(TIER_HIGH_SCORES_STORAGE_KEY, JSON.stringify(tierHighScores))
  } catch {
    // The game remains playable when storage is unavailable.
  }
}

function readMilestoneState() {
  try {
    const storedState = JSON.parse(window.localStorage.getItem(MILESTONES_STORAGE_KEY))
    if (!storedState || typeof storedState !== 'object') return { version: 0, claimed: [] }
    return {
      version: Number(storedState.version) || 0,
      claimed: Array.isArray(storedState.claimed) ? storedState.claimed.filter((id) => MILESTONES.some((milestone) => milestone.id === id)) : [],
    }
  } catch {
    return { version: 0, claimed: [] }
  }
}

function saveMilestoneState() {
  try {
    window.localStorage.setItem(MILESTONES_STORAGE_KEY, JSON.stringify(milestoneState))
  } catch {
    // Milestones remain available for the current session when storage is unavailable.
  }
}

function getUnlockedTierIndex() {
  return MILESTONES
    .filter((milestone) => milestoneState.claimed.includes(milestone.id))
    .flatMap((milestone) => milestone.rewards.filter((reward) => reward.type === 'tier').map((reward) => reward.tier - 1))
    .reduce((highestTier, tierIndex) => Math.max(highestTier, tierIndex), 0)
}

function isResearchTierUnlocked(tier) {
  return getUnlockedTierIndex() + 1 >= tier
}

function isResearchMilestoneUnlocked(researchId) {
  return MILESTONES.some((milestone) => milestoneState.claimed.includes(milestone.id)
    && milestone.rewards.some((reward) => reward.type === 'research' && reward.researchIds.includes(researchId)))
}

let bankedCells = readStoredNumber(CELL_BANK_STORAGE_KEY)
const tierHighScores = readStoredTierHighScores()
const milestoneState = readMilestoneState()
if (milestoneState.version !== 3) {
  milestoneState.claimed = MILESTONES
    .filter((milestone) => (tierHighScores[tierKeys[milestone.tier - 1]] ?? 0) >= milestone.cells)
    .map((milestone) => milestone.id)
  milestoneState.version = 3
  saveMilestoneState()
}
let selectedTierIndex = Math.min(readStoredNumber(TIER_STORAGE_KEY), getUnlockedTierIndex())
let milestoneTierIndex = selectedTierIndex
let cash = readStoredNumber(CASH_STORAGE_KEY)
let chronoshards = readStoredNumber(CHRONOSHARDS_STORAGE_KEY)
let savedRound = readSavedRound()
let featureUnlocks = (() => { try { const saved = JSON.parse(localStorage.getItem(FEATURE_UNLOCKS_STORAGE_KEY)); return { researchLab: Boolean(saved?.researchLab), buildingSystem: Boolean(saved?.buildingSystem) } } catch { return { researchLab: false, buildingSystem: false } } })()
let buildingState = (() => { try { const saved = JSON.parse(localStorage.getItem(BUILDINGS_STORAGE_KEY)); return saved?.unlocked ? saved : { unlocked: [], placed: [] } } catch { return { unlocked: [], placed: [] } } })()
const buildingMeshes = new Map()
const buildingRuntime = new Map()
let buildMode = false
let selectedBuildingType = null
let buildingPreview = null
let researchSearchQuery = ''
const collapsedResearchCategories = new Set()

function createDefaultResearchState() {
  return { unlockedSlots: 1, levels: {}, slots: Array(RESEARCH_CONFIG.maxSlots).fill(null) }
}

function readResearchState() {
  try {
    const storedState = JSON.parse(window.localStorage.getItem(RESEARCH_LAB_STORAGE_KEY))
    if (!storedState || typeof storedState !== 'object') return createDefaultResearchState()
    return {
      unlockedSlots: THREE.MathUtils.clamp(Number.parseInt(storedState.unlockedSlots, 10) || 1, 1, RESEARCH_CONFIG.maxSlots),
      levels: storedState.levels && typeof storedState.levels === 'object' ? storedState.levels : {},
      slots: Array.from({ length: RESEARCH_CONFIG.maxSlots }, (_, index) => storedState.slots?.[index] ?? null),
    }
  } catch {
    return createDefaultResearchState()
  }
}

const researchState = readResearchState()
let freeResearch = false

function saveResearchState() {
  try {
    window.localStorage.setItem(RESEARCH_LAB_STORAGE_KEY, JSON.stringify(researchState))
  } catch {
    // Research continues for the current session when storage is unavailable.
  }
}

function getResearchById(researchId) {
  return RESEARCH_CONFIG.researches.find((research) => research.id === researchId)
}

function getResearchLevel(researchId) {
  return researchState.levels[researchId] ?? 0
}

function getResearchStatBonus(stat) {
  return RESEARCH_CONFIG.researches
    .filter((research) => research.effect?.stat === stat)
    .reduce((total, research) => total + getResearchLevel(research.id) * research.effect.perLevel, 0)
}

function getEffectiveEnemyRange(type, baseRange) {
  const debuffStat = { chaser: 'chaserRangeDebuff', banger: 'bangerRangeDebuff', shooter: 'shooterRangeDebuff' }[type]
  return debuffStat ? baseRange * Math.max(0.5, 1 - getResearchStatBonus(debuffStat)) : baseRange
}

function getResearchCost(research, level) {
  const jerk = research.cost.jerk ?? 1
  const amount = research.cost.base
    * research.cost.multiplier ** level
    * jerk ** (level * (level - 1) / 2)
  return research.cost.currency === 'cash' ? Math.round(amount * 100) / 100 : Math.ceil(amount)
}

function getResearchDuration(research, level) {
  return Math.round(research.duration.baseMs * research.duration.multiplier ** level)
}

function formatResearchEffect(research, level) {
  if (!research.effect) return level > 0 ? 'UNLOCKED' : 'LOCKED'
  const effect = level * research.effect.perLevel
  return research.effect.format === 'percent' ? `+${(effect * 100).toFixed(effect * 100 % 1 ? 1 : 0)}%` : String(effect)
}

function formatDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

function formatCurrency(currency, amount) {
  return currency === 'cash'
    ? `$${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    : `✦ ${amount.toLocaleString()}`
}

function getResearchLockReason(research) {
  const requirements = research.requirements ?? {}
  if (requirements.minTier && !isResearchMilestoneUnlocked(research.id)) return 'Unlock this research in Ascension'
  if (requirements.minBankedCells && bankedCells < requirements.minBankedCells) return `Requires ${requirements.minBankedCells} banked cells`
  if (requirements.researchId && getResearchLevel(requirements.researchId) < 1) return `Requires ${getResearchById(requirements.researchId).name}`
  for (const [researchId, level] of Object.entries(requirements.researchLevels ?? {})) {
    if (getResearchLevel(researchId) < level) return `Requires ${getResearchById(researchId).name} Lv. ${level}`
  }
  return ''
}

function isResearchVisible(research) {
  const visibleWhen = research.visibleWhen
  return !visibleWhen?.anyResearch || visibleWhen.anyResearch.some((researchId) => getResearchLevel(researchId) > 0)
}

function completeFinishedResearches() {
  const now = Date.now()
  let changed = false
  for (let index = 0; index < researchState.unlockedSlots; index += 1) {
    const slot = researchState.slots[index]
    if (!slot || (RESEARCH_CONFIG.durationsEnabled && slot.completesAt > now)) continue
    const research = getResearchById(slot.researchId)
    researchState.levels[slot.researchId] = Math.min(getResearchLevel(slot.researchId) + 1, research.maxLevel)
    researchState.slots[index] = null
    changed = true
  }
  if (changed) saveResearchState()
  return changed
}

function setLabMessage(message = '') {
  labMessageElement.textContent = message
}

function renderResearchLab() {
  completeFinishedResearches()
  labCashElement.textContent = `$${cash.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
  labChronoshardsElement.textContent = `✦ ${chronoshards.toLocaleString()}`
  const now = Date.now()
  researchSlotsHeading.hidden = !RESEARCH_CONFIG.durationsEnabled
  researchSlotsElement.hidden = !RESEARCH_CONFIG.durationsEnabled
  researchSlotsElement.innerHTML = RESEARCH_CONFIG.durationsEnabled ? researchState.slots.map((slot, index) => {
    const slotNumber = index + 1
    if (slot) {
      const research = getResearchById(slot.researchId)
      const duration = getResearchDuration(research, slot.level)
      const remaining = Math.max(0, slot.completesAt - now)
      const progress = THREE.MathUtils.clamp(1 - remaining / duration, 0, 1) * 100
      return `<article class="research-slot active"><span>SLOT ${slotNumber}</span><strong>${research.name} · Lv. ${slot.level + 1}</strong><div class="research-progress"><i style="width:${progress}%"></i></div><small>${formatDuration(remaining)} remaining</small></article>`
    }
    if (slotNumber <= researchState.unlockedSlots) return `<article class="research-slot"><span>SLOT ${slotNumber}</span><strong>AVAILABLE</strong><small>Select a research below.</small></article>`
    const unlock = RESEARCH_CONFIG.slotUnlocks.find((entry) => entry.slot === slotNumber)
    const tierUnlocked = !unlock.requirements?.minTier || isResearchTierUnlocked(unlock.requirements.minTier)
    const canAfford = unlock.cost.currency === 'cash' ? cash >= unlock.cost.amount : chronoshards >= unlock.cost.amount
    const disabled = tierUnlocked && canAfford ? '' : 'disabled'
    const requirement = tierUnlocked ? `Unlock for ${formatCurrency(unlock.cost.currency, unlock.cost.amount)}` : `Unlock Tier ${unlock.requirements.minTier} research in Milestones`
    return `<article class="research-slot locked"><span>SLOT ${slotNumber}</span><strong>LOCKED</strong><button data-unlock-slot="${slotNumber}" type="button" ${disabled}>${requirement}</button></article>`
  }).join('') : ''

  const researchesByCategory = new Map()
  for (const research of RESEARCH_CONFIG.researches.filter(isResearchVisible)) {
    const category = research.category ?? 'General'
    researchesByCategory.set(category, [...(researchesByCategory.get(category) ?? []), research])
  }
  const normalizedSearch = researchSearchQuery.trim().toLocaleLowerCase()
  const visibleCategories = [...researchesByCategory.entries()]
    .map(([category, researches]) => [category, researches.filter((research) => research.name.toLocaleLowerCase().includes(normalizedSearch))])
    .filter(([, researches]) => researches.length)
  researchListElement.innerHTML = visibleCategories.length ? visibleCategories.map(([category, researches]) => {
    const open = normalizedSearch || !collapsedResearchCategories.has(category)
    return `<section class="research-category ${open ? 'open' : ''}"><button class="research-category-toggle" data-toggle-research-category="${category}" type="button" aria-expanded="${open}"><span>${category}</span><i aria-hidden="true">›</i></button><div class="research-grid">${researches.map((research) => {
    const level = getResearchLevel(research.id)
    const lockReason = getResearchLockReason(research)
    const active = RESEARCH_CONFIG.durationsEnabled && researchState.slots.some((slot) => slot?.researchId === research.id)
    const full = level >= research.maxLevel
    const cost = getResearchCost(research, level)
    const duration = getResearchDuration(research, level)
    const canAfford = freeResearch || (research.cost.currency === 'cash' ? cash >= cost : chronoshards >= cost)
    const noAvailableSlot = RESEARCH_CONFIG.durationsEnabled && !researchState.slots.slice(0, researchState.unlockedSlots).some((slot) => !slot)
    const disabled = lockReason || active || full || !canAfford || noAvailableSlot
    const status = full ? 'MAX LEVEL' : active ? 'IN PROGRESS' : lockReason || (freeResearch ? 'FREE RESEARCH ENABLED' : `Cost ${formatCurrency(research.cost.currency, cost)}${RESEARCH_CONFIG.durationsEnabled ? ` · ${formatDuration(duration)}` : ''}`)
    return `<article class="research-card"><div><span class="research-level">LV. ${level}/${research.maxLevel}</span><h4>${research.name}</h4><p>${research.description}</p><p class="research-effect">${formatResearchEffect(research, level)} → ${formatResearchEffect(research, Math.min(level + 1, research.maxLevel))}</p><small>${status}</small></div><button data-start-research="${research.id}" type="button" ${disabled ? 'disabled' : ''}>${full ? 'MAXED' : 'RESEARCH'}</button></article>`
    }).join('')}</div></section>`
  }).join('') : '<p class="research-empty">No research names match your search.</p>'
}

function startResearch(researchId) {
  completeFinishedResearches()
  const research = getResearchById(researchId)
  const level = getResearchLevel(researchId)
  const lockReason = getResearchLockReason(research)
  const emptySlot = researchState.slots.slice(0, researchState.unlockedSlots).findIndex((slot) => !slot)
  const cost = getResearchCost(research, level)
  const balance = research.cost.currency === 'cash' ? cash : chronoshards
  const researchAlreadyActive = RESEARCH_CONFIG.durationsEnabled && researchState.slots.some((slot) => slot?.researchId === researchId)
  if (lockReason || level >= research.maxLevel || (RESEARCH_CONFIG.durationsEnabled && emptySlot < 0) || researchAlreadyActive || (!freeResearch && balance < cost)) return
  if (!freeResearch) {
    if (research.cost.currency === 'cash') updateCash(-cost)
    else updateChronoshards(-cost)
  }
  if (RESEARCH_CONFIG.durationsEnabled) {
    researchState.slots[emptySlot] = { researchId, level, completesAt: Date.now() + getResearchDuration(research, level) }
  } else {
    researchState.levels[researchId] = Math.min(level + 1, research.maxLevel)
    if (researchId === 'shield' && started) {
      shieldCharges += 1
      shieldBubble.visible = true
    }
  }
  saveResearchState()
  setLabMessage(RESEARCH_CONFIG.durationsEnabled ? `${research.name} research started in Slot ${emptySlot + 1}.` : `${research.name} upgraded to Level ${level + 1}.`)
  renderResearchLab()
}

function unlockResearchSlot(slotNumber) {
  const unlock = RESEARCH_CONFIG.slotUnlocks.find((entry) => entry.slot === slotNumber)
  if (!unlock || slotNumber !== researchState.unlockedSlots + 1) return
  if (unlock.requirements?.minTier && !isResearchTierUnlocked(unlock.requirements.minTier)) return
  const balance = unlock.cost.currency === 'cash' ? cash : chronoshards
  if (balance < unlock.cost.amount) return
  if (unlock.cost.currency === 'cash') updateCash(-unlock.cost.amount)
  else updateChronoshards(-unlock.cost.amount)
  researchState.unlockedSlots = slotNumber
  saveResearchState()
  setLabMessage(`Research Slot ${slotNumber} unlocked.`)
  renderResearchLab()
}

function setCheatOutput(message) {
  cheatOutput.textContent = message
}

function toggleCheatConsole(forceOpen) {
  if (!CHEAT_CONFIG.enabled) return
  const shouldOpen = forceOpen ?? cheatConsole.classList.contains('hidden')
  cheatConsole.classList.toggle('hidden', !shouldOpen)
  if (shouldOpen) {
    cheatInput.focus()
    cheatInput.select()
  }
}

function clearCurrencySave() {
  cash = 0
  chronoshards = 0
  updateCash()
  updateChronoshards()
}

function clearGameProgressSave() {
  bankedCells = 0
  selectedTierIndex = 0
  milestoneState.claimed = []
  for (const tierKey of tierKeys) tierHighScores[tierKey] = 0
  writeStoredNumber(CELL_BANK_STORAGE_KEY, bankedCells)
  writeStoredNumber(TIER_STORAGE_KEY, selectedTierIndex)
  writeStoredTierHighScores()
  saveMilestoneState()
  applyDifficulty()
  renderTierOptions()
  renderMilestones()
  resetGame()
}

function clearMilestonesSave() {
  milestoneState.claimed = []
  milestoneState.version = 3
  for (const tierKey of tierKeys) tierHighScores[tierKey] = 0
  selectedTierIndex = 0
  writeStoredNumber(TIER_STORAGE_KEY, selectedTierIndex)
  writeStoredTierHighScores()
  saveMilestoneState()
  applyDifficulty()
  renderTierOptions()
  renderMilestones()
  renderResearchLab()
  resetGame()
}

function clearResearchSave() {
  researchState.unlockedSlots = 1
  researchState.levels = {}
  researchState.slots = Array(RESEARCH_CONFIG.maxSlots).fill(null)
  freeResearch = false
  saveResearchState()
  renderResearchLab()
}

function saveFeatureUnlocks() { try { localStorage.setItem(FEATURE_UNLOCKS_STORAGE_KEY, JSON.stringify(featureUnlocks)) } catch {} }
function clearFeatureUnlocks() { featureUnlocks = { researchLab: false, buildingSystem: false }; saveFeatureUnlocks(); renderFeatureUnlockButtons() }
function renderFeatureUnlockButtons() {
  for (const [feature, button] of [['researchLab', openLabButton], ['buildingSystem', openBuildingButton]]) {
    const unlock = RESEARCH_CONFIG.featureUnlocks[feature]
    const unlocked = featureUnlocks[feature]
    const tierReady = getUnlockedTierIndex() + 1 >= unlock.minTier
    const name = feature === 'researchLab' ? 'RESEARCH LAB' : 'BUILDING SYSTEM'
    button.className = `menu-system-button ${unlocked ? 'is-unlocked' : tierReady ? 'is-unlockable' : 'is-locked'}`
    button.disabled = !unlocked && !tierReady
    button.textContent = unlocked ? name : tierReady ? `UNLOCK ${name} · ✦ ${unlock.chronoshardCost}` : `${name} · TIER ${unlock.minTier}`
  }
}
function unlockFeature(feature) {
  const unlock = RESEARCH_CONFIG.featureUnlocks[feature]
  if (featureUnlocks[feature] || getUnlockedTierIndex() + 1 < unlock.minTier || chronoshards < unlock.chronoshardCost) return false
  updateChronoshards(-unlock.chronoshardCost)
  featureUnlocks[feature] = true
  saveFeatureUnlocks()
  renderFeatureUnlockButtons()
  return true
}

function clearBuildingsSave() {
  buildingState = { unlocked: [], placed: [] }
  selectedBuildingType = null
  setBuildingPreview(null)
  saveBuildings()
  syncBuildings()
  renderBuildings()
}

function runCheatCommand(rawCommand) {
  const [command, argument] = rawCommand.trim().toLowerCase().split(/\s+/, 2)
  if (!command) return
  const amount = Number(argument)
  if (command === CHEAT_CONFIG.commands.cash || command === CHEAT_CONFIG.commands.chrono) {
    if (!Number.isFinite(amount) || amount <= 0) {
      setCheatOutput(`Usage: ${command} [positive amount]`)
      return
    }
    if (command === CHEAT_CONFIG.commands.cash) updateCash(amount)
    else updateChronoshards(amount)
    setCheatOutput(`Granted ${command === CHEAT_CONFIG.commands.cash ? '$' : '✦ '}${amount.toLocaleString()}.`)
    return
  }
  if (command === CHEAT_CONFIG.commands.freeResearch) {
    freeResearch = true
    renderResearchLab()
    setCheatOutput('Free research enabled for this session.')
    return
  }
  if (command === CHEAT_CONFIG.commands.unlockTiers) {
    milestoneState.claimed = MILESTONES.map((milestone) => milestone.id)
    saveMilestoneState()
    renderTierOptions()
    renderResearchLab()
    renderMilestones()
    setCheatOutput('All difficulty tiers unlocked.')
    return
  }
  if (command === CHEAT_CONFIG.commands.clearSave) {
    if (!CHEAT_CONFIG.clearSaveTargets.includes(argument)) {
      setCheatOutput(`Usage: clear_save [${CHEAT_CONFIG.clearSaveTargets.join(', ')}]`)
      return
    }
    if (argument === 'currency' || argument === 'all') clearCurrencySave()
    if (argument === 'game_progress' || argument === 'all') clearGameProgressSave()
    if (argument === 'milestones' || argument === 'all') clearMilestonesSave()
    if (argument === 'research' || argument === 'all') clearResearchSave()
    if (argument === 'buildings' || argument === 'all') clearBuildingsSave()
    if (argument === 'all') clearFeatureUnlocks()
    setCheatOutput(`Cleared ${argument.replace('_', ' ')} save data.`)
    return
  }
  setCheatOutput(`Unknown command: ${command}`)
}

function getCurrentDifficulty() {
  return DIFFICULTY[tierKeys[selectedTierIndex]]
}

function updateBankedCells(amount = 0) {
  bankedCells += amount
  writeStoredNumber(CELL_BANK_STORAGE_KEY, bankedCells)
  renderTierOptions()
}

function updateCash(amount = 0) {
  cash = Math.round((cash + amount) * 100) / 100
  writeStoredNumber(CASH_STORAGE_KEY, cash)
  cashElement.textContent = `$${cash.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: cash % 1 === 0 ? 0 : 2 })}`
  renderResearchLab()
}

function updateChronoshards(amount = 0) {
  chronoshards += amount
  writeStoredNumber(CHRONOSHARDS_STORAGE_KEY, chronoshards)
  chronoshardsElement.textContent = `✦ ${chronoshards}`
  renderResearchLab()
}

function showCashIndicator(position, amount) {
  showCurrencyIndicator(position, `+$${amount}`, 'cash-indicator')
}

function showCurrencyIndicator(position, text, className) {
  const projectedPosition = position.clone().project(camera)
  const indicator = document.createElement('span')
  indicator.className = className
  indicator.textContent = text
  indicator.style.left = `${(projectedPosition.x * 0.5 + 0.5) * window.innerWidth}px`
  indicator.style.top = `${(-projectedPosition.y * 0.5 + 0.5) * window.innerHeight}px`
  indicator.addEventListener('animationend', () => indicator.remove())
  cashIndicators.append(indicator)
}

function recordTierHighScore() {
  const tierKey = tierKeys[selectedTierIndex]
  if (score > (tierHighScores[tierKey] ?? 0)) {
    tierHighScores[tierKey] = score
    writeStoredTierHighScores()
  }
  saveMilestoneState()
  renderTierOptions()
  renderResearchLab()
  renderMilestones()
}

function renderTierOptions() {
  const unlockedTierIndex = getUnlockedTierIndex()
  if (selectedTierIndex > unlockedTierIndex) selectedTierIndex = unlockedTierIndex
  tierOptions.textContent = `Tier ${selectedTierIndex + 1}`
  highestCellsElement.textContent = String(tierHighScores[tierKeys[selectedTierIndex]] ?? 0).padStart(3, '0')
  const nextMilestone = MILESTONES.find((milestone) => milestone.tier === selectedTierIndex + 1 && !milestoneState.claimed.includes(milestone.id))
  const tierBestCells = tierHighScores[tierKeys[selectedTierIndex]] ?? 0
  tierRequirementElement.textContent = nextMilestone ? tierBestCells >= nextMilestone.cells ? 'ASCENSION REWARD READY TO CLAIM' : `NEXT ASCENSION: ${nextMilestone.cells} CELLS` : 'ASCENSION COMPLETE'
  previousTierButton.disabled = selectedTierIndex === 0
  nextTierButton.disabled = selectedTierIndex >= unlockedTierIndex
  const claimableCount = MILESTONES.filter((milestone) => !milestoneState.claimed.includes(milestone.id) && (tierHighScores[tierKeys[milestone.tier - 1]] ?? 0) >= milestone.cells).length
  milestoneClaimCount.textContent = String(claimableCount)
  milestoneClaimCount.hidden = claimableCount === 0
  renderFeatureUnlockButtons()
}

function selectTier(tierIndex) {
  if (tierIndex < 0 || tierIndex > getUnlockedTierIndex()) return
  selectedTierIndex = tierIndex
  writeStoredNumber(TIER_STORAGE_KEY, selectedTierIndex)
  applyDifficulty()
  renderTierOptions()
}

previousTierButton.addEventListener('click', () => selectTier(selectedTierIndex - 1))
nextTierButton.addEventListener('click', () => selectTier(selectedTierIndex + 1))
openMilestonesButton.addEventListener('click', () => {
  menuContent.classList.add('hidden')
  milestoneTierIndex = selectedTierIndex
  milestonesPanel.classList.remove('hidden')
  renderMilestones()
})
closeMilestonesButton.addEventListener('click', () => {
  milestonesPanel.classList.add('hidden')
  menuContent.classList.remove('hidden')
})
previousMilestoneTierButton.addEventListener('click', () => {
  milestoneTierIndex = Math.max(0, milestoneTierIndex - 1)
  renderMilestones()
})
nextMilestoneTierButton.addEventListener('click', () => {
  milestoneTierIndex = Math.min(getUnlockedTierIndex(), milestoneTierIndex + 1)
  renderMilestones()
})
milestoneTrack.addEventListener('click', (event) => {
  const claimButton = event.target.closest('[data-claim-milestone]')
  if (claimButton) claimMilestone(claimButton.dataset.claimMilestone)
})

function formatMilestoneReward(reward) {
  if (reward.type === 'cash') return `+$${reward.amount.toLocaleString()} cash`
  if (reward.type === 'chronoshards') return `+✦ ${reward.amount} Chronoshards`
  if (reward.type === 'tier') return `Unlock Tier ${reward.tier}`
  if (reward.type === 'research') return `Unlock: ${reward.researchIds.map((id) => getResearchById(id)?.name ?? id).join(', ')}`
  return 'Reward'
}

let milestoneToastTimer

function claimMilestone(milestoneId) {
  const milestone = MILESTONES.find((entry) => entry.id === milestoneId)
  const bestCells = milestone ? tierHighScores[tierKeys[milestone.tier - 1]] ?? 0 : 0
  if (!milestone || milestoneState.claimed.includes(milestone.id) || bestCells < milestone.cells) return
  milestoneState.claimed.push(milestone.id)
  for (const reward of milestone.rewards) {
    if (reward.type === 'cash') updateCash(reward.amount)
    if (reward.type === 'chronoshards') updateChronoshards(reward.amount)
  }
  saveMilestoneState()
  milestoneClaimToast.textContent = `REWARD CLAIMED · ${milestone.rewards.map(formatMilestoneReward).join(' · ')}`
  milestoneClaimToast.classList.remove('hidden')
  clearTimeout(milestoneToastTimer)
  milestoneToastTimer = setTimeout(() => milestoneClaimToast.classList.add('hidden'), 3600)
  renderTierOptions()
  renderResearchLab()
  renderMilestones()
}

function renderMilestones() {
  const tier = milestoneTierIndex + 1
  const bestCells = tierHighScores[tierKeys[milestoneTierIndex]] ?? 0
  milestoneMaxCells.textContent = String(bestCells).padStart(3, '0')
  milestoneTierLabel.textContent = `TIER ${tier}`
  previousMilestoneTierButton.disabled = milestoneTierIndex === 0
  nextMilestoneTierButton.disabled = milestoneTierIndex >= getUnlockedTierIndex()
  milestoneTrack.innerHTML = MILESTONES.filter((milestone) => milestone.tier === tier).map((milestone) => {
    const claimed = milestoneState.claimed.includes(milestone.id)
    const reached = bestCells >= milestone.cells
    const progress = Math.min(100, bestCells / milestone.cells * 100)
    return `<article class="milestone-card ${claimed ? 'claimed' : reached ? 'reached' : ''}"><div class="milestone-node">${claimed ? '✓' : milestone.cells}</div><div><strong>${claimed ? 'REWARD SECURED' : `${milestone.cells} CELLS`}</strong><p>${milestone.rewards.map(formatMilestoneReward).join(' · ')}</p><div class="milestone-progress"><i style="width:${progress}%"></i></div><small>${claimed ? 'Claimed automatically' : `${bestCells}/${milestone.cells} best cells in Tier ${tier}`}</small></div></article>`
  }).join('')
  const tierMilestones = MILESTONES.filter((milestone) => milestone.tier === tier)
  for (const [index, milestone] of tierMilestones.entries()) {
    const claimed = milestoneState.claimed.includes(milestone.id)
    const reached = bestCells >= milestone.cells
    const card = milestoneTrack.children[index]
    if (!card) continue
    if (claimed) card.querySelector('small').textContent = 'Claimed'
    if (reached && !claimed) {
      const button = document.createElement('button')
      button.className = 'claim-milestone-button'
      button.dataset.claimMilestone = milestone.id
      button.type = 'button'
      button.textContent = 'CLAIM REWARD'
      card.lastElementChild.append(button)
    }
  }
}

function createSoundSystem() {
  let context
  let masterGain
  const buffers = new Map()
  let soundLoadPromise

  async function loadSound(name, url) {
    try {
      const response = await fetch(url)
      if (!response.ok) return
      buffers.set(name, await context.decodeAudioData(await response.arrayBuffer()))
    } catch {
      // The synthesized fallback remains available when a custom file cannot load.
    }
  }

  function initialize() {
    if (!context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!AudioContext) return Promise.resolve()
      context = new AudioContext()
      masterGain = context.createGain()
      masterGain.gain.value = SOUND.masterVolume
      masterGain.connect(context.destination)
      soundLoadPromise = Promise.all(Object.entries(SOUND.assets).map(([name, url]) => loadSound(name, url)))
    }
    const resumePromise = context.state === 'suspended' ? context.resume() : Promise.resolve()
    return Promise.all([resumePromise, soundLoadPromise])
  }

  function getSpatialMix(sourcePosition) {
    const offset = sourcePosition.clone().sub(player.position)
    offset.y = 0
    const distance = offset.length()
    const attenuation = THREE.MathUtils.lerp(
      SOUND.spatialMinGain,
      1,
      (1 - THREE.MathUtils.clamp(distance / SOUND.spatialMaxDistance, 0, 1)) ** 2,
    )
    if (distance === 0) return { attenuation, pan: 0 }

    const cameraRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
    cameraRight.y = 0
    cameraRight.normalize()
    return { attenuation, pan: THREE.MathUtils.clamp(offset.normalize().dot(cameraRight), -1, 1) }
  }

  function connectSpatialSource(source, volume, sourcePosition) {
    const gain = context.createGain()
    const spatialGain = context.createGain()
    const stereoPanner = context.createStereoPanner?.()
    const now = context.currentTime
    const { attenuation, pan } = getSpatialMix(sourcePosition)
    gain.gain.setValueAtTime(volume, now)
    spatialGain.gain.setValueAtTime(attenuation, now)
    source.connect(gain)
    gain.connect(spatialGain)
    if (stereoPanner) {
      stereoPanner.pan.setValueAtTime(pan, now)
      spatialGain.connect(stereoPanner)
      stereoPanner.connect(masterGain)
    } else {
      spatialGain.connect(masterGain)
    }
  }

  function playTone(startFrequency, endFrequency, duration, volume, sourcePosition, type) {
    if (!context || context.state !== 'running') return
    const oscillator = context.createOscillator()
    const now = context.currentTime
    oscillator.type = type
    oscillator.frequency.setValueAtTime(startFrequency, now)
    oscillator.frequency.linearRampToValueAtTime(endFrequency, now + duration)
    connectSpatialSource(oscillator, volume, sourcePosition)
    oscillator.start(now)
    oscillator.stop(now + duration)
  }

  function playFallingWhoosh(duration, volume, sourcePosition) {
    if (!context || context.state !== 'running') return
    const now = context.currentTime
    const noise = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate)
    const samples = noise.getChannelData(0)
    for (let index = 0; index < samples.length; index += 1) samples[index] = Math.random() * 2 - 1

    const source = context.createBufferSource()
    const filter = context.createBiquadFilter()
    const envelope = context.createGain()
    source.buffer = noise
    filter.type = 'bandpass'
    filter.Q.value = 0.65
    filter.frequency.setValueAtTime(180, now)
    filter.frequency.exponentialRampToValueAtTime(720, now + duration)
    envelope.gain.setValueAtTime(0.0001, now)
    envelope.gain.exponentialRampToValueAtTime(1, now + 0.18)
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    source.connect(filter)
    filter.connect(envelope)
    connectSpatialSource(envelope, volume, sourcePosition)
    source.start(now)
  }

  function playSound(name, volume, sourcePosition, fallback) {
    if (!context || context.state !== 'running') return
    const buffer = buffers.get(name)
    if (!buffer) {
      fallback()
      return
    }
    const source = context.createBufferSource()
    source.buffer = buffer
    connectSpatialSource(source, volume, sourcePosition)
    source.start()
  }

  return {
    initialize,
    playBangerPulse(progress, position) {
      const fallback = SOUND.fallback.bangerPulse
      const frequency = THREE.MathUtils.lerp(fallback.startFrequency, fallback.endFrequency, progress)
      playSound('bangerPulse', SOUND.bangerPulseVolume, position, () => playTone(frequency, frequency, fallback.duration, SOUND.bangerPulseVolume, position, fallback.type))
    },
    playFallingObstacle(position) {
      const fallback = SOUND.fallback.fallingObstacle
      playSound('fallingObstacle', SOUND.fallingObstacleVolume, position, () => playFallingWhoosh(fallback.duration, SOUND.fallingObstacleVolume, position))
    },
    playCellCollect(position) {
      const fallback = SOUND.fallback.cellCollect
      playSound('cellCollect', SOUND.cellCollectVolume, position, () => playTone(fallback.startFrequency, fallback.endFrequency, fallback.duration, SOUND.cellCollectVolume, position, fallback.type))
    },
    playBoosterPickup(position, type) {
      const notes = { speed: [480, 900], thorn: [220, 620], freezer: [720, 260] }
      const [start, end] = notes[type]
      playTone(start, end, 0.22, 0.3, position, type === 'freezer' ? 'sine' : 'triangle')
    },
    playBuildingEffect(position, type) { const notes = { chronoGenerator: [280, 360], gapGenerator: [150, 110], autocannon: [220, 90] }; const [start, end] = notes[type]; playTone(start, end, 0.12, 0.16, position, 'sine') },
    playObstacleSummon(position) {
      const fallback = SOUND.fallback.obstacleSummon
      playSound('obstacleSummon', SOUND.obstacleSummonVolume, position, () => playTone(fallback.startFrequency, fallback.endFrequency, fallback.duration, SOUND.obstacleSummonVolume, position, fallback.type))
    },
    playButtonClick() {
      const fallback = SOUND.fallback.buttonClick
      playSound('buttonClick', SOUND.buttonClickVolume, player.position, () => playTone(fallback.startFrequency, fallback.endFrequency, fallback.duration, SOUND.buttonClickVolume, player.position, fallback.type))
    },
  }
}

const soundSystem = createSoundSystem()

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, GAME.maxPixelRatio))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.outputColorSpace = THREE.SRGBColorSpace

const scene = new THREE.Scene()
scene.background = new THREE.Color(COLORS.background)
scene.fog = new THREE.Fog(COLORS.fog, SCENE.fogNear, SCENE.fogFar)

const camera = new THREE.PerspectiveCamera(CAMERA.fov, window.innerWidth / window.innerHeight, CAMERA.near, CAMERA.far)
camera.position.set(0, CAMERA.height, CAMERA.distance)
camera.lookAt(0, 0, 0)

function createStarfield() {
  const positions = new Float32Array(SCENE.starCount * 3)
  const colors = new Float32Array(SCENE.starCount * 3)

  for (let index = 0; index < SCENE.starCount; index += 1) {
    const radius = SCENE.starfieldRadius
    const y = THREE.MathUtils.randFloatSpread(2)
    const horizontal = Math.sqrt(1 - y * y)
    const angle = Math.random() * Math.PI * 2
    const offset = index * 3
    positions[offset] = Math.cos(angle) * horizontal * radius
    positions[offset + 1] = y * radius
    positions[offset + 2] = Math.sin(angle) * horizontal * radius

    const warmth = Math.random()
    colors[offset] = 0.72 + warmth * 0.28
    colors[offset + 1] = 0.82 + warmth * 0.18
    colors[offset + 2] = 1
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const material = new THREE.PointsMaterial({
    size: SCENE.starSize,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.62,
    vertexColors: true,
    depthWrite: false,
    fog: false,
  })
  const stars = new THREE.Points(geometry, material)
  stars.frustumCulled = false
  return stars
}

const starfield = createStarfield()
scene.add(starfield)

scene.add(new THREE.HemisphereLight(LIGHTING.hemisphereSky, LIGHTING.hemisphereGround, LIGHTING.hemisphereIntensity))
const keyLight = new THREE.DirectionalLight(LIGHTING.key, LIGHTING.keyIntensity)
keyLight.position.set(-7, 13, 5)
keyLight.castShadow = true
keyLight.shadow.mapSize.set(1024, 1024)
scene.add(keyLight)

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(GAME.arenaSize / 2, 96),
  new THREE.MeshStandardMaterial({ color: COLORS.floor, metalness: SCENE.floorMetalness, roughness: SCENE.floorRoughness }),
)
floor.rotation.x = -Math.PI / 2
floor.receiveShadow = true
scene.add(floor)

function createArenaGridGeometry(limit) {
  const points = []
  const segments = 80
  const ringSpacing = 2
  for (let radius = ringSpacing; radius < limit; radius += ringSpacing) {
    for (let index = 0; index < segments; index += 1) {
      const startAngle = index / segments * Math.PI * 2
      const endAngle = (index + 1) / segments * Math.PI * 2
      points.push(
        new THREE.Vector3(Math.cos(startAngle) * radius, 0.01, Math.sin(startAngle) * radius),
        new THREE.Vector3(Math.cos(endAngle) * radius, 0.01, Math.sin(endAngle) * radius),
      )
    }
  }
  for (let index = 0; index < 12; index += 1) {
    const angle = index / 12 * Math.PI * 2
    points.push(new THREE.Vector3(), new THREE.Vector3(Math.cos(angle) * limit, 0.01, Math.sin(angle) * limit))
  }
  return new THREE.BufferGeometry().setFromPoints(points)
}

const grid = new THREE.LineSegments(
  createArenaGridGeometry(GAME.arenaLimit),
  new THREE.LineBasicMaterial({ color: COLORS.gridMinor, transparent: true, opacity: 0.8 }),
)
grid.position.y = 0.01
scene.add(grid)

function createArenaBoundaryGeometry(limit) {
  const segments = 96
  return new THREE.BufferGeometry().setFromPoints(Array.from({ length: segments }, (_, index) => {
    const angle = index / segments * Math.PI * 2
    return new THREE.Vector3(Math.cos(angle) * limit, 0.04, Math.sin(angle) * limit)
  }))
}

const arenaBoundary = new THREE.LineLoop(
  createArenaBoundaryGeometry(GAME.arenaLimit),
  new THREE.LineDashedMaterial({ color: COLORS.arenaBoundary, dashSize: 0.45, gapSize: 0.2 }),
)
arenaBoundary.computeLineDistances()
scene.add(arenaBoundary)

function getArenaLimit() {
  return GAME.arenaLimit + getCurrentDifficulty().extraArenaPadding
}

function keepInsideArena(position, padding = 0) {
  const limit = Math.max(0, getArenaLimit() - padding)
  const distance = Math.hypot(position.x, position.z)
  if (distance > limit) {
    const scale = limit / distance
    position.x *= scale
    position.z *= scale
  }
  return position
}

function applyDifficulty() {
  const difficulty = getCurrentDifficulty()
  const arenaLimit = getArenaLimit()
  floor.geometry.dispose()
  floor.geometry = new THREE.CircleGeometry(GAME.arenaSize / 2 + difficulty.extraArenaPadding, 96)
  grid.geometry.dispose()
  grid.geometry = createArenaGridGeometry(arenaLimit)
  arenaBoundary.geometry.dispose()
  arenaBoundary.geometry = createArenaBoundaryGeometry(arenaLimit)
  arenaBoundary.computeLineDistances()
}

const player = new THREE.Group()
const playerCore = new THREE.Mesh(
  new THREE.IcosahedronGeometry(ENTITIES.playerCoreRadius, ENTITIES.playerCoreDetail),
  new THREE.MeshStandardMaterial({ color: COLORS.player, emissive: COLORS.playerEmissive, emissiveIntensity: ENTITIES.playerCoreEmissiveIntensity, metalness: ENTITIES.playerCoreMetalness, roughness: ENTITIES.playerCoreRoughness }),
)
playerCore.castShadow = true
player.add(playerCore)
const playerRing = new THREE.Mesh(
  new THREE.TorusGeometry(ENTITIES.playerRingRadius, ENTITIES.playerRingTube, ENTITIES.playerRingRadialSegments, ENTITIES.playerRingTubularSegments),
  new THREE.MeshBasicMaterial({ color: COLORS.playerRing }),
)
playerRing.rotation.x = Math.PI / 2
player.add(playerRing)
const slowAuraRing = new THREE.Mesh(
  new THREE.RingGeometry(1 - ENTITIES.slowAuraRingWidth, 1, ENTITIES.slowAuraRingSegments),
  new THREE.MeshBasicMaterial({ color: COLORS.slowAura, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }),
)
slowAuraRing.rotation.x = -Math.PI / 2
slowAuraRing.position.y = -GAME.playerStartHeight + 0.04
slowAuraRing.visible = false
player.add(slowAuraRing)
const shieldBubble = new THREE.Mesh(
  new THREE.SphereGeometry(GAME.playerRadius * 1.15, 20, 14),
  new THREE.MeshBasicMaterial({ color: COLORS.slowAura, transparent: true, opacity: 0.18, wireframe: true, depthWrite: false }),
)
shieldBubble.visible = false
player.add(shieldBubble)
player.position.y = GAME.playerStartHeight
scene.add(player)

const keys = new Set()
const joystickInput = new THREE.Vector2()
let joystickPointerId = null
let joystickOrigin = null
const JOYSTICK_RADIUS = 58
const cells = []
const chronoCells = []
const obstacles = []
const fallingObstacles = []
const fireHazards = []
const splinterPieces = []
const explosions = []
const bangerPulses = []
const shooterProjectiles = []
const autocannonProjectiles = []
const spores = []
const boosters = []
const shockwaves = []
const shockwavePushes = []
const playerDeathEffects = []
const obstacleSpawnWarnings = []
const timer = new THREE.Timer()
let started = false
let paused = false
let ended = false
let score = 0
let elapsed = 0
let spawnTimer = 0
let chronoCellTimer = 0
let obstacleSpawnTimer = 0
let hazardTimer = 0
let shockwaveTimer = 0
let shieldCharges = 0
let shieldInvulnerability = 0
let boosterTimer = 0
let speedBoosterTime = 0
let thornShieldTime = 0
let freezerTime = 0

const cellGeometry = new THREE.OctahedronGeometry(ENTITIES.cellRadius)
const chronoCellGeometry = new THREE.IcosahedronGeometry(ENTITIES.chronoCellRadius, 1)
const fallingRockGeometry = new THREE.IcosahedronGeometry(ENTITIES.obstacleRadius, ENTITIES.fallingRockDetail)
const obstacleCoreGeometry = new THREE.IcosahedronGeometry(ENTITIES.obstacleCoreRadius, 1)
const obstacleSpikeGeometry = new THREE.ConeGeometry(ENTITIES.obstacleSpikeRadius, ENTITIES.obstacleSpikeHeight, ENTITIES.obstacleSpikeSegments)
const shooterProjectileGeometry = new THREE.IcosahedronGeometry(ENTITIES.shooterProjectileRadius, 1)
const sporeGeometry = new THREE.SphereGeometry(ENTITIES.sporeRadius, 10, 8)
const boosterGeometry = new THREE.OctahedronGeometry(0.42)
const spikeDirections = [
  [0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1],
  [1, 1, 1], [-1, 1, 1], [1, 1, -1], [-1, 1, -1],
  [1, -1, 1], [-1, -1, 1], [1, -1, -1], [-1, -1, -1],
].map(([x, y, z]) => new THREE.Vector3(x, y, z).normalize())
const upDirection = new THREE.Vector3(0, 1, 0)

function createSpikedObstacle(material) {
  const obstacle = new THREE.Group()
  const core = new THREE.Mesh(obstacleCoreGeometry, material)
  core.castShadow = true
  obstacle.add(core)

  for (const direction of spikeDirections) {
    const spike = new THREE.Mesh(obstacleSpikeGeometry, material)
    spike.position.copy(direction).multiplyScalar(ENTITIES.obstacleCoreRadius + ENTITIES.obstacleSpikeHeight * 0.28)
    spike.quaternion.setFromUnitVectors(upDirection, direction)
    spike.castShadow = true
    obstacle.add(spike)
  }

  obstacle.userData.material = material
  return obstacle
}

function randomArenaPosition(minDistance = 0) {
  const arenaLimit = getArenaLimit()
  let position
  do {
    const angle = Math.random() * Math.PI * 2
    const radius = Math.sqrt(Math.random()) * arenaLimit
    position = new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)
  } while (position.distanceTo(player.position) < minDistance)
  return position
}

function saveBuildings() { try { localStorage.setItem(BUILDINGS_STORAGE_KEY, JSON.stringify(buildingState)) } catch {} }
function getBuildingSlotLimit() { return 1 + getResearchLevel('building-slots') }
function getBuildingUpgradeCost(building, key) { const entry = BUILDING_CONFIG.types[building.type].upgrades[key]; const level = building.upgrades[key] ?? 0; return Math.ceil(entry.base * 1.65 ** level) }
function getBuildingRefund(building) { return Math.round((building.spent ?? BUILDING_CONFIG.types[building.type].baseCost) * 100) / 100 }
function createBuildingMesh(building) {
  const config = BUILDING_CONFIG.types[building.type]
  const group = new THREE.Group()
  const material = new THREE.MeshStandardMaterial({ color: '#33465a', emissive: config.color, emissiveIntensity: 0.24, metalness: 0.92, roughness: 0.14 })
  const accentColor = building.type === 'autocannon' ? '#ffd36f' : building.type === 'gapGenerator' ? '#63f5cd' : '#a6a2ff'
  const accent = new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 1.25, metalness: 0.78, roughness: 0.12 })
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.53, 0.64, 0.26, 8), material)
  base.position.y = 0.13; group.add(base)
  if (building.type === 'chronoGenerator') { const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 1), accent); core.position.y = 0.6; group.add(core) }
  if (building.type === 'gapGenerator') { const core = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.085, 8, 20), accent); core.rotation.x = Math.PI / 2; core.position.y = 0.54; group.add(core) }
  if (building.type === 'autocannon') { const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.22, 8), accent); turret.position.y = 0.38; group.add(turret); const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.78, 8), accent); barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.5, 0.27); group.add(barrel) }
  const effectRing = new THREE.Mesh(new THREE.RingGeometry(0.985, 1.005, 48), new THREE.MeshBasicMaterial({ color: config.color, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false })); effectRing.rotation.x = -Math.PI / 2; effectRing.position.y = 0.03; effectRing.scale.setScalar(buildingValue(building, 'range')); group.add(effectRing)
  group.position.set(building.x, 0, building.z); group.userData.buildingId = building.id; scene.add(group); buildingMeshes.set(building.id, group); buildingRuntime.set(building.id, { timer: 0, active: 0, effectRing })
}
function syncBuildings() { for (const mesh of buildingMeshes.values()) scene.remove(mesh); buildingMeshes.clear(); buildingRuntime.clear(); for (const building of buildingState.placed) createBuildingMesh(building) }
function buildingCost(type) { const config = BUILDING_CONFIG.types[type]; return Math.ceil(config.baseCost * config.costMultiplier ** buildingState.placed.filter((b) => b.type === type).length) }
function setBuildingPreview(type) {
  if (buildingPreview) scene.remove(buildingPreview)
  buildingPreview = null
  if (!type) return
  const config = BUILDING_CONFIG.types[type]
  const preview = new THREE.Group()
  const material = new THREE.MeshStandardMaterial({ color: '#26374a', emissive: config.color, emissiveIntensity: 0.45, metalness: 0.65, roughness: 0.2 })
  const accent = new THREE.MeshStandardMaterial({ color: type === 'autocannon' ? '#ffd36f' : type === 'gapGenerator' ? '#63f5cd' : '#a6a2ff', emissive: config.color, emissiveIntensity: 1.4, metalness: 0.5, roughness: 0.18 })
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.9, 0.32, 8), material)
  preview.add(base)
  if (type === 'chronoGenerator') { const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.46, 1), accent); core.position.y = 0.62; preview.add(core) }
  if (type === 'gapGenerator') { const core = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.11, 8, 20), accent); core.rotation.x = Math.PI / 2; core.position.y = 0.55; preview.add(core) }
  if (type === 'autocannon') { const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.18, 1.1, 8), accent); barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.48, 0.38); preview.add(barrel) }
  preview.scale.setScalar(0.58)
  preview.renderOrder = 5
  scene.add(preview)
  buildingPreview = preview
}
function renderBuildings() {
  buildingCash.textContent = `$${cash.toLocaleString()}`; buildingChronoshards.textContent = `✦ ${chronoshards}`; buildingSlots.textContent = `${buildingState.placed.length}/${getBuildingSlotLimit()}`
  buildingList.innerHTML = Object.entries(BUILDING_CONFIG.types).map(([type, config]) => { const unlocked = buildingState.unlocked.includes(type); return `<article class="building-card"><strong>${config.name}</strong><small>${unlocked ? `Build cost: $${buildingCost(type)}` : `Unlock: ✦ ${config.unlockCost}`}</small><button data-unlock-building="${type}" ${unlocked ? 'disabled' : ''}>${unlocked ? 'UNLOCKED' : 'UNLOCK'}</button></article>` }).join('')
  buildOptions.innerHTML = buildingState.unlocked.map((type) => `<button data-select-building="${type}" class="${selectedBuildingType === type ? 'selected' : ''}">${BUILDING_CONFIG.types[type].name}<small>$${buildingCost(type)}</small></button>`).join('')
}
function enterBuildMode() { if (!buildingState.unlocked.length) return; buildMode = true; selectedBuildingType = buildingState.unlocked[0]; setBuildingPreview(selectedBuildingType); overlay.classList.add('hidden'); buildBar.classList.remove('hidden'); renderBuildings() }
function exitBuildMode() { buildMode = false; selectedBuildingType = null; setBuildingPreview(null); buildBar.classList.add('hidden'); overlay.classList.remove('hidden'); buildingUpgrade.classList.add('hidden') }
function openBuildingUpgrade(building) { const config = BUILDING_CONFIG.types[building.type]; buildingUpgrade.innerHTML = `<h3>${config.name}</h3><div>${Object.entries(config.upgrades).map(([key]) => { const level = building.upgrades[key] ?? 0; const cost = getBuildingUpgradeCost(building, key); return `<button data-upgrade-building="${building.id}" data-upgrade-key="${key}">${key.toUpperCase()} Lv.${level} · $${cost}</button>` }).join('')}</div><button data-destroy-building="${building.id}" class="secondary-button">DEMOLISH · REFUND $${getBuildingRefund(building)}</button><button data-close-building-upgrade="1">CLOSE</button>`; buildingUpgrade.classList.remove('hidden') }
function buildingValue(building, key) { const config = BUILDING_CONFIG.types[building.type]; const directUpgrade = (config.upgrades[key]?.step ?? 0) * (building.upgrades[key] ?? 0); const effectivenessUpgrade = key === 'slow' ? (config.upgrades.effectiveness?.step ?? 0) * (building.upgrades.effectiveness ?? 0) : 0; return config.effect[key] + directUpgrade + effectivenessUpgrade }
function updateBuildings(delta, total) {
  for (let index = autocannonProjectiles.length - 1; index >= 0; index -= 1) {
    const shot = autocannonProjectiles[index]
    shot.age += delta
    shot.mesh.position.addScaledVector(shot.direction, 14 * delta)
    shot.mesh.rotation.x += delta * 12
    if (shot.mesh.position.distanceTo(shot.destination) < 0.45 || shot.age > 2.5) {
      scene.remove(shot.mesh)
      const targetIndex = obstacles.indexOf(shot.target)
      if (targetIndex >= 0) { scene.remove(shot.target, shot.target.userData.rangeIndicator, shot.target.userData.magnetPulse); obstacles.splice(targetIndex, 1) }
      autocannonProjectiles.splice(index, 1)
    }
  }
  for (const building of buildingState.placed) {
    const runtime = buildingRuntime.get(building.id); if (!runtime) continue
    const mesh = buildingMeshes.get(building.id); runtime.timer += delta; runtime.effectRing.rotation.z += delta * 1.4
    const range = buildingValue(building, 'range'); runtime.effectRing.scale.setScalar(range); runtime.effectRing.material.opacity = 0.12 + Math.sin(total * 3) * 0.06
    if (building.type === 'gapGenerator') { const period = Math.max(2, buildingValue(building, 'period')); if (runtime.timer >= period) { runtime.timer = 0; runtime.active = buildingValue(building, 'duration'); soundSystem.playBuildingEffect(mesh.position, building.type) } runtime.active = Math.max(0, runtime.active - delta); runtime.effectRing.material.opacity = runtime.active > 0 ? 0.48 : 0.12 }
    if (building.type === 'autocannon' && runtime.timer >= Math.max(0.35, buildingValue(building, 'interval'))) { runtime.timer = 0; const target = obstacles.filter((o) => planarDistance(o.position, building) <= range).sort((a, b) => planarDistance(a.position, building) - planarDistance(b.position, building))[0]; if (target) { const direction = target.position.clone().sub(mesh.position); direction.y = 0; direction.normalize(); mesh.rotation.y = Math.atan2(direction.x, direction.z); const shot = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff1a6', transparent: true, opacity: 0.95 })); shot.position.copy(mesh.position).addScaledVector(direction, 0.95); shot.position.y = 0.7; scene.add(shot); autocannonProjectiles.push({ mesh: shot, direction, destination: target.position.clone().setY(0.7), target, age: 0 }); soundSystem.playBuildingEffect(mesh.position, building.type) } }
  }
}

function addCell(savedCell) {
  const material = new THREE.MeshStandardMaterial({ color: COLORS.cell, emissive: COLORS.cellEmissive, emissiveIntensity: ENTITIES.cellEmissiveIntensity, metalness: ENTITIES.cellMetalness, roughness: ENTITIES.cellRoughness })
  const cell = new THREE.Mesh(cellGeometry, material)
  if (savedCell) cell.position.set(savedCell.position.x, savedCell.position.y, savedCell.position.z)
  else cell.position.copy(randomArenaPosition(GAME.cellMinDistance))
  if (!savedCell) cell.position.y = GAME.playerStartHeight
  cell.userData.phase = savedCell?.phase ?? Math.random() * Math.PI * 2
  cell.userData.cashValue = savedCell?.cashValue ?? GAME.cellCashValue * getCurrentDifficulty().cashValueMultiplier * (1 + getResearchStatBonus('cashMultiplier'))
  scene.add(cell)
  cells.push(cell)
}

function addChronoCell(savedCell) {
  if (chronoCells.length > 0) return
  const material = new THREE.MeshStandardMaterial({ color: COLORS.chronoCell, emissive: COLORS.chronoCellEmissive, emissiveIntensity: ENTITIES.chronoCellEmissiveIntensity, metalness: 0.4, roughness: 0.12, transparent: true })
  const chronoCell = new THREE.Mesh(chronoCellGeometry, material)
  if (savedCell) chronoCell.position.set(savedCell.position.x, savedCell.position.y, savedCell.position.z)
  else chronoCell.position.copy(randomArenaPosition(GAME.chronoCellMinDistance))
  if (!savedCell) chronoCell.position.y = GAME.playerStartHeight
  chronoCell.userData.phase = savedCell?.phase ?? Math.random() * Math.PI * 2
  chronoCell.userData.age = savedCell?.age ?? 0
  scene.add(chronoCell)
  chronoCells.push(chronoCell)
}

function addBooster(type) {
  const colors = { speed: '#ffcf76', thorn: '#ff795f', freezer: '#7bdcff' }
  const booster = new THREE.Mesh(boosterGeometry, new THREE.MeshStandardMaterial({ color: colors[type], emissive: colors[type], emissiveIntensity: 1.7, metalness: 0.25, roughness: 0.2 }))
  booster.position.copy(randomArenaPosition(GAME.cellMinDistance))
  booster.position.y = GAME.playerStartHeight
  booster.userData.type = type
  scene.add(booster)
  boosters.push(booster)
}

function activateBooster(type, position) {
  if (type === 'speed') speedBoosterTime = GAME.speedBoosterBaseDuration + getResearchStatBonus('speedBoosterDuration')
  if (type === 'thorn') thornShieldTime = GAME.thornShieldBaseDuration + getResearchStatBonus('thornShieldDuration')
  if (type === 'freezer') freezerTime = GAME.freezerBaseDuration + getResearchStatBonus('freezerDuration')
  soundSystem.playBoosterPickup(position, type)
}

function addObstacle(type) {
  createObstacle(randomArenaPosition(GAME.obstacleMinDistance), type)
}

function scheduleObstacle(savedWarning) {
  const position = savedWarning?.position ?? randomArenaPosition(GAME.obstacleMinDistance)
  const difficulty = getCurrentDifficulty()
  const weightedTypes = difficulty.availableObstacleTypes.map((type) => ({ type, weight: difficulty[`${type}SpawnWeight`] ?? 0 }))
  const totalWeight = weightedTypes.reduce((total, entry) => total + entry.weight, 0)
  let randomWeight = Math.random() * totalWeight
  let type = savedWarning?.type ?? weightedTypes[weightedTypes.length - 1].type
  for (const entry of savedWarning ? [] : weightedTypes) {
    randomWeight -= entry.weight
    if (randomWeight <= 0) {
      type = entry.type
      break
    }
  }
  const obstacleType = OBSTACLE_TYPES[type]
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(ENTITIES.spawnRingInnerRadius, ENTITIES.spawnRingOuterRadius, ENTITIES.spawnRingSegments),
    new THREE.MeshBasicMaterial({ color: obstacleType.color, transparent: true, opacity: ANIMATION.spawnRingBaseOpacity, side: THREE.DoubleSide, depthWrite: false }),
  )
  ring.rotation.x = -Math.PI / 2
  ring.position.set(position.x, 0.03, position.z)
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(ENTITIES.spawnCueGlowRadius, ENTITIES.spawnRingSegments),
    new THREE.MeshBasicMaterial({ color: obstacleType.color, transparent: true, opacity: ANIMATION.spawnCueGlowBaseOpacity, depthWrite: false }),
  )
  glow.rotation.x = -Math.PI / 2
  glow.position.set(position.x, 0.02, position.z)
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 1.12, ENTITIES.spawnCueBeamHeight, ENTITIES.spawnRingSegments, 1, true),
    new THREE.MeshBasicMaterial({ color: obstacleType.color, transparent: true, opacity: ANIMATION.spawnCueBeamBaseOpacity, side: THREE.DoubleSide, depthWrite: false }),
  )
  beam.position.set(position.x, ENTITIES.spawnCueBeamHeight / 2, position.z)
  scene.add(ring, glow, beam)
  obstacleSpawnWarnings.push({ ring, glow, beam, position, type, age: savedWarning?.age ?? 0 })
  if (!savedWarning) soundSystem.playObstacleSummon(position)
}

function createObstacle(position, type, savedObstacle) {
  const obstacleType = OBSTACLE_TYPES[type]
  const material = new THREE.MeshStandardMaterial({ color: obstacleType.color, emissive: obstacleType.emissive, metalness: ENTITIES.obstacleMetalness, roughness: ENTITIES.obstacleRoughness })
  const obstacle = createSpikedObstacle(material)
  obstacle.position.copy(position)
  obstacle.position.y = GAME.obstacleGroundHeight
  obstacle.userData.type = type
  obstacle.userData.age = savedObstacle?.age ?? 0
  obstacle.userData.lifetimeAge = savedObstacle?.lifetimeAge ?? 0
  obstacle.userData.speed = savedObstacle?.speed ?? THREE.MathUtils.randFloat(0.8, 1.45)
  obstacle.userData.pulseTimer = savedObstacle?.pulseTimer ?? 0
  obstacle.userData.shotCooldown = savedObstacle?.shotCooldown ?? 0
  obstacle.userData.teleportTimer = savedObstacle?.teleportTimer ?? 0
  obstacle.userData.teleportTarget = null
  obstacle.userData.colliderRadius = GAME.obstacleColliderRadius
  if (type === 'chaser' || type === 'banger' || type === 'shooter' || type === 'magnet') {
    const rangeIndicator = new THREE.Mesh(
      new THREE.RingGeometry(obstacleType.range - ENTITIES.chaserRangeIndicatorWidth, obstacleType.range, ENTITIES.chaserRangeIndicatorSegments),
      new THREE.MeshBasicMaterial({ color: obstacleType.color, transparent: true, opacity: ANIMATION.chaserRangeIndicatorBaseOpacity, side: THREE.DoubleSide, depthWrite: false }),
    )
    rangeIndicator.rotation.x = -Math.PI / 2
    rangeIndicator.position.set(position.x, 0.025, position.z)
    obstacle.userData.rangeIndicator = rangeIndicator
    scene.add(rangeIndicator)
  }
  if (type === 'magnet') {
    const magnetPulse = new THREE.Mesh(
      new THREE.RingGeometry(0.18, 0.3, ENTITIES.chaserRangeIndicatorSegments),
      new THREE.MeshBasicMaterial({ color: COLORS.slowAura, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }),
    )
    magnetPulse.rotation.x = -Math.PI / 2
    magnetPulse.position.set(position.x, 0.035, position.z)
    obstacle.userData.magnetPulse = magnetPulse
    obstacle.userData.magnetPulsePhase = Math.random()
    scene.add(magnetPulse)
  }
  scene.add(obstacle)
  obstacles.push(obstacle)
}

function randomPositionNearPlayer() {
  const angle = Math.random() * Math.PI * 2
  const distance = THREE.MathUtils.randFloat(ENTITIES.porterTeleportMinDistance, ENTITIES.porterTeleportMaxDistance)
  return keepInsideArena(new THREE.Vector3(
    player.position.x + Math.cos(angle) * distance,
    GAME.obstacleGroundHeight,
    player.position.z + Math.sin(angle) * distance,
  ))
}

function showPorterTeleportTarget(porter) {
  const target = porter.userData.teleportTarget
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.4, 0.65, 32),
    new THREE.MeshBasicMaterial({ color: COLORS.porter, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }),
  )
  ring.rotation.x = -Math.PI / 2
  ring.position.set(target.x, 0.04, target.z)
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.7, 2.8, 20, 1, true),
    new THREE.MeshBasicMaterial({ color: COLORS.porter, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }),
  )
  beam.position.set(target.x, 1.4, target.z)
  porter.userData.teleportEffect = { ring, beam }
  scene.add(ring, beam)
}

function clearPorterTeleportTarget(porter) {
  const effect = porter.userData.teleportEffect
  if (effect) scene.remove(effect.ring, effect.beam)
  porter.userData.teleportEffect = null
}

function releaseSpores(position) {
  const startAngle = Math.random() * Math.PI * 2
  for (let index = 0; index < ENTITIES.sporeCount; index += 1) {
    const angle = startAngle + index * (Math.PI * 2 / ENTITIES.sporeCount)
    const spore = new THREE.Mesh(sporeGeometry, new THREE.MeshStandardMaterial({ color: COLORS.spore, emissive: COLORS.sporeEmissive, emissiveIntensity: 2, transparent: true, opacity: 0.9 }))
    spore.position.set(position.x, GAME.playerStartHeight, position.z)
    scene.add(spore)
    spores.push({ spore, direction: new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)) })
  }
}

function detonateSpore(sporeEnemy) {
  const position = sporeEnemy.position.clone()
  scene.remove(sporeEnemy, sporeEnemy.userData.rangeIndicator, sporeEnemy.userData.magnetPulse)
  clearPorterTeleportTarget(sporeEnemy)
  const index = obstacles.indexOf(sporeEnemy)
  if (index >= 0) obstacles.splice(index, 1)
  releaseSpores(position)
}

function createShooterProjectile(shooter) {
  const projectile = new THREE.Mesh(
    shooterProjectileGeometry,
    new THREE.MeshStandardMaterial({ color: COLORS.shooter, emissive: COLORS.shooterEmissive, emissiveIntensity: 2.6, metalness: 0.25, roughness: 0.2 }),
  )
  projectile.position.set(shooter.position.x, GAME.playerStartHeight, shooter.position.z)
  const direction = player.position.clone().sub(projectile.position)
  direction.y = 0
  if (direction.lengthSq() === 0) direction.set(0, 0, 1)
  else direction.normalize()
  projectile.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0)
  scene.add(projectile)
  shooterProjectiles.push({ projectile, direction, age: 0 })
}

function resolveObstacleCollisions() {
  for (let pass = 0; pass < GAME.obstacleColliderIterations; pass += 1) {
    for (let firstIndex = 0; firstIndex < obstacles.length - 1; firstIndex += 1) {
      const first = obstacles[firstIndex]
      for (let secondIndex = firstIndex + 1; secondIndex < obstacles.length; secondIndex += 1) {
        const second = obstacles[secondIndex]
        const minimumDistance = first.userData.colliderRadius + second.userData.colliderRadius
        const offsetX = second.position.x - first.position.x
        const offsetZ = second.position.z - first.position.z
        const distanceSquared = offsetX * offsetX + offsetZ * offsetZ
        if (distanceSquared >= minimumDistance * minimumDistance) continue

        const firstType = OBSTACLE_TYPES[first.userData.type]
        const secondType = OBSTACLE_TYPES[second.userData.type]
        if (first.userData.type === 'creeper' && secondType.speed === 0) first.userData.staticCollisionSlow = GAME.creeperStaticCollisionSlowDuration
        if (second.userData.type === 'creeper' && firstType.speed === 0) second.userData.staticCollisionSlow = GAME.creeperStaticCollisionSlowDuration

        const distance = Math.sqrt(distanceSquared)
        const normalX = distance > 0.001 ? offsetX / distance : (firstIndex + secondIndex) % 2 ? 1 : -1
        const normalZ = distance > 0.001 ? offsetZ / distance : 0
        const pushDistance = (minimumDistance - distance) / 2
        first.position.x -= normalX * pushDistance
        first.position.z -= normalZ * pushDistance
        second.position.x += normalX * pushDistance
        second.position.z += normalZ * pushDistance
        keepInsideArena(first.position)
        keepInsideArena(second.position)
      }
    }
  }
}

function scheduleFallingObstacles() {
  const difficulty = getCurrentDifficulty()
  const weightedTypes = difficulty.availableFallingRockTypes.map((type) => ({ type, weight: difficulty[`${type}SpawnWeight`] ?? 0 }))
  const totalWeight = weightedTypes.reduce((total, entry) => total + entry.weight, 0)
  let randomWeight = Math.random() * totalWeight
  let type = weightedTypes[weightedTypes.length - 1].type
  for (const entry of weightedTypes) {
    randomWeight -= entry.weight
    if (randomWeight <= 0) {
      type = entry.type
      break
    }
  }
  const target = player.position.clone()
  target.x += THREE.MathUtils.randFloatSpread(GAME.fallingRockImpactOffset * 2)
  target.z += THREE.MathUtils.randFloatSpread(GAME.fallingRockImpactOffset * 2)
  keepInsideArena(target)
  createFallingObstacle(target, undefined, type)
}

function createFallingObstacle(target, savedObstacle, type = savedObstacle?.type ?? 'stoneRock') {
  const rockType = FALLING_ROCK_TYPES[type]
  const obstacle = new THREE.Mesh(
    fallingRockGeometry,
    new THREE.MeshStandardMaterial({ color: rockType.color, emissive: rockType.emissive, emissiveIntensity: rockType.emissiveIntensity, metalness: ENTITIES.fallingObstacleMetalness, roughness: ENTITIES.fallingObstacleRoughness }),
  )
  obstacle.position.set(target.x, GAME.fallingBlockStartHeight, target.z)
  obstacle.castShadow = true

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.15, 32),
    new THREE.MeshBasicMaterial({ color: COLORS.targetShadow, transparent: true, opacity: 0.7, depthWrite: false }),
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.set(target.x, 0.025, target.z)

  const targetRing = new THREE.Mesh(
    new THREE.RingGeometry(1.18, 1.3, 32),
    new THREE.MeshBasicMaterial({ color: COLORS.targetRing, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false }),
  )
  targetRing.rotation.x = -Math.PI / 2
  targetRing.position.set(target.x, 0.03, target.z)

  scene.add(obstacle, shadow, targetRing)
  fallingObstacles.push({ obstacle, shadow, targetRing, target: target.clone(), type, age: savedObstacle?.age ?? 0, landed: savedObstacle?.landed ?? false, impactTriggered: savedObstacle?.impactTriggered ?? false })
  if (!savedObstacle) soundSystem.playFallingObstacle(target)
}

function createFireHazard(position, savedFire) {
  const visual = new THREE.Group()
  visual.position.set(position.x, 0.05, position.z)
  const ground = new THREE.Mesh(
    new THREE.CylinderGeometry(GAME.fieryRockFireRadius, GAME.fieryRockFireRadius * 0.82, 0.06, 32),
    new THREE.MeshBasicMaterial({ color: COLORS.fire, transparent: true, opacity: 0.34, depthWrite: false }),
  )
  visual.add(ground)

  const flames = []
  for (let index = 0; index < GAME.fieryRockFlameCount; index += 1) {
    const angle = (index / GAME.fieryRockFlameCount) * Math.PI * 2 + Math.random() * 0.45
    const distance = index === 0 ? 0 : THREE.MathUtils.randFloat(0.18, GAME.fieryRockFireRadius * 0.66)
    const height = THREE.MathUtils.randFloat(0.75, 1.7) * (index === 0 ? 1.3 : 1)
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(THREE.MathUtils.randFloat(0.15, 0.32), height, 5),
      new THREE.MeshStandardMaterial({ color: index % 3 === 0 ? '#ffe19a' : COLORS.fire, emissive: COLORS.fieryRockEmissive, emissiveIntensity: 2.6, transparent: true, opacity: 0.86, roughness: 0.45, depthWrite: false }),
    )
    flame.position.set(Math.cos(angle) * distance, height / 2, Math.sin(angle) * distance)
    flame.rotation.z = THREE.MathUtils.randFloatSpread(0.28)
    flame.rotation.x = THREE.MathUtils.randFloatSpread(0.28)
    flame.userData.baseHeight = height
    flame.userData.phase = Math.random() * Math.PI * 2
    visual.add(flame)
    flames.push(flame)
  }

  const embers = []
  for (let index = 0; index < GAME.fieryRockEmberCount; index += 1) {
    const ember = new THREE.Mesh(
      new THREE.OctahedronGeometry(THREE.MathUtils.randFloat(0.035, 0.08), 0),
      new THREE.MeshBasicMaterial({ color: '#ffe19a', transparent: true, opacity: 0.9, depthWrite: false }),
    )
    ember.userData.angle = Math.random() * Math.PI * 2
    ember.userData.distance = THREE.MathUtils.randFloat(0.1, GAME.fieryRockFireRadius * 0.72)
    ember.userData.height = THREE.MathUtils.randFloat(0.2, 1.7)
    ember.userData.speed = THREE.MathUtils.randFloat(0.7, 1.5)
    ember.userData.phase = Math.random() * Math.PI * 2
    visual.add(ember)
    embers.push(ember)
  }

  const light = new THREE.PointLight(COLORS.fire, 5.5, GAME.fieryRockFireRadius * 3)
  light.position.set(position.x, 1.2, position.z)
  scene.add(visual, light)
  fireHazards.push({ visual, ground, flames, embers, light, position: position.clone(), age: savedFire?.age ?? 0 })
}

function createSplinterPiece(position, direction, age = 0) {
  const piece = new THREE.Mesh(
    new THREE.TetrahedronGeometry(0.32),
    new THREE.MeshStandardMaterial({ color: COLORS.splinter, emissive: COLORS.splinterEmissive, emissiveIntensity: 1.3, metalness: 0.4, roughness: 0.3 }),
  )
  piece.position.copy(position)
  scene.add(piece)
  splinterPieces.push({ piece, direction, age })
}

function createSplinterPieces(position) {
  const startAngle = Math.random() * Math.PI * 2
  for (let index = 0; index < GAME.splinterPieceCount; index += 1) {
    const angle = startAngle + index * (Math.PI * 2 / GAME.splinterPieceCount) + THREE.MathUtils.randFloatSpread(0.35)
    createSplinterPiece(new THREE.Vector3(position.x, 0.72, position.z), new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)))
  }
}

function clearObjects(objects) {
  for (const object of objects) scene.remove(object)
  objects.length = 0
}

function planarDistance(first, second) {
  return Math.hypot(first.x - second.x, first.z - second.z)
}

function createExplosion(position, radius) {
  const shockwave = new THREE.Mesh(
    new THREE.RingGeometry(0.18, 0.42, 64),
    new THREE.MeshBasicMaterial({ color: COLORS.banger, transparent: true, opacity: 1, side: THREE.DoubleSide, depthWrite: false }),
  )
  shockwave.rotation.x = -Math.PI / 2
  shockwave.position.set(position.x, 0.05, position.z)
  const blast = new THREE.Mesh(
    new THREE.SphereGeometry(1, 24, 16),
    new THREE.MeshBasicMaterial({ color: COLORS.banger, transparent: true, opacity: 0.65, wireframe: true, depthWrite: false }),
  )
  blast.position.set(position.x, 0.85, position.z)
  const light = new THREE.PointLight(COLORS.banger, 10, radius * 2)
  light.position.copy(blast.position)
  scene.add(shockwave, blast, light)
  explosions.push({ shockwave, blast, light, radius, age: 0 })
}

function createBangerPulse(position, radius, fuseProgress) {
  const pulse = new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.42, 48),
    new THREE.MeshBasicMaterial({ color: COLORS.banger, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }),
  )
  pulse.rotation.x = -Math.PI / 2
  pulse.position.set(position.x, 0.06, position.z)
  scene.add(pulse)
  bangerPulses.push({ pulse, radius, age: 0 })
  soundSystem.playBangerPulse(fuseProgress, position)
}

function triggerShockwave() {
  const radius = GAME.shockwaveBaseRadius * (1 + getResearchStatBonus('shockwaveSize'))
  const shockwave = new THREE.Mesh(
    new THREE.RingGeometry(0.2, 0.42, 64),
    new THREE.MeshBasicMaterial({ color: COLORS.slowAura, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false }),
  )
  shockwave.rotation.x = -Math.PI / 2
  shockwave.position.set(player.position.x, 0.07, player.position.z)
  scene.add(shockwave)
  shockwaves.push({ shockwave, origin: player.position.clone(), radius, age: 0, affected: new Set() })
}

function createPlayerDeathEffect(position) {
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.95, 24, 16),
    new THREE.MeshBasicMaterial({ color: '#fff4cf', transparent: true, opacity: 1, depthWrite: false }),
  )
  flash.position.copy(position)
  const blast = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.7, 2),
    new THREE.MeshBasicMaterial({ color: COLORS.playerRing, transparent: true, opacity: 0.95, wireframe: true, depthWrite: false }),
  )
  blast.position.copy(position)
  const shockwave = new THREE.Mesh(
    new THREE.RingGeometry(0.24, 0.5, 64),
    new THREE.MeshBasicMaterial({ color: COLORS.player, transparent: true, opacity: 1, side: THREE.DoubleSide, depthWrite: false }),
  )
  shockwave.rotation.x = -Math.PI / 2
  shockwave.position.set(position.x, 0.06, position.z)
  const innerShockwave = shockwave.clone()
  innerShockwave.material = shockwave.material.clone()
  const light = new THREE.PointLight('#fff4cf', 22, 18)
  light.position.copy(position)
  const fragments = Array.from({ length: 18 }, () => {
    const fragment = new THREE.Mesh(
      new THREE.TetrahedronGeometry(THREE.MathUtils.randFloat(0.08, 0.19), 0),
      new THREE.MeshBasicMaterial({ color: Math.random() > 0.45 ? COLORS.playerRing : COLORS.player, transparent: true, opacity: 1, depthWrite: false }),
    )
    fragment.position.copy(position)
    const direction = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.75 + 0.18, Math.random() - 0.5).normalize()
    fragment.userData.velocity = direction.multiplyScalar(THREE.MathUtils.randFloat(4, 10))
    scene.add(fragment)
    return fragment
  })
  scene.add(flash, blast, shockwave, innerShockwave, light)
  playerDeathEffects.push({ flash, blast, shockwave, innerShockwave, light, fragments, age: 0 })
}

function updatePlayerDeathEffects(delta) {
  for (let index = playerDeathEffects.length - 1; index >= 0; index -= 1) {
    const effect = playerDeathEffects[index]
    effect.age += delta
    const progress = Math.min(effect.age / GAME.playerDeathVfxDuration, 1)
    effect.flash.scale.setScalar(THREE.MathUtils.lerp(0.25, 3.8, progress))
    effect.flash.material.opacity = Math.max(0, 1 - progress * 3.5)
    effect.blast.scale.setScalar(THREE.MathUtils.lerp(0.2, 5.4, progress))
    effect.blast.rotation.y += delta * 12
    effect.blast.rotation.x += delta * 7
    effect.blast.material.opacity = 0.95 * (1 - progress)
    effect.shockwave.scale.setScalar(THREE.MathUtils.lerp(0.2, 15, progress))
    effect.shockwave.material.opacity = 1 - progress
    effect.innerShockwave.scale.setScalar(THREE.MathUtils.lerp(0.1, 8, progress))
    effect.innerShockwave.material.opacity = Math.max(0, 1 - progress * 1.8)
    effect.light.intensity = 22 * (1 - progress)
    for (const fragment of effect.fragments) {
      fragment.position.addScaledVector(fragment.userData.velocity, delta)
      fragment.userData.velocity.y -= delta * 7
      fragment.rotation.x += delta * 12
      fragment.rotation.z += delta * 9
      fragment.material.opacity = 1 - progress
    }
    if (progress === 1) {
      scene.remove(effect.flash, effect.blast, effect.shockwave, effect.innerShockwave, effect.light, ...effect.fragments)
      playerDeathEffects.splice(index, 1)
    }
  }
}

function detonateBanger(banger) {
  const position = banger.position.clone()
  const radius = getEffectiveEnemyRange('banger', OBSTACLE_TYPES.banger.range)
  const destructionChance = getResearchStatBonus('bangerEnemyDestroyChance')
  const playerInRange = planarDistance(player.position, position) <= radius

  for (let index = obstacles.length - 1; index >= 0; index -= 1) {
    const obstacle = obstacles[index]
    if (obstacle === banger || (planarDistance(obstacle.position, position) <= radius && Math.random() < destructionChance)) {
      scene.remove(obstacle, obstacle.userData.rangeIndicator, obstacle.userData.magnetPulse)
      obstacles.splice(index, 1)
    }
  }

  createExplosion(position, radius)
  if (playerInRange) endGame()
}

function resetGame(populateArena = true) {
  clearObjects(cells)
  clearObjects(chronoCells)
  clearObjects(boosters)
  for (const obstacle of obstacles) {
    scene.remove(obstacle, obstacle.userData.rangeIndicator, obstacle.userData.magnetPulse)
    clearPorterTeleportTarget(obstacle)
  }
  obstacles.length = 0
  for (const entry of spores) scene.remove(entry.spore)
  spores.length = 0
  for (const fallingObstacle of fallingObstacles) scene.remove(fallingObstacle.obstacle, fallingObstacle.shadow, fallingObstacle.targetRing)
  fallingObstacles.length = 0
  for (const fireHazard of fireHazards) scene.remove(fireHazard.visual, fireHazard.light)
  fireHazards.length = 0
  for (const splinterPiece of splinterPieces) scene.remove(splinterPiece.piece)
  splinterPieces.length = 0
  for (const explosion of explosions) scene.remove(explosion.shockwave, explosion.blast, explosion.light)
  explosions.length = 0
  for (const bangerPulse of bangerPulses) scene.remove(bangerPulse.pulse)
  bangerPulses.length = 0
  for (const shooterProjectile of shooterProjectiles) scene.remove(shooterProjectile.projectile)
  shooterProjectiles.length = 0
  for (const autocannonProjectile of autocannonProjectiles) scene.remove(autocannonProjectile.mesh)
  autocannonProjectiles.length = 0
  for (const shockwave of shockwaves) scene.remove(shockwave.shockwave)
  shockwaves.length = 0
  shockwavePushes.length = 0
  for (const deathEffect of playerDeathEffects) scene.remove(deathEffect.flash, deathEffect.blast, deathEffect.shockwave, deathEffect.innerShockwave, deathEffect.light, ...deathEffect.fragments)
  playerDeathEffects.length = 0
  for (const warning of obstacleSpawnWarnings) scene.remove(warning.ring, warning.glow, warning.beam)
  obstacleSpawnWarnings.length = 0
  player.position.set(0, GAME.playerStartHeight, 0)
  player.visible = true
  score = 0
  elapsed = 0
  spawnTimer = 0
  chronoCellTimer = 0
  obstacleSpawnTimer = 0
  hazardTimer = 0
  shockwaveTimer = 0
  shieldCharges = getResearchLevel('shield')
  shieldInvulnerability = 0
  boosterTimer = 0
  speedBoosterTime = 0
  thornShieldTime = 0
  freezerTime = 0
  shieldBubble.visible = shieldCharges > 0
  scoreElement.textContent = '000'
  timeElement.textContent = '00:00'
  if (populateArena) {
    for (let index = 0; index < GAME.initialCellCount + getResearchStatBonus('initialCellCount'); index += 1) addCell()
    for (const type of GAME.initialObstacleTypes) {
      if (getCurrentDifficulty().availableObstacleTypes.includes(type)) addObstacle(type)
    }
  }
}

function serializePosition(position) {
  return { x: position.x, y: position.y, z: position.z }
}

function saveCurrentRound() {
  savedRound = {
    tierIndex: selectedTierIndex,
    player: serializePosition(player.position),
    score,
    elapsed,
    spawnTimer,
    chronoCellTimer,
    obstacleSpawnTimer,
    hazardTimer,
    shockwaveTimer,
    shieldCharges,
    cells: cells.map((cell) => ({ position: serializePosition(cell.position), phase: cell.userData.phase, cashValue: cell.userData.cashValue })),
    chronoCells: chronoCells.map((cell) => ({ position: serializePosition(cell.position), phase: cell.userData.phase, age: cell.userData.age })),
    obstacles: obstacles.map((obstacle) => ({ position: serializePosition(obstacle.position), type: obstacle.userData.type, age: obstacle.userData.age, lifetimeAge: obstacle.userData.lifetimeAge, speed: obstacle.userData.speed, pulseTimer: obstacle.userData.pulseTimer, shotCooldown: obstacle.userData.shotCooldown })),
    shooterProjectiles: shooterProjectiles.map((projectile) => ({ position: serializePosition(projectile.projectile.position), direction: serializePosition(projectile.direction), age: projectile.age })),
    fallingObstacles: fallingObstacles.map((fallingObstacle) => ({ target: serializePosition(fallingObstacle.target), type: fallingObstacle.type, age: fallingObstacle.age, landed: fallingObstacle.landed, impactTriggered: fallingObstacle.impactTriggered })),
    warnings: obstacleSpawnWarnings.map((warning) => ({ position: serializePosition(warning.position), type: warning.type, age: warning.age })),
  }
  persistSavedRound(savedRound)
  updateStartButton()
}

function clearSavedRound() {
  savedRound = null
  persistSavedRound(null)
  updateStartButton()
}

function restoreSavedRound() {
  if (!savedRound) return false
  selectedTierIndex = Math.min(savedRound.tierIndex ?? 0, getUnlockedTierIndex())
  applyDifficulty()
  resetGame(false)
  player.position.set(savedRound.player.x, savedRound.player.y, savedRound.player.z)
  score = savedRound.score ?? 0
  elapsed = savedRound.elapsed ?? 0
  spawnTimer = savedRound.spawnTimer ?? 0
  chronoCellTimer = savedRound.chronoCellTimer ?? 0
  obstacleSpawnTimer = savedRound.obstacleSpawnTimer ?? 0
  hazardTimer = savedRound.hazardTimer ?? 0
  shockwaveTimer = savedRound.shockwaveTimer ?? 0
  shieldCharges = savedRound.shieldCharges ?? getResearchLevel('shield')
  shieldBubble.visible = shieldCharges > 0
  for (const cell of savedRound.cells ?? []) addCell(cell)
  for (const chronoCell of savedRound.chronoCells ?? []) addChronoCell(chronoCell)
  for (const obstacle of savedRound.obstacles ?? []) createObstacle(new THREE.Vector3(obstacle.position.x, obstacle.position.y, obstacle.position.z), obstacle.type, obstacle)
  for (const savedProjectile of savedRound.shooterProjectiles ?? []) {
    const projectile = new THREE.Mesh(
      shooterProjectileGeometry,
      new THREE.MeshStandardMaterial({ color: COLORS.shooter, emissive: COLORS.shooterEmissive, emissiveIntensity: 2.6, metalness: 0.25, roughness: 0.2 }),
    )
    projectile.position.set(savedProjectile.position.x, savedProjectile.position.y, savedProjectile.position.z)
    scene.add(projectile)
    shooterProjectiles.push({ projectile, direction: new THREE.Vector3(savedProjectile.direction.x, savedProjectile.direction.y, savedProjectile.direction.z), age: savedProjectile.age ?? 0 })
  }
  for (const fallingObstacle of savedRound.fallingObstacles ?? []) createFallingObstacle(new THREE.Vector3(fallingObstacle.target.x, fallingObstacle.target.y, fallingObstacle.target.z), fallingObstacle)
  for (const warning of savedRound.warnings ?? []) scheduleObstacle({ ...warning, position: new THREE.Vector3(warning.position.x, warning.position.y, warning.position.z) })
  updateHud()
  return true
}

function updateStartButton() {
  startButton.textContent = savedRound ? 'CONTINUE' : 'START RUN'
}

function returnToMainMenu() {
  saveCurrentRound()
  paused = false
  started = false
  pauseMenu.classList.add('hidden')
  overlayTitle.textContent = 'ASTEROID BELT'
  overlayCopy.textContent = 'Round saved. Continue when you are ready.'
  gameOverTip.hidden = true
  menuContent.classList.remove('hidden')
  labPanel.classList.add('hidden')
  overlay.classList.remove('hidden')
}

function triggerShieldBreakExplosion() {
  const radiusBonus = getResearchStatBonus('shieldBreakExplosionRadius')
  if (radiusBonus <= 0) return
  const radius = 3 + radiusBonus
  const position = player.position.clone()
  createExplosion(position, radius)
  for (let index = obstacles.length - 1; index >= 0; index -= 1) {
    const obstacle = obstacles[index]
    if (planarDistance(obstacle.position, position) > radius) continue
    scene.remove(obstacle, obstacle.userData.rangeIndicator, obstacle.userData.magnetPulse)
    clearPorterTeleportTarget(obstacle)
    obstacles.splice(index, 1)
  }
}

function endGame() {
  if (!started || ended) return
  if (shieldInvulnerability > 0) return
  if (shieldCharges > 0) {
    shieldCharges -= 1
    shieldInvulnerability = GAME.shieldInvulnerabilityDuration + getResearchStatBonus('shieldInvulnerabilityDuration')
    triggerShieldBreakExplosion()
    shieldBubble.visible = shieldCharges > 0
    shieldBubble.scale.setScalar(1.7)
    return
  }
  started = false
  ended = true
  paused = false
  shieldBubble.visible = false
  createPlayerDeathEffect(player.position)
  player.visible = false
  pauseMenu.classList.add('hidden')
  clearSavedRound()
  recordTierHighScore()
  overlayTitle.textContent = 'SIGNAL LOST'
  overlayCopy.textContent = `You secured ${score} energy ${score === 1 ? 'cell' : 'cells'}.`
  gameOverTip.textContent = `TIP · ${getGameOverTip()}`
  gameOverTip.hidden = false
  startButton.textContent = 'RUN AGAIN'
  overlay.classList.remove('hidden')
}

function updateHud() {
  scoreElement.textContent = String(score).padStart(3, '0')
  const minutes = Math.floor(elapsed / 60)
  const seconds = Math.floor(elapsed % 60)
  timeElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  hudTierElement.textContent = `TIER ${selectedTierIndex + 1}`
  shieldIndicators.innerHTML = Array.from({ length: shieldCharges }, () => '<i aria-hidden="true"></i>').join('')
  shieldIndicators.hidden = shieldCharges === 0
}

function updateGame(delta, total) {
  const difficulty = getCurrentDifficulty()
  const tierPressure = THREE.MathUtils.lerp(0.16, 0.03, selectedTierIndex / Math.max(tierKeys.length - 1, 1))
  const regularObstacleLifetime = (GAME.regularObstacleLifetime + difficulty.obstacleLifetimeOffset
    + score * (GAME.regularObstacleLifetimeIncreasePerCell + difficulty.obstacleLifetimeIncreasePerCellOffset)
  ) * Math.max(0.5, 1 - getResearchStatBonus('regularLifetimeDebuff'))
  const obstacleSpawnInterval = Math.max(
    GAME.obstacleSpawnWarningDuration,
    (GAME.obstacleSpawnInterval + difficulty.obstacleSpawnIntervalOffset
      - score * (GAME.obstacleSpawnDecreasePerCell + difficulty.obstacleSpawnDecreasePerCellOffset)) * (1 - tierPressure),
  )
  const obstacleSpawnCount = Math.max(
    1,
    Math.floor(
      (GAME.obstacleSpawnCount
      + difficulty.obstacleSpawnCountOffset
      + score * difficulty.obstacleSpawnCountIncreasePerCell) * GAME.difficultyPressureMultiplier,
    ),
  )
  const direction = new THREE.Vector3(
    (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + joystickInput.x,
    0,
    (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) + joystickInput.y,
  )

  if (direction.lengthSq() > 0) {
    direction.normalize()
    player.position.addScaledVector(direction, GAME.playerSpeed * (1 + getResearchStatBonus('playerSpeedMultiplier')) * (speedBoosterTime > 0 ? 2 : 1) * delta)
    player.rotation.y = Math.atan2(direction.x, direction.z)
  }

  keepInsideArena(player.position)
  player.rotation.y += delta * ANIMATION.playerTurnSpeed
  playerCore.rotation.x += delta * ANIMATION.playerCoreSpinSpeed
  playerRing.rotation.z += delta * ANIMATION.playerRingSpinSpeed
  const slowAuraUnlocked = getResearchLevel('unlock-slow-aura') > 0
  const effectRangeMultiplier = 1 + getResearchStatBonus('effectRange')
  const slowAuraRange = GAME.slowAuraBaseRange * effectRangeMultiplier
  const slowAuraEffect = THREE.MathUtils.clamp(GAME.slowAuraBaseEffect + getResearchStatBonus('slowAuraEffect'), 0, 0.9)
  slowAuraRing.visible = slowAuraUnlocked
  if (slowAuraUnlocked) {
    slowAuraRing.scale.setScalar(slowAuraRange)
    slowAuraRing.material.opacity = 0.22 + Math.sin(total * 3.5) * 0.08
    slowAuraRing.rotation.z += delta * 0.35
  }
  if (shieldInvulnerability > 0) shieldInvulnerability = Math.max(0, shieldInvulnerability - delta)
  speedBoosterTime = Math.max(0, speedBoosterTime - delta)
  thornShieldTime = Math.max(0, thornShieldTime - delta)
  freezerTime = Math.max(0, freezerTime - delta)
  playerCore.material.emissiveIntensity = thornShieldTime > 0 ? 3.2 : 1.4
  if (shieldCharges > 0 || shieldInvulnerability > 0 || thornShieldTime > 0) {
    shieldBubble.visible = true
    shieldBubble.scale.setScalar(1 + Math.sin(total * 12) * 0.08 + (shieldInvulnerability > 0 ? 0.2 : 0))
    shieldBubble.material.color.set(thornShieldTime > 0 ? '#ff795f' : COLORS.slowAura)
    shieldBubble.material.opacity = thornShieldTime > 0 || shieldInvulnerability > 0 ? 0.65 : 0.18
  } else shieldBubble.visible = false

  if (getResearchLevel('unlock-shockwave') > 0) {
    shockwaveTimer += delta
    const interval = GAME.shockwaveBaseInterval / (1 + getResearchStatBonus('shockwaveFrequency'))
    if (shockwaveTimer >= interval) {
      triggerShockwave()
      shockwaveTimer = 0
    }
  }
  updateBuildings(delta, total)

  for (let index = cells.length - 1; index >= 0; index -= 1) {
    const cell = cells[index]
    cell.rotation.y += delta * ANIMATION.cellSpinSpeed
    cell.position.y = ANIMATION.cellBobBaseHeight + Math.sin(total * ANIMATION.cellBobSpeed + cell.userData.phase) * ANIMATION.cellBobAmplitude
    const cellMagnetSpeed = getResearchStatBonus('cellMagnetSpeed')
    const cellOffset = player.position.clone().sub(cell.position)
    cellOffset.y = 0
    if (cellMagnetSpeed > 0 && cellOffset.length() <= GAME.cellMagnetRange * effectRangeMultiplier) {
      cell.position.addScaledVector(cellOffset.normalize(), (GAME.cellMagnetBaseSpeed + cellMagnetSpeed) * delta)
    }
    if (cell.position.distanceTo(player.position) < GAME.cellPickupRadius) {
      soundSystem.playCellCollect(cell.position)
      scene.remove(cell)
      cells.splice(index, 1)
      score += 1
      updateBankedCells(1)
      updateCash(cell.userData.cashValue)
      showCashIndicator(cell.position, cell.userData.cashValue)
    }
  }

  for (let index = boosters.length - 1; index >= 0; index -= 1) {
    const booster = boosters[index]
    booster.rotation.y += delta * 3
    booster.position.y = GAME.playerStartHeight + Math.sin(total * 4 + index) * 0.16
    if (booster.position.distanceTo(player.position) < GAME.cellPickupRadius) {
      activateBooster(booster.userData.type, booster.position)
      scene.remove(booster)
      boosters.splice(index, 1)
    }
  }

  for (let index = chronoCells.length - 1; index >= 0; index -= 1) {
    const chronoCell = chronoCells[index]
    chronoCell.userData.age += delta
    const chronoLifetime = GAME.chronoCellLifetime * (1 + getResearchStatBonus('chronoLifetimeMultiplier'))
    const lifeProgress = chronoCell.userData.age / chronoLifetime
    chronoCell.rotation.x += delta * ANIMATION.chronoCellSpinSpeed
    chronoCell.rotation.y += delta * ANIMATION.chronoCellSpinSpeed * 0.7
    chronoCell.position.y = ANIMATION.cellBobBaseHeight + Math.sin(total * ANIMATION.chronoCellBobSpeed + chronoCell.userData.phase) * ANIMATION.chronoCellBobAmplitude
    chronoCell.material.emissiveIntensity = ENTITIES.chronoCellEmissiveIntensity + Math.sin(total * 8) * 0.8
    chronoCell.material.opacity = lifeProgress > 0.7 ? 1 - (lifeProgress - 0.7) / 0.3 : 1
    if (chronoCell.position.distanceTo(player.position) < GAME.cellPickupRadius) {
      soundSystem.playCellCollect(chronoCell.position)
      updateChronoshards(GAME.chronoCellChronoshardValue)
      showCurrencyIndicator(chronoCell.position, `+✦${GAME.chronoCellChronoshardValue}`, 'chronoshard-indicator')
      scene.remove(chronoCell)
      chronoCells.splice(index, 1)
      continue
    }
    if (lifeProgress >= 1) {
      scene.remove(chronoCell)
      chronoCells.splice(index, 1)
    }
  }

  const bangersToDetonate = []
  const sporesToDetonate = []
  for (let index = obstacles.length - 1; index >= 0; index -= 1) {
    const obstacle = obstacles[index]
    const obstacleType = OBSTACLE_TYPES[obstacle.userData.type]
    const effectiveRange = getEffectiveEnemyRange(obstacle.userData.type, obstacleType.range)
    obstacle.userData.lifetimeAge += delta
    if (obstacle.userData.lifetimeAge > regularObstacleLifetime) {
      scene.remove(obstacle, obstacle.userData.rangeIndicator, obstacle.userData.magnetPulse)
      clearPorterTeleportTarget(obstacle)
      obstacles.splice(index, 1)
      continue
    }
    const remainingLifetime = regularObstacleLifetime - obstacle.userData.lifetimeAge
    if (remainingLifetime <= GAME.obstacleDespawnWarningDuration) {
      const warningProgress = 1 - remainingLifetime / GAME.obstacleDespawnWarningDuration
      const blinkFrequency = THREE.MathUtils.lerp(
        GAME.obstacleDespawnWarningStartFrequency,
        GAME.obstacleDespawnWarningEndFrequency,
        warningProgress,
      )
      obstacle.visible = Math.sin(obstacle.userData.lifetimeAge * blinkFrequency * Math.PI * 2) > -0.1
    } else {
      obstacle.visible = true
    }
    const playerOffset = player.position.clone().sub(obstacle.position)
    playerOffset.y = 0
    if (obstacle.userData.type === 'creeper') {
      obstacle.userData.staticCollisionSlow = Math.max(0, (obstacle.userData.staticCollisionSlow ?? 0) - delta)
    }
    const chronoSlow = buildingState.placed.filter((b) => b.type === 'chronoGenerator' && planarDistance(obstacle.position, b) <= buildingValue(b, 'range')).reduce((slow, b) => Math.max(slow, buildingValue(b, 'slow')), 0)
    const inGapFog = buildingState.placed.some((b) => b.type === 'gapGenerator' && buildingRuntime.get(b.id)?.active > 0 && planarDistance(obstacle.position, b) <= buildingValue(b, 'range'))
    if (thornShieldTime > 0 && playerOffset.length() < GAME.playerRadius) {
      scene.remove(obstacle, obstacle.userData.rangeIndicator, obstacle.userData.magnetPulse)
      clearPorterTeleportTarget(obstacle)
      obstacles.splice(index, 1)
      continue
    }
    if (freezerTime > 0) continue
    const obstacleSpeedMultiplier = (slowAuraUnlocked && playerOffset.length() <= slowAuraRange ? 1 - slowAuraEffect : 1) * (1 - chronoSlow)
    const pushbackSpeed = getResearchStatBonus('pushbackSpeed')
    if (pushbackSpeed > 0 && obstacleType.speed === 0 && playerOffset.length() <= GAME.pushbackBaseRange * effectRangeMultiplier) {
      const pushDirection = obstacle.position.clone().sub(player.position)
      pushDirection.y = 0
      if (pushDirection.lengthSq() > 0) obstacle.position.addScaledVector(pushDirection.normalize(), (GAME.pushbackBaseSpeed + pushbackSpeed) * delta)
    }
    if (!inGapFog && playerOffset.length() <= effectiveRange && obstacleType.speed > 0) {
      const speedMultiplier = obstacle.userData.type === 'creeper' ? Math.max(0.5, 1 - getResearchStatBonus('creeperSpeedDebuff')) : 1
      const creeperLifetimeProgress = obstacle.userData.type === 'creeper' ? Math.min(obstacle.userData.lifetimeAge / regularObstacleLifetime, 1) : 0
      const movementSpeed = obstacle.userData.type === 'creeper'
        ? THREE.MathUtils.lerp(obstacleType.speed, GAME.playerSpeed * 0.9, creeperLifetimeProgress)
        : obstacleType.speed
      const staticCollisionSpeedMultiplier = obstacle.userData.type === 'creeper' && obstacle.userData.staticCollisionSlow > 0
        ? GAME.creeperStaticCollisionSpeedMultiplier
        : 1
      obstacle.position.addScaledVector(playerOffset.normalize(), movementSpeed * speedMultiplier * obstacleSpeedMultiplier * staticCollisionSpeedMultiplier * delta)
    }
    if (obstacle.userData.rangeIndicator) {
      const rangeIndicator = obstacle.userData.rangeIndicator
      const isPlayerInRange = playerOffset.length() <= effectiveRange
      const pulse = 1 + Math.sin(total * ANIMATION.chaserRangeIndicatorPulseSpeed) * ANIMATION.chaserRangeIndicatorPulseAmount
      rangeIndicator.position.set(obstacle.position.x, 0.025, obstacle.position.z)
      rangeIndicator.scale.setScalar(isPlayerInRange ? pulse : 1)
      rangeIndicator.material.opacity = isPlayerInRange
        ? ANIMATION.chaserRangeIndicatorActiveOpacity
        : ANIMATION.chaserRangeIndicatorBaseOpacity
    }
    if (obstacle.userData.magnetPulse) {
      const magnetPulse = obstacle.userData.magnetPulse
      const pulseProgress = (total * 0.85 + obstacle.userData.magnetPulsePhase) % 1
      magnetPulse.position.set(obstacle.position.x, 0.035, obstacle.position.z)
      magnetPulse.scale.setScalar(effectiveRange * (1.1 - pulseProgress * 0.9))
      magnetPulse.material.opacity = 0.5 * (1 - pulseProgress)
    }
    obstacle.rotation.y += delta * obstacle.userData.speed * obstacleSpeedMultiplier
    obstacle.position.y = ANIMATION.obstacleBobBaseHeight + Math.sin(total * ANIMATION.obstacleBobSpeed + obstacle.position.x) * ANIMATION.obstacleBobAmplitude
    if (obstacle.userData.type === 'banger') {
      obstacle.userData.age += delta * obstacleSpeedMultiplier
      const fuseProgress = Math.min(obstacle.userData.age / ENTITIES.bangerFuseDuration, 1)
      const fusePulse = (Math.sin(obstacle.userData.age * ANIMATION.bangerFusePulseSpeed) + 1) / 2
      obstacle.userData.material.emissiveIntensity = ANIMATION.bangerFuseEmissiveBaseIntensity + fusePulse * ANIMATION.bangerFuseEmissivePulseAmount
      obstacle.userData.pulseTimer = (obstacle.userData.pulseTimer ?? 0) + delta * obstacleSpeedMultiplier
      const pulseInterval = THREE.MathUtils.lerp(GAME.bangerPulseStartInterval, GAME.bangerPulseEndInterval, fuseProgress)
      if (obstacle.userData.pulseTimer >= pulseInterval) {
        createBangerPulse(obstacle.position, effectiveRange, fuseProgress)
        obstacle.userData.pulseTimer = 0
      }
      if (obstacle.userData.age >= ENTITIES.bangerFuseDuration) bangersToDetonate.push(obstacle)
      continue
    }
    if (obstacle.userData.type === 'shooter') {
      obstacle.userData.shotCooldown = Math.max(0, obstacle.userData.shotCooldown - delta)
      if (playerOffset.length() <= effectiveRange && obstacle.userData.shotCooldown === 0) {
        createShooterProjectile(obstacle)
        obstacle.userData.shotCooldown = ENTITIES.shooterProjectileCooldown
      }
    }
    if (obstacle.userData.type === 'magnet' && playerOffset.length() <= effectiveRange) {
      const pullDirection = obstacle.position.clone().sub(player.position)
      pullDirection.y = 0
      if (pullDirection.lengthSq() > 0) player.position.addScaledVector(pullDirection.normalize(), ENTITIES.magnetPullSpeed * Math.max(0.5, 1 - getResearchStatBonus('magnetStrengthDebuff')) * delta)
    }
    if (obstacle.userData.type === 'porter') {
      obstacle.userData.teleportTimer += delta
      const porterInterval = ENTITIES.porterTeleportInterval * (1 + getResearchStatBonus('porterIntervalBonus'))
      const warningStart = porterInterval - ENTITIES.porterWarningDuration
      if (obstacle.userData.teleportTimer >= warningStart && !obstacle.userData.teleportTarget) {
        obstacle.userData.teleportTarget = randomPositionNearPlayer()
        showPorterTeleportTarget(obstacle)
      }
      if (obstacle.userData.teleportTarget) {
        const flash = (Math.sin(total * 22) + 1) / 2
        obstacle.userData.material.emissiveIntensity = 0.8 + flash * 3
        obstacle.userData.teleportEffect.ring.scale.setScalar(1 + flash * 0.35)
        obstacle.userData.teleportEffect.ring.material.opacity = 0.45 + flash * 0.5
        obstacle.userData.teleportEffect.beam.material.opacity = 0.14 + flash * 0.3
      }
      if (obstacle.userData.teleportTimer >= porterInterval) {
        obstacle.position.copy(obstacle.userData.teleportTarget)
        clearPorterTeleportTarget(obstacle)
        obstacle.userData.teleportTarget = null
        obstacle.userData.teleportTimer = 0
        obstacle.userData.material.emissiveIntensity = 1
      }
    }
    if (obstacle.userData.type === 'spore') {
      obstacle.userData.age += delta
      obstacle.userData.material.emissiveIntensity = 1 + (Math.sin(obstacle.userData.age * 10) + 1) * 1.3
      if (obstacle.userData.age >= ENTITIES.sporeFuseDuration) sporesToDetonate.push(obstacle)
    }
    if (obstacle.position.distanceTo(player.position) < GAME.playerRadius) endGame()
  }

  resolveObstacleCollisions()

  for (const banger of bangersToDetonate) {
    if (obstacles.includes(banger)) detonateBanger(banger)
  }
  for (const sporeEnemy of sporesToDetonate) {
    if (obstacles.includes(sporeEnemy)) detonateSpore(sporeEnemy)
  }

  for (let index = spores.length - 1; index >= 0; index -= 1) {
    const entry = spores[index]
    entry.spore.position.addScaledVector(entry.direction, ENTITIES.sporeSpeed * Math.max(0.5, 1 - getResearchStatBonus('sporeSpeedDebuff')) * delta)
    entry.spore.rotation.x += delta * 7
    entry.spore.rotation.z += delta * 5
    if (Math.hypot(entry.spore.position.x, entry.spore.position.z) > getArenaLimit()) {
      scene.remove(entry.spore)
      spores.splice(index, 1)
    }
  }

  for (let index = shooterProjectiles.length - 1; index >= 0; index -= 1) {
    const shooterProjectile = shooterProjectiles[index]
    shooterProjectile.age += delta
    shooterProjectile.projectile.position.addScaledVector(shooterProjectile.direction, ENTITIES.shooterProjectileSpeed * Math.max(0.5, 1 - getResearchStatBonus('shooterProjectileSpeedDebuff')) * delta)
    shooterProjectile.projectile.rotation.x += delta * 9
    shooterProjectile.projectile.rotation.y += delta * 12
    if (shooterProjectile.projectile.position.distanceTo(player.position) < GAME.playerRadius + ENTITIES.shooterProjectileRadius) {
      scene.remove(shooterProjectile.projectile)
      shooterProjectiles.splice(index, 1)
      endGame()
      continue
    }
    if (shooterProjectile.age >= ENTITIES.shooterProjectileLifetime) {
      scene.remove(shooterProjectile.projectile)
      shooterProjectiles.splice(index, 1)
    }
  }

  for (let index = explosions.length - 1; index >= 0; index -= 1) {
    const explosion = explosions[index]
    explosion.age += delta
    const progress = Math.min(explosion.age / GAME.bangerExplosionVfxDuration, 1)
    explosion.shockwave.scale.setScalar(THREE.MathUtils.lerp(0.3, explosion.radius / 0.42, progress))
    explosion.shockwave.material.opacity = 1 - progress
    explosion.blast.scale.setScalar(THREE.MathUtils.lerp(0.2, explosion.radius, progress))
    explosion.blast.material.opacity = 0.65 * (1 - progress)
    explosion.light.intensity = 10 * (1 - progress)
    if (progress === 1) {
      scene.remove(explosion.shockwave, explosion.blast, explosion.light)
      explosions.splice(index, 1)
    }
  }

  for (let index = bangerPulses.length - 1; index >= 0; index -= 1) {
    const bangerPulse = bangerPulses[index]
    bangerPulse.age += delta
    const progress = Math.min(bangerPulse.age / GAME.bangerPulseVfxDuration, 1)
    bangerPulse.pulse.scale.setScalar(THREE.MathUtils.lerp(0.2, bangerPulse.radius / 0.42, progress))
    bangerPulse.pulse.material.opacity = 0.9 * (1 - progress)
    if (progress === 1) {
      scene.remove(bangerPulse.pulse)
      bangerPulses.splice(index, 1)
    }
  }

  for (let index = shockwaves.length - 1; index >= 0; index -= 1) {
    const wave = shockwaves[index]
    wave.age += delta
    const progress = Math.min(wave.age / GAME.shockwaveVfxDuration, 1)
    wave.shockwave.scale.setScalar(THREE.MathUtils.lerp(0.25, wave.radius / 0.42, progress))
    wave.shockwave.material.opacity = 0.95 * (1 - progress)
    const waveRadius = wave.radius * progress
    for (const obstacle of obstacles) {
      if (wave.affected.has(obstacle)) continue
      const direction = obstacle.position.clone().sub(wave.origin)
      direction.y = 0
      const distance = direction.length()
      if (distance > waveRadius) continue
      wave.affected.add(obstacle)
      if (distance < 0.01) direction.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize()
      else direction.normalize()
      shockwavePushes.push({ obstacle, direction, distance: GAME.shockwavePushDistance * (1 - distance / wave.radius), remaining: 0.28 })
    }
    if (progress === 1) {
      scene.remove(wave.shockwave)
      shockwaves.splice(index, 1)
    }
  }

  for (let index = shockwavePushes.length - 1; index >= 0; index -= 1) {
    const push = shockwavePushes[index]
    if (!obstacles.includes(push.obstacle)) {
      shockwavePushes.splice(index, 1)
      continue
    }
    const step = Math.min(delta / push.remaining, 1)
    push.obstacle.position.addScaledVector(push.direction, push.distance * step)
    keepInsideArena(push.obstacle.position)
    push.distance *= 1 - step
    push.remaining -= delta
    if (push.remaining <= 0) shockwavePushes.splice(index, 1)
  }

  for (let index = fallingObstacles.length - 1; index >= 0; index -= 1) {
    const fallingObstacle = fallingObstacles[index]
    fallingObstacle.age += delta
    const progress = Math.min(fallingObstacle.age / GAME.fallingBlockDuration, 1)
    const fallProgress = 1 - (1 - progress) ** 3
    fallingObstacle.obstacle.position.y = THREE.MathUtils.lerp(GAME.fallingBlockStartHeight, GAME.fallingBlockGroundHeight, fallProgress)
    fallingObstacle.obstacle.rotation.x += delta * ANIMATION.fallingObstacleSpinXSpeed
    fallingObstacle.obstacle.rotation.z += delta * ANIMATION.fallingObstacleSpinZSpeed
    fallingObstacle.shadow.scale.setScalar(ANIMATION.targetShadowBaseScale + progress * ANIMATION.targetShadowScaleGrowth)
    fallingObstacle.shadow.material.opacity = ANIMATION.targetShadowBaseOpacity + progress * ANIMATION.targetShadowOpacityGrowth
    const ringPulse = 1 + Math.sin(fallingObstacle.age * ANIMATION.targetRingPulseSpeed) * ANIMATION.targetRingPulseAmount
    fallingObstacle.targetRing.scale.setScalar((ANIMATION.targetRingBaseScale + progress * ANIMATION.targetRingScaleGrowth) * ringPulse)
    fallingObstacle.targetRing.material.opacity = ANIMATION.targetRingBaseOpacity - progress * ANIMATION.targetRingOpacityFade

    const horizontalDistance = player.position.distanceTo(fallingObstacle.target)
    if (!fallingObstacle.landed && progress > 0.82 && horizontalDistance < GAME.playerRadius) endGame()

    if (progress === 1) {
      fallingObstacle.landed = true
      if (!fallingObstacle.impactTriggered) {
        fallingObstacle.impactTriggered = true
        if (fallingObstacle.type === 'fieryRock') createFireHazard(fallingObstacle.target)
        if (fallingObstacle.type === 'splinter') createSplinterPieces(fallingObstacle.target)
      }
      fallingObstacle.obstacle.position.y = GAME.fallingBlockGroundHeight
      fallingObstacle.shadow.material.opacity = Math.max(0, 0.88 - (fallingObstacle.age - GAME.fallingBlockDuration) * 1.8)
      fallingObstacle.targetRing.material.opacity = Math.max(0, 0.55 - (fallingObstacle.age - GAME.fallingBlockDuration) * 1.5)
      if (fallingObstacle.age > GAME.fallingBlockLifetime) {
        scene.remove(fallingObstacle.obstacle, fallingObstacle.shadow, fallingObstacle.targetRing)
        fallingObstacles.splice(index, 1)
      }
    }
  }

  for (let index = fireHazards.length - 1; index >= 0; index -= 1) {
    const fireHazard = fireHazards[index]
    fireHazard.age += delta
    const progress = fireHazard.age / GAME.fieryRockFireDuration
    const pulse = 1 + Math.sin(fireHazard.age * 9) * 0.1
    const fade = Math.max(0, 1 - progress)
    fireHazard.ground.scale.setScalar(pulse * (0.9 + progress * 0.2))
    fireHazard.ground.material.opacity = 0.34 * fade
    fireHazard.visual.rotation.y += delta * 0.5
    for (const flame of fireHazard.flames) {
      const flicker = 0.82 + Math.sin(fireHazard.age * 12 + flame.userData.phase) * 0.18
      flame.scale.y = flicker * fade
      flame.material.opacity = 0.86 * fade
    }
    for (const ember of fireHazard.embers) {
      const emberAge = (fireHazard.age * ember.userData.speed + ember.userData.phase) % 1
      const distance = ember.userData.distance * (0.55 + emberAge * 0.7)
      ember.position.set(Math.cos(ember.userData.angle + fireHazard.age) * distance, emberAge * ember.userData.height + 0.16, Math.sin(ember.userData.angle + fireHazard.age) * distance)
      ember.material.opacity = 0.85 * fade * (1 - emberAge)
      ember.scale.setScalar(0.6 + (1 - emberAge) * 0.7)
    }
    fireHazard.light.intensity = Math.max(0, (5.5 + Math.sin(fireHazard.age * 14)) * fade)
    if (planarDistance(player.position, fireHazard.position) < GAME.fieryRockFireRadius) endGame()
    if (progress >= 1) {
      scene.remove(fireHazard.visual, fireHazard.light)
      fireHazards.splice(index, 1)
    }
  }

  for (let index = splinterPieces.length - 1; index >= 0; index -= 1) {
    const splinterPiece = splinterPieces[index]
    splinterPiece.age += delta
    const speed = GAME.splinterPieceDistance / GAME.splinterPieceDuration
    splinterPiece.piece.position.addScaledVector(splinterPiece.direction, speed * delta)
    splinterPiece.piece.rotation.x += delta * 8
    splinterPiece.piece.rotation.z += delta * 6
    if (splinterPiece.piece.position.distanceTo(player.position) < GAME.playerRadius * 0.7) endGame()
    if (splinterPiece.age >= GAME.splinterPieceDuration) {
      scene.remove(splinterPiece.piece)
      splinterPieces.splice(index, 1)
    }
  }

  for (let index = obstacleSpawnWarnings.length - 1; index >= 0; index -= 1) {
    const warning = obstacleSpawnWarnings[index]
    warning.age += delta
    const progress = warning.age / GAME.obstacleSpawnWarningDuration
    const pulse = 1 + Math.sin(warning.age * ANIMATION.spawnRingPulseSpeed) * ANIMATION.spawnRingPulseAmount
    warning.ring.scale.setScalar((ANIMATION.spawnRingBaseScale + progress * ANIMATION.spawnRingScaleGrowth) * pulse)
    warning.ring.material.opacity = ANIMATION.spawnRingBaseOpacity * (1 - progress)
    warning.ring.rotation.z -= delta * 2
    const glowPulse = 1 + Math.sin(warning.age * ANIMATION.spawnRingPulseSpeed * 0.55) * ANIMATION.spawnCueGlowPulseAmount
    warning.glow.scale.setScalar(glowPulse * (0.85 + progress * 0.25))
    warning.glow.material.opacity = ANIMATION.spawnCueGlowBaseOpacity * (1 - progress * 0.3)
    warning.beam.scale.set(0.8 + progress * 0.2, 1, 0.8 + progress * 0.2)
    warning.beam.material.opacity = ANIMATION.spawnCueBeamBaseOpacity * (1 - progress * 0.45)
    warning.beam.rotation.y += delta * 1.6

    if (progress >= 1) {
      createObstacle(warning.position, warning.type)
      scene.remove(warning.ring, warning.glow, warning.beam)
      obstacleSpawnWarnings.splice(index, 1)
    }
  }

  spawnTimer += delta
  boosterTimer += delta
  chronoCellTimer += delta
  obstacleSpawnTimer += delta
  hazardTimer += delta
  const cellSpawnRateBonus = getResearchStatBonus('cellSpawnRate') + score * getResearchStatBonus('cellSpawnRatePerCell')
  if (spawnTimer > GAME.cellSpawnInterval / (1 + cellSpawnRateBonus)) {
    addCell()
    spawnTimer = 0
  }
  if (boosterTimer > GAME.boosterSpawnInterval) {
    const availableBoosters = [
      getResearchLevel('unlock-speed-booster') > 0 && 'speed',
      getResearchLevel('thorn-shield') > 0 && 'thorn',
      getResearchLevel('freezer') > 0 && 'freezer',
    ].filter(Boolean)
    if (availableBoosters.length) addBooster(availableBoosters[Math.floor(Math.random() * availableBoosters.length)])
    boosterTimer = 0
  }
  if (chronoCellTimer > GAME.chronoCellSpawnInterval / (1 + getResearchStatBonus('chronoSpawnRate'))) {
    addChronoCell()
    chronoCellTimer = 0
  }
  if (obstacleSpawnTimer > obstacleSpawnInterval) {
    for (let index = 0; index < obstacleSpawnCount; index += 1) scheduleObstacle()
    obstacleSpawnTimer = 0
  }
  const fallingRockSpawnInterval = Math.max(
    GAME.fallingBlockMinInterval,
    (GAME.fallingBlockBaseInterval + difficulty.fallingRockSpawnIntervalOffset
      - score * (GAME.fallingBlockIntervalPerCell + difficulty.fallingRockSpawnDecreasePerCellOffset)) * (1 - tierPressure),
  )
  if (hazardTimer > fallingRockSpawnInterval) {
    scheduleFallingObstacles()
    hazardTimer = 0
  }

  elapsed += delta
  updateHud()
}

function animate() {
  requestAnimationFrame(animate)
  timer.update()
  const delta = Math.min(timer.getDelta(), 0.05)
  const total = timer.getElapsed()
  if (started && !paused) updateGame(delta, total)
  updatePlayerDeathEffects(delta)
  camera.position.set(player.position.x, CAMERA.height, player.position.z + getCameraDistance())
  camera.lookAt(player.position.x, 0, player.position.z)
  starfield.position.copy(camera.position)
  if (buildingPreview) {
    const viewDirection = new THREE.Vector3()
    camera.getWorldDirection(viewDirection)
    buildingPreview.position.copy(camera.position).addScaledVector(viewDirection, 10)
    buildingPreview.position.y = 2.9
    buildingPreview.rotation.y += delta * 1.4
  }
  renderer.render(scene, camera)
}

startButton.addEventListener('click', async () => {
  await soundSystem.initialize()
  soundSystem.playButtonClick()
  if (savedRound) restoreSavedRound()
  else resetGame()
  started = true
  ended = false
  paused = false
  labPanel.classList.add('hidden')
  menuContent.classList.remove('hidden')
  overlay.classList.add('hidden')
})

openLabButton.addEventListener('click', (event) => {
  event.stopPropagation()
  if (!featureUnlocks.researchLab && !unlockFeature('researchLab')) return
  menuContent.classList.add('hidden')
  labPanel.classList.remove('hidden')
  setLabMessage()
  renderResearchLab()
})

closeLabButton.addEventListener('click', () => {
  labPanel.classList.add('hidden')
  menuContent.classList.remove('hidden')
})
overlay.addEventListener('click', (event) => {
  if (labPanel.classList.contains('hidden') || labPanel.contains(event.target)) return
  labPanel.classList.add('hidden')
  menuContent.classList.remove('hidden')
})
openBuildingButton.addEventListener('click', () => { if (!featureUnlocks.buildingSystem && !unlockFeature('buildingSystem')) return; menuContent.classList.add('hidden'); buildingPanel.classList.remove('hidden'); renderBuildings() })
closeBuildingButton.addEventListener('click', () => { buildingPanel.classList.add('hidden'); menuContent.classList.remove('hidden') })
enterBuildModeButton.addEventListener('click', enterBuildMode)
exitBuildModeButton.addEventListener('click', exitBuildMode)
buildingPanel.addEventListener('click', (event) => { const button = event.target.closest('[data-unlock-building]'); if (!button) return; const type = button.dataset.unlockBuilding; const config = BUILDING_CONFIG.types[type]; if (chronoshards < config.unlockCost) return; chronoshards -= config.unlockCost; writeStoredNumber(CHRONOSHARDS_STORAGE_KEY, chronoshards); buildingState.unlocked.push(type); saveBuildings(); updateChronoshards(); renderBuildings() })
buildBar.addEventListener('click', (event) => { const button = event.target.closest('[data-select-building]'); if (!button) return; selectedBuildingType = button.dataset.selectBuilding; setBuildingPreview(selectedBuildingType); renderBuildings() })
buildingUpgrade.addEventListener('click', (event) => { const upgrade = event.target.closest('[data-upgrade-building]'); const destroy = event.target.closest('[data-destroy-building]'); if (event.target.closest('[data-close-building-upgrade]')) { buildingUpgrade.classList.add('hidden'); return } if (destroy) { const building = buildingState.placed.find((entry) => entry.id === destroy.dataset.destroyBuilding); if (!building) return; updateCash(getBuildingRefund(building)); buildingState.placed = buildingState.placed.filter((entry) => entry.id !== building.id); saveBuildings(); syncBuildings(); renderBuildings(); buildingUpgrade.classList.add('hidden'); return } if (upgrade) { const building = buildingState.placed.find((entry) => entry.id === upgrade.dataset.upgradeBuilding); if (!building) return; const cost = getBuildingUpgradeCost(building, upgrade.dataset.upgradeKey); if (cash < cost) return; updateCash(-cost); building.upgrades[upgrade.dataset.upgradeKey] = (building.upgrades[upgrade.dataset.upgradeKey] ?? 0) + 1; building.spent = (building.spent ?? BUILDING_CONFIG.types[building.type].baseCost) + cost; saveBuildings(); syncBuildings(); openBuildingUpgrade(building) } })

labPanel.addEventListener('click', (event) => {
  const categoryToggle = event.target.closest('[data-toggle-research-category]')
  const startResearchButton = event.target.closest('[data-start-research]')
  const unlockSlotButton = event.target.closest('[data-unlock-slot]')
  if (categoryToggle) {
    const category = categoryToggle.dataset.toggleResearchCategory
    if (collapsedResearchCategories.has(category)) collapsedResearchCategories.delete(category)
    else collapsedResearchCategories.add(category)
    renderResearchLab()
    return
  }
  if (startResearchButton) startResearch(startResearchButton.dataset.startResearch)
  if (unlockSlotButton) unlockResearchSlot(Number.parseInt(unlockSlotButton.dataset.unlockSlot, 10))
})

researchSearchInput.addEventListener('input', () => {
  researchSearchQuery = researchSearchInput.value
  renderResearchLab()
})

resetRoundButton.addEventListener('click', () => {
  clearSavedRound()
  resetGame()
  paused = false
  started = true
  pauseMenu.classList.add('hidden')
})

surrenderButton.addEventListener('click', () => {
  pauseMenu.classList.add('hidden')
  endGame()
})

returnMenuButton.addEventListener('click', returnToMainMenu)

pauseButton.addEventListener('click', () => {
  if (!started) return
  paused = !paused
  pauseMenu.classList.toggle('hidden', !paused)
})

closeCheatConsoleButton.addEventListener('click', () => toggleCheatConsole(false))
cheatInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    runCheatCommand(cheatInput.value)
    cheatInput.value = ''
  }
  if (event.key === 'Escape') toggleCheatConsole(false)
})

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && started) {
    event.preventDefault()
    paused = !paused
    pauseMenu.classList.toggle('hidden', !paused)
    return
  }
  if (CHEAT_CONFIG.enabled && event.key === CHEAT_CONFIG.hotkey) {
    event.preventDefault()
    toggleCheatConsole()
    return
  }
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault()
  keys.add(event.code)
})
window.addEventListener('keyup', (event) => keys.delete(event.code))

function isMobileInputMode() {
  return window.matchMedia('(max-width: 580px), (hover: none) and (pointer: coarse)').matches
}

function getCameraDistance() {
  const isPortraitMobile = window.matchMedia('(hover: none) and (pointer: coarse) and (orientation: portrait)').matches
  return CAMERA.distance * (isPortraitMobile ? CAMERA.portraitDistanceMultiplier : 1)
}

function updateJoystick(event) {
  if (!joystickOrigin) return
  const offsetX = event.clientX - joystickOrigin.x
  const offsetY = event.clientY - joystickOrigin.y
  const distance = Math.hypot(offsetX, offsetY)
  const clampedDistance = Math.min(distance, JOYSTICK_RADIUS)
  const scale = distance ? clampedDistance / distance : 0
  const knobX = offsetX * scale
  const knobY = offsetY * scale
  const strength = distance < 8 ? 0 : clampedDistance / JOYSTICK_RADIUS

  joystickInput.set((knobX / JOYSTICK_RADIUS) * strength, (knobY / JOYSTICK_RADIUS) * strength)
  virtualJoystick.querySelector('.virtual-joystick-knob').style.transform = `translate(${knobX}px, ${knobY}px)`
}

function releaseJoystick(event) {
  if (event && event.pointerId !== joystickPointerId) return
  joystickPointerId = null
  joystickOrigin = null
  joystickInput.set(0, 0)
  virtualJoystick.classList.remove('active')
  virtualJoystick.querySelector('.virtual-joystick-knob').style.transform = ''
}

canvas.addEventListener('pointerdown', (event) => {
  if (buildMode && selectedBuildingType) {
    const rect = canvas.getBoundingClientRect(); const pointer = new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1); const raycaster = new THREE.Raycaster(); raycaster.setFromCamera(pointer, camera); const selected = raycaster.intersectObjects([...buildingMeshes.values()], true)[0]; if (selected) { let object = selected.object; while (object && !object.userData.buildingId) object = object.parent; const building = buildingState.placed.find((b) => b.id === object?.userData.buildingId); if (building) openBuildingUpgrade(building); return } const hit = raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3()); if (!hit) return
    hit.x = Math.round(hit.x); hit.z = Math.round(hit.z); const config = BUILDING_CONFIG.types[selectedBuildingType]; const valid = buildingState.placed.length < getBuildingSlotLimit() && hit.length() <= BUILDING_CONFIG.placementRadius && hit.length() >= BUILDING_CONFIG.spawnClearance && !buildingState.placed.some((b) => Math.hypot(b.x - hit.x, b.z - hit.z) < BUILDING_CONFIG.minimumSpacing); const cost = buildingCost(selectedBuildingType); if (!valid || cash < cost) return
    updateCash(-cost); const building = { id: crypto.randomUUID(), type: selectedBuildingType, x: hit.x, z: hit.z, upgrades: {}, spent: cost }; buildingState.placed.push(building); saveBuildings(); createBuildingMesh(building); renderBuildings(); return
  }
  if (!isMobileInputMode() || !started || paused || event.button !== 0 || joystickPointerId !== null) return
  event.preventDefault()
  joystickPointerId = event.pointerId
  joystickOrigin = { x: event.clientX, y: event.clientY }
  virtualJoystick.style.left = `${event.clientX}px`
  virtualJoystick.style.top = `${event.clientY}px`
  virtualJoystick.classList.add('active')
  canvas.setPointerCapture(event.pointerId)
  updateJoystick(event)
})

canvas.addEventListener('pointermove', (event) => {
  if (event.pointerId !== joystickPointerId) return
  event.preventDefault()
  updateJoystick(event)
})

canvas.addEventListener('pointerup', releaseJoystick)
canvas.addEventListener('pointercancel', releaseJoystick)
canvas.addEventListener('lostpointercapture', releaseJoystick)
window.addEventListener('blur', () => {
  keys.clear()
  releaseJoystick()
})
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

applyDifficulty()
syncBuildings()
completeFinishedResearches()
updateBankedCells()
updateCash()
updateChronoshards()
renderMilestones()
renderResearchLab()
updateStartButton()
resetGame()
animate()
setInterval(() => {
  if (completeFinishedResearches() || !labPanel.classList.contains('hidden')) renderResearchLab()
}, 1000)

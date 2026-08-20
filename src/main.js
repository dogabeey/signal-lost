import * as THREE from 'three'
import { ANIMATION, CAMERA, COLORS, DIFFICULTY, ENTITIES, GAME, LIGHTING, OBSTACLE_TYPES, SCENE, SOUND } from './constants.js'
import { RESEARCH_CONFIG } from './research_config.js'
import './style.css'

document.querySelector('#app').innerHTML = `
  <main class="game-shell">
    <canvas id="game" aria-label="Astroid Belt game canvas"></canvas>
    <header class="hud">
      <div class="hud-left">
        <div class="brand"><span class="brand-mark"></span>ASTROID BELT</div>
        <div class="cash-balance">CASH <span id="cash">$000</span></div>
        <div class="chronoshard-balance">CHRONOSHARDS <span id="chronoshards">✦ 0</span></div>
      </div>
      <dl class="stats">
        <div><dt>CELLS</dt><dd id="score">000</dd></div>
        <div><dt>TIME</dt><dd id="time">00:00</dd></div>
      </dl>
    </header>
    <aside class="instructions"><b>MOVE</b><span>WASD / ARROW KEYS</span></aside>
    <div class="cash-indicators" id="cash-indicators" aria-live="polite"></div>
    <section class="overlay" id="overlay" aria-live="polite">
      <div class="menu-content" id="menu-content">
        <p class="eyebrow">SYSTEM OVERRIDE</p>
        <h1 id="overlay-title">ASTROID BELT</h1>
        <p id="overlay-copy">Collect energy cells. Avoid the obstacles.</p>
        <div class="tier-selection" aria-label="Difficulty tier selection">
          <div class="tier-heading"><span class="tier-icon" aria-hidden="true">✦</span><span>Difficulty</span></div>
          <div class="tier-carousel">
            <button class="tier-nav" id="previous-tier" type="button" aria-label="Select previous tier">‹</button>
            <span class="tier-options" id="tier-options" aria-live="polite"></span>
            <button class="tier-nav" id="next-tier" type="button" aria-label="Select next tier">›</button>
          </div>
          <p class="highest-cell">HIGHEST CELL: <span id="highest-cells">000</span></p>
          <p class="tier-requirement" id="tier-requirement"></p>
        </div>
        <div class="menu-actions">
          <button id="start-button" type="button">START RUN</button>
          <button class="secondary-button" id="open-lab-button" type="button">RESEARCH LAB</button>
        </div>
      </div>
      <section class="lab-panel hidden" id="lab-panel" aria-label="Research Lab">
        <div class="lab-header"><div><p class="eyebrow">PERMANENT UPGRADES</p><h2>RESEARCH LAB</h2></div><button class="secondary-button" id="close-lab-button" type="button">BACK</button></div>
        <p class="lab-balance">CASH <span id="lab-cash">$0</span> · CHRONOSHARDS <span id="lab-chronoshards">✦ 0</span></p>
        <p class="lab-message" id="lab-message" aria-live="polite"></p>
        <h3>ACTIVE SLOTS</h3><div class="research-slots" id="research-slots"></div>
        <h3>AVAILABLE RESEARCH</h3><div class="research-list" id="research-list"></div>
      </section>
    </section>
  </main>
`

const canvas = document.querySelector('#game')
const scoreElement = document.querySelector('#score')
const timeElement = document.querySelector('#time')
const overlay = document.querySelector('#overlay')
const overlayTitle = document.querySelector('#overlay-title')
const overlayCopy = document.querySelector('#overlay-copy')
const startButton = document.querySelector('#start-button')
const menuContent = document.querySelector('#menu-content')
const labPanel = document.querySelector('#lab-panel')
const openLabButton = document.querySelector('#open-lab-button')
const closeLabButton = document.querySelector('#close-lab-button')
const labCashElement = document.querySelector('#lab-cash')
const labChronoshardsElement = document.querySelector('#lab-chronoshards')
const labMessageElement = document.querySelector('#lab-message')
const researchSlotsElement = document.querySelector('#research-slots')
const researchListElement = document.querySelector('#research-list')
const cashElement = document.querySelector('#cash')
const chronoshardsElement = document.querySelector('#chronoshards')
const cashIndicators = document.querySelector('#cash-indicators')
const highestCellsElement = document.querySelector('#highest-cells')
const tierRequirementElement = document.querySelector('#tier-requirement')
const tierOptions = document.querySelector('#tier-options')
const previousTierButton = document.querySelector('#previous-tier')
const nextTierButton = document.querySelector('#next-tier')

const CELL_BANK_STORAGE_KEY = 'astroid-belt-banked-cells'
const TIER_STORAGE_KEY = 'astroid-belt-selected-tier'
const TIER_HIGH_SCORES_STORAGE_KEY = 'astroid-belt-tier-high-scores'
const CASH_STORAGE_KEY = 'astroid-belt-cash'
const CHRONOSHARDS_STORAGE_KEY = 'astroid-belt-chronoshards'
const RESEARCH_LAB_STORAGE_KEY = 'astroid-belt-research-lab'
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

function getUnlockedTierIndex(cells) {
  let unlockedTierIndex = 0
  let cellsRequired = 0
  for (let index = 0; index < tierKeys.length - 1; index += 1) {
    cellsRequired += DIFFICULTY[tierKeys[index]].cellsRequiredToAdvance
    if (cells < cellsRequired) break
    unlockedTierIndex = index + 1
  }
  return unlockedTierIndex
}

let bankedCells = readStoredNumber(CELL_BANK_STORAGE_KEY)
let selectedTierIndex = Math.min(readStoredNumber(TIER_STORAGE_KEY), getUnlockedTierIndex(bankedCells))
const tierHighScores = readStoredTierHighScores()
let cash = readStoredNumber(CASH_STORAGE_KEY)
let chronoshards = readStoredNumber(CHRONOSHARDS_STORAGE_KEY)

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
  if (requirements.minTier && getUnlockedTierIndex(bankedCells) + 1 < requirements.minTier) return `Requires Tier ${requirements.minTier}`
  if (requirements.minBankedCells && bankedCells < requirements.minBankedCells) return `Requires ${requirements.minBankedCells} banked cells`
  if (requirements.researchId && getResearchLevel(requirements.researchId) < 1) return `Requires ${getResearchById(requirements.researchId).name}`
  for (const [researchId, level] of Object.entries(requirements.researchLevels ?? {})) {
    if (getResearchLevel(researchId) < level) return `Requires ${getResearchById(researchId).name} Lv. ${level}`
  }
  return ''
}

function completeFinishedResearches() {
  const now = Date.now()
  let changed = false
  for (let index = 0; index < researchState.unlockedSlots; index += 1) {
    const slot = researchState.slots[index]
    if (!slot || slot.completesAt > now) continue
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
  researchSlotsElement.innerHTML = researchState.slots.map((slot, index) => {
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
    const tierUnlocked = !unlock.requirements?.minTier || getUnlockedTierIndex(bankedCells) + 1 >= unlock.requirements.minTier
    const canAfford = unlock.cost.currency === 'cash' ? cash >= unlock.cost.amount : chronoshards >= unlock.cost.amount
    const disabled = tierUnlocked && canAfford ? '' : 'disabled'
    const requirement = tierUnlocked ? `Unlock for ${formatCurrency(unlock.cost.currency, unlock.cost.amount)}` : `Requires Tier ${unlock.requirements.minTier}`
    return `<article class="research-slot locked"><span>SLOT ${slotNumber}</span><strong>LOCKED</strong><button data-unlock-slot="${slotNumber}" type="button" ${disabled}>${requirement}</button></article>`
  }).join('')

  const researchesByCategory = new Map()
  for (const research of RESEARCH_CONFIG.researches) {
    const category = research.category ?? 'General'
    researchesByCategory.set(category, [...(researchesByCategory.get(category) ?? []), research])
  }
  researchListElement.innerHTML = [...researchesByCategory.entries()].map(([category, researches]) => `<section class="research-category"><h4>${category}</h4><div class="research-grid">${researches.map((research) => {
    const level = getResearchLevel(research.id)
    const lockReason = getResearchLockReason(research)
    const active = researchState.slots.some((slot) => slot?.researchId === research.id)
    const full = level >= research.maxLevel
    const cost = getResearchCost(research, level)
    const duration = getResearchDuration(research, level)
    const canAfford = research.cost.currency === 'cash' ? cash >= cost : chronoshards >= cost
    const disabled = lockReason || active || full || !canAfford || !researchState.slots.slice(0, researchState.unlockedSlots).some((slot) => !slot)
    const status = full ? 'MAX LEVEL' : active ? 'IN PROGRESS' : lockReason || `Cost ${formatCurrency(research.cost.currency, cost)} · ${formatDuration(duration)}`
    return `<article class="research-card"><div><span class="research-level">LV. ${level}/${research.maxLevel}</span><h4>${research.name}</h4><p>${research.description}</p><p class="research-effect">${formatResearchEffect(research, level)} → ${formatResearchEffect(research, Math.min(level + 1, research.maxLevel))}</p><small>${status}</small></div><button data-start-research="${research.id}" type="button" ${disabled ? 'disabled' : ''}>${full ? 'MAXED' : 'RESEARCH'}</button></article>`
  }).join('')}</div></section>`).join('')
}

function startResearch(researchId) {
  completeFinishedResearches()
  const research = getResearchById(researchId)
  const level = getResearchLevel(researchId)
  const lockReason = getResearchLockReason(research)
  const emptySlot = researchState.slots.slice(0, researchState.unlockedSlots).findIndex((slot) => !slot)
  const cost = getResearchCost(research, level)
  const balance = research.cost.currency === 'cash' ? cash : chronoshards
  if (lockReason || level >= research.maxLevel || emptySlot < 0 || researchState.slots.some((slot) => slot?.researchId === researchId) || balance < cost) return
  if (research.cost.currency === 'cash') updateCash(-cost)
  else updateChronoshards(-cost)
  researchState.slots[emptySlot] = { researchId, level, completesAt: Date.now() + getResearchDuration(research, level) }
  saveResearchState()
  setLabMessage(`${research.name} research started in Slot ${emptySlot + 1}.`)
  renderResearchLab()
}

function unlockResearchSlot(slotNumber) {
  const unlock = RESEARCH_CONFIG.slotUnlocks.find((entry) => entry.slot === slotNumber)
  if (!unlock || slotNumber !== researchState.unlockedSlots + 1) return
  if (unlock.requirements?.minTier && getUnlockedTierIndex(bankedCells) + 1 < unlock.requirements.minTier) return
  const balance = unlock.cost.currency === 'cash' ? cash : chronoshards
  if (balance < unlock.cost.amount) return
  if (unlock.cost.currency === 'cash') updateCash(-unlock.cost.amount)
  else updateChronoshards(-unlock.cost.amount)
  researchState.unlockedSlots = slotNumber
  saveResearchState()
  setLabMessage(`Research Slot ${slotNumber} unlocked.`)
  renderResearchLab()
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
  if (score <= (tierHighScores[tierKey] ?? 0)) return
  tierHighScores[tierKey] = score
  writeStoredTierHighScores()
  renderTierOptions()
}

function renderTierOptions() {
  const unlockedTierIndex = getUnlockedTierIndex(bankedCells)
  if (selectedTierIndex > unlockedTierIndex) selectedTierIndex = unlockedTierIndex
  tierOptions.textContent = `Tier ${selectedTierIndex + 1}`
  const tierKey = tierKeys[selectedTierIndex]
  highestCellsElement.textContent = String(tierHighScores[tierKey] ?? 0).padStart(3, '0')
  tierRequirementElement.textContent = `CELLS REQUIRED TO NEXT TIER: ${DIFFICULTY[tierKey].cellsRequiredToAdvance}`
  previousTierButton.disabled = selectedTierIndex === 0
  nextTierButton.disabled = selectedTierIndex >= unlockedTierIndex
}

function selectTier(tierIndex) {
  if (tierIndex < 0 || tierIndex > getUnlockedTierIndex(bankedCells)) return
  selectedTierIndex = tierIndex
  writeStoredNumber(TIER_STORAGE_KEY, selectedTierIndex)
  applyDifficulty()
  renderTierOptions()
}

previousTierButton.addEventListener('click', () => selectTier(selectedTierIndex - 1))
nextTierButton.addEventListener('click', () => selectTier(selectedTierIndex + 1))

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

scene.add(new THREE.HemisphereLight(LIGHTING.hemisphereSky, LIGHTING.hemisphereGround, LIGHTING.hemisphereIntensity))
const keyLight = new THREE.DirectionalLight(LIGHTING.key, LIGHTING.keyIntensity)
keyLight.position.set(-7, 13, 5)
keyLight.castShadow = true
keyLight.shadow.mapSize.set(1024, 1024)
scene.add(keyLight)

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(GAME.arenaSize, GAME.arenaSize),
  new THREE.MeshStandardMaterial({ color: COLORS.floor, metalness: SCENE.floorMetalness, roughness: SCENE.floorRoughness }),
)
floor.rotation.x = -Math.PI / 2
floor.receiveShadow = true
scene.add(floor)

const grid = new THREE.GridHelper(GAME.arenaSize, GAME.arenaSize, COLORS.gridMajor, COLORS.gridMinor)
grid.position.y = 0.01
scene.add(grid)

function createArenaBoundaryGeometry(limit) {
  return new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-limit, 0.04, -limit),
    new THREE.Vector3(limit, 0.04, -limit),
    new THREE.Vector3(limit, 0.04, limit),
    new THREE.Vector3(-limit, 0.04, limit),
  ])
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

function applyDifficulty() {
  const difficulty = getCurrentDifficulty()
  const arenaSize = GAME.arenaSize + difficulty.extraArenaPadding * 2
  const arenaLimit = getArenaLimit()
  floor.scale.setScalar(arenaSize / GAME.arenaSize)
  grid.scale.setScalar(arenaSize / GAME.arenaSize)
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
player.position.y = GAME.playerStartHeight
scene.add(player)

const keys = new Set()
const cells = []
const chronoCells = []
const obstacles = []
const fallingObstacles = []
const explosions = []
const bangerPulses = []
const obstacleSpawnWarnings = []
const timer = new THREE.Timer()
let started = false
let ended = false
let score = 0
let elapsed = 0
let spawnTimer = 0
let chronoCellTimer = 0
let obstacleSpawnTimer = 0
let hazardTimer = 0

const cellGeometry = new THREE.OctahedronGeometry(ENTITIES.cellRadius)
const chronoCellGeometry = new THREE.IcosahedronGeometry(ENTITIES.chronoCellRadius, 1)
const obstacleGeometry = createSpikyBallGeometry()

function createSpikyBallGeometry() {
  const geometry = new THREE.IcosahedronGeometry(ENTITIES.obstacleRadius, ENTITIES.obstacleDetail)
  const positions = geometry.getAttribute('position')

  for (let index = 0; index < positions.count; index += 3) {
    const spike = 1 + Math.abs(Math.sin(index * 12.9898)) * ENTITIES.obstacleSpikeAmplitude
    for (let vertex = 0; vertex < 3; vertex += 1) {
      positions.setXYZ(
        index + vertex,
        positions.getX(index + vertex) * spike,
        positions.getY(index + vertex) * spike,
        positions.getZ(index + vertex) * spike,
      )
    }
  }

  positions.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}

function randomArenaPosition(minDistance = 0) {
  const arenaLimit = getArenaLimit()
  let position
  do {
    position = new THREE.Vector3(THREE.MathUtils.randFloat(-arenaLimit, arenaLimit), 0, THREE.MathUtils.randFloat(-arenaLimit, arenaLimit))
  } while (position.distanceTo(player.position) < minDistance)
  return position
}

function addCell() {
  const material = new THREE.MeshStandardMaterial({ color: COLORS.cell, emissive: COLORS.cellEmissive, emissiveIntensity: ENTITIES.cellEmissiveIntensity, metalness: ENTITIES.cellMetalness, roughness: ENTITIES.cellRoughness })
  const cell = new THREE.Mesh(cellGeometry, material)
  cell.position.copy(randomArenaPosition(GAME.cellMinDistance))
  cell.position.y = GAME.playerStartHeight
  cell.userData.phase = Math.random() * Math.PI * 2
  cell.userData.cashValue = GAME.cellCashValue * getCurrentDifficulty().cashValueMultiplier * (1 + getResearchStatBonus('cashMultiplier'))
  scene.add(cell)
  cells.push(cell)
}

function addChronoCell() {
  if (chronoCells.length > 0) return
  const material = new THREE.MeshStandardMaterial({ color: COLORS.chronoCell, emissive: COLORS.chronoCellEmissive, emissiveIntensity: ENTITIES.chronoCellEmissiveIntensity, metalness: 0.4, roughness: 0.12, transparent: true })
  const chronoCell = new THREE.Mesh(chronoCellGeometry, material)
  chronoCell.position.copy(randomArenaPosition(GAME.chronoCellMinDistance))
  chronoCell.position.y = GAME.playerStartHeight
  chronoCell.userData.phase = Math.random() * Math.PI * 2
  chronoCell.userData.age = 0
  scene.add(chronoCell)
  chronoCells.push(chronoCell)
}

function addObstacle(type) {
  createObstacle(randomArenaPosition(GAME.obstacleMinDistance), type)
}

function scheduleObstacle() {
  const position = randomArenaPosition(GAME.obstacleMinDistance)
  const difficulty = getCurrentDifficulty()
  const weightedTypes = difficulty.availableObstacleTypes.map((type) => ({ type, weight: difficulty[`${type}SpawnWeight`] ?? 0 }))
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
  obstacleSpawnWarnings.push({ ring, glow, beam, position, type, age: 0 })
  soundSystem.playObstacleSummon(position)
}

function createObstacle(position, type) {
  const obstacleType = OBSTACLE_TYPES[type]
  const material = new THREE.MeshStandardMaterial({ color: obstacleType.color, emissive: obstacleType.emissive, metalness: ENTITIES.obstacleMetalness, roughness: ENTITIES.obstacleRoughness })
  const obstacle = new THREE.Mesh(obstacleGeometry, material)
  obstacle.position.copy(position)
  obstacle.position.y = GAME.obstacleGroundHeight
  obstacle.castShadow = true
  obstacle.userData.type = type
  obstacle.userData.age = 0
  obstacle.userData.speed = THREE.MathUtils.randFloat(0.8, 1.45)
  if (type === 'chaser' || type === 'banger') {
    const rangeIndicator = new THREE.Mesh(
      new THREE.RingGeometry(obstacleType.range - ENTITIES.chaserRangeIndicatorWidth, obstacleType.range, ENTITIES.chaserRangeIndicatorSegments),
      new THREE.MeshBasicMaterial({ color: obstacleType.color, transparent: true, opacity: ANIMATION.chaserRangeIndicatorBaseOpacity, side: THREE.DoubleSide, depthWrite: false }),
    )
    rangeIndicator.rotation.x = -Math.PI / 2
    rangeIndicator.position.set(position.x, 0.025, position.z)
    obstacle.userData.rangeIndicator = rangeIndicator
    scene.add(rangeIndicator)
  }
  scene.add(obstacle)
  obstacles.push(obstacle)
}

function scheduleFallingObstacles() {
  createFallingObstacle(player.position.clone())
}

function createFallingObstacle(target) {
  const obstacle = new THREE.Mesh(
    obstacleGeometry,
    new THREE.MeshStandardMaterial({ color: COLORS.fallingObstacle, emissive: COLORS.fallingObstacleEmissive, emissiveIntensity: ENTITIES.fallingObstacleEmissiveIntensity, metalness: ENTITIES.fallingObstacleMetalness, roughness: ENTITIES.fallingObstacleRoughness }),
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
  fallingObstacles.push({ obstacle, shadow, targetRing, target: target.clone(), age: 0, landed: false })
  soundSystem.playFallingObstacle(target)
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

function detonateBanger(banger) {
  const position = banger.position.clone()
  const radius = OBSTACLE_TYPES.banger.range
  const playerInRange = planarDistance(player.position, position) <= radius

  for (let index = obstacles.length - 1; index >= 0; index -= 1) {
    const obstacle = obstacles[index]
    if (planarDistance(obstacle.position, position) <= radius) {
      scene.remove(obstacle, obstacle.userData.rangeIndicator)
      obstacles.splice(index, 1)
    }
  }

  createExplosion(position, radius)
  if (playerInRange) endGame()
}

function resetGame() {
  clearObjects(cells)
  clearObjects(chronoCells)
  for (const obstacle of obstacles) scene.remove(obstacle, obstacle.userData.rangeIndicator)
  obstacles.length = 0
  for (const fallingObstacle of fallingObstacles) scene.remove(fallingObstacle.obstacle, fallingObstacle.shadow, fallingObstacle.targetRing)
  fallingObstacles.length = 0
  for (const explosion of explosions) scene.remove(explosion.shockwave, explosion.blast, explosion.light)
  explosions.length = 0
  for (const bangerPulse of bangerPulses) scene.remove(bangerPulse.pulse)
  bangerPulses.length = 0
  for (const warning of obstacleSpawnWarnings) scene.remove(warning.ring, warning.glow, warning.beam)
  obstacleSpawnWarnings.length = 0
  player.position.set(0, GAME.playerStartHeight, 0)
  score = 0
  elapsed = 0
  spawnTimer = 0
  chronoCellTimer = 0
  obstacleSpawnTimer = 0
  hazardTimer = 0
  scoreElement.textContent = '000'
  timeElement.textContent = '00:00'
  for (let index = 0; index < GAME.initialCellCount; index += 1) addCell()
  for (const type of GAME.initialObstacleTypes) {
    if (getCurrentDifficulty().availableObstacleTypes.includes(type)) addObstacle(type)
  }
}

function endGame() {
  started = false
  ended = true
  recordTierHighScore()
  overlayTitle.textContent = 'SIGNAL LOST'
  overlayCopy.textContent = `You secured ${score} energy ${score === 1 ? 'cell' : 'cells'}.`
  startButton.textContent = 'RUN AGAIN'
  overlay.classList.remove('hidden')
}

function updateHud() {
  scoreElement.textContent = String(score).padStart(3, '0')
  const minutes = Math.floor(elapsed / 60)
  const seconds = Math.floor(elapsed % 60)
  timeElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function updateGame(delta, total) {
  const difficulty = getCurrentDifficulty()
  const regularObstacleLifetime = GAME.regularObstacleLifetime + difficulty.obstacleLifetimeOffset
    + score * (GAME.regularObstacleLifetimeIncreasePerCell + difficulty.obstacleLifetimeIncreasePerCellOffset)
  const obstacleSpawnInterval = Math.max(
    GAME.obstacleSpawnWarningDuration,
    GAME.obstacleSpawnInterval + difficulty.obstacleSpawnIntervalOffset
      - score * (GAME.obstacleSpawnDecreasePerCell + difficulty.obstacleSpawnDecreasePerCellOffset),
  )
  const direction = new THREE.Vector3(
    (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0),
    0,
    (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0),
  )

  if (direction.lengthSq() > 0) {
    direction.normalize()
    player.position.addScaledVector(direction, GAME.playerSpeed * (1 + getResearchStatBonus('playerSpeedMultiplier')) * delta)
    player.rotation.y = Math.atan2(direction.x, direction.z)
  }

  const arenaLimit = getArenaLimit()
  player.position.x = THREE.MathUtils.clamp(player.position.x, -arenaLimit, arenaLimit)
  player.position.z = THREE.MathUtils.clamp(player.position.z, -arenaLimit, arenaLimit)
  player.rotation.y += delta * ANIMATION.playerTurnSpeed
  playerCore.rotation.x += delta * ANIMATION.playerCoreSpinSpeed
  playerRing.rotation.z += delta * ANIMATION.playerRingSpinSpeed
  const slowAuraUnlocked = getResearchLevel('unlock-slow-aura') > 0
  const slowAuraRange = GAME.slowAuraBaseRange * (1 + getResearchStatBonus('slowAuraRange'))
  const slowAuraEffect = THREE.MathUtils.clamp(GAME.slowAuraBaseEffect + getResearchStatBonus('slowAuraEffect'), 0, 0.9)
  slowAuraRing.visible = slowAuraUnlocked
  if (slowAuraUnlocked) {
    slowAuraRing.scale.setScalar(slowAuraRange)
    slowAuraRing.material.opacity = 0.22 + Math.sin(total * 3.5) * 0.08
    slowAuraRing.rotation.z += delta * 0.35
  }

  for (let index = cells.length - 1; index >= 0; index -= 1) {
    const cell = cells[index]
    cell.rotation.y += delta * ANIMATION.cellSpinSpeed
    cell.position.y = ANIMATION.cellBobBaseHeight + Math.sin(total * ANIMATION.cellBobSpeed + cell.userData.phase) * ANIMATION.cellBobAmplitude
    if (cell.position.distanceTo(player.position) < GAME.cellPickupRadius) {
      soundSystem.playCellCollect(cell.position)
      scene.remove(cell)
      cells.splice(index, 1)
      score += 1
      updateBankedCells(1)
      updateCash(cell.userData.cashValue)
      showCashIndicator(cell.position, cell.userData.cashValue)
      addCell()
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
  for (let index = obstacles.length - 1; index >= 0; index -= 1) {
    const obstacle = obstacles[index]
    const obstacleType = OBSTACLE_TYPES[obstacle.userData.type]
    if (obstacle.userData.type === 'regular') {
      obstacle.userData.age += delta
      if (obstacle.userData.age > regularObstacleLifetime) {
        scene.remove(obstacle)
        obstacles.splice(index, 1)
        continue
      }
    }
    const playerOffset = player.position.clone().sub(obstacle.position)
    playerOffset.y = 0
    const obstacleSpeedMultiplier = slowAuraUnlocked && playerOffset.length() <= slowAuraRange ? 1 - slowAuraEffect : 1
    if (playerOffset.length() <= obstacleType.range && obstacleType.speed > 0) {
      obstacle.position.addScaledVector(playerOffset.normalize(), obstacleType.speed * obstacleSpeedMultiplier * delta)
    }
    if (obstacle.userData.rangeIndicator) {
      const rangeIndicator = obstacle.userData.rangeIndicator
      const isPlayerInRange = playerOffset.length() <= obstacleType.range
      const pulse = 1 + Math.sin(total * ANIMATION.chaserRangeIndicatorPulseSpeed) * ANIMATION.chaserRangeIndicatorPulseAmount
      rangeIndicator.position.set(obstacle.position.x, 0.025, obstacle.position.z)
      rangeIndicator.scale.setScalar(isPlayerInRange ? pulse : 1)
      rangeIndicator.material.opacity = isPlayerInRange
        ? ANIMATION.chaserRangeIndicatorActiveOpacity
        : ANIMATION.chaserRangeIndicatorBaseOpacity
    }
    obstacle.rotation.y += delta * obstacle.userData.speed * obstacleSpeedMultiplier
    obstacle.position.y = ANIMATION.obstacleBobBaseHeight + Math.sin(total * ANIMATION.obstacleBobSpeed + obstacle.position.x) * ANIMATION.obstacleBobAmplitude
    if (obstacle.userData.type === 'banger') {
      obstacle.userData.age += delta * obstacleSpeedMultiplier
      const fuseProgress = Math.min(obstacle.userData.age / ENTITIES.bangerFuseDuration, 1)
      const fusePulse = (Math.sin(obstacle.userData.age * ANIMATION.bangerFusePulseSpeed) + 1) / 2
      obstacle.material.emissiveIntensity = ANIMATION.bangerFuseEmissiveBaseIntensity + fusePulse * ANIMATION.bangerFuseEmissivePulseAmount
      obstacle.userData.pulseTimer = (obstacle.userData.pulseTimer ?? 0) + delta * obstacleSpeedMultiplier
      const pulseInterval = THREE.MathUtils.lerp(GAME.bangerPulseStartInterval, GAME.bangerPulseEndInterval, fuseProgress)
      if (obstacle.userData.pulseTimer >= pulseInterval) {
        createBangerPulse(obstacle.position, obstacleType.range, fuseProgress)
        obstacle.userData.pulseTimer = 0
      }
      if (obstacle.userData.age >= ENTITIES.bangerFuseDuration) bangersToDetonate.push(obstacle)
      continue
    }
    if (obstacle.position.distanceTo(player.position) < GAME.playerRadius) endGame()
  }

  for (const banger of bangersToDetonate) {
    if (obstacles.includes(banger)) detonateBanger(banger)
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
      fallingObstacle.obstacle.position.y = GAME.fallingBlockGroundHeight
      fallingObstacle.shadow.material.opacity = Math.max(0, 0.88 - (fallingObstacle.age - GAME.fallingBlockDuration) * 1.8)
      fallingObstacle.targetRing.material.opacity = Math.max(0, 0.55 - (fallingObstacle.age - GAME.fallingBlockDuration) * 1.5)
      if (fallingObstacle.age > GAME.fallingBlockLifetime) {
        scene.remove(fallingObstacle.obstacle, fallingObstacle.shadow, fallingObstacle.targetRing)
        fallingObstacles.splice(index, 1)
      }
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
  chronoCellTimer += delta
  obstacleSpawnTimer += delta
  hazardTimer += delta
  if (spawnTimer > GAME.cellSpawnInterval / (1 + getResearchStatBonus('cellSpawnRate'))) {
    addCell()
    spawnTimer = 0
  }
  if (chronoCellTimer > GAME.chronoCellSpawnInterval / (1 + getResearchStatBonus('chronoSpawnRate'))) {
    addChronoCell()
    chronoCellTimer = 0
  }
  if (obstacleSpawnTimer > obstacleSpawnInterval) {
    scheduleObstacle()
    obstacleSpawnTimer = 0
  }
  if (hazardTimer > Math.max(GAME.fallingBlockMinInterval, GAME.fallingBlockBaseInterval - score * GAME.fallingBlockIntervalPerCell)) {
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
  if (started) updateGame(delta, total)
  camera.position.lerp(new THREE.Vector3(player.position.x * 0.26, CAMERA.height, player.position.z + CAMERA.distance), CAMERA.followStrength)
  camera.lookAt(player.position.x * 0.28, 0, player.position.z * 0.3)
  renderer.render(scene, camera)
}

startButton.addEventListener('click', async () => {
  await soundSystem.initialize()
  soundSystem.playButtonClick()
  resetGame()
  started = true
  ended = false
  labPanel.classList.add('hidden')
  menuContent.classList.remove('hidden')
  overlay.classList.add('hidden')
})

openLabButton.addEventListener('click', () => {
  menuContent.classList.add('hidden')
  labPanel.classList.remove('hidden')
  setLabMessage()
  renderResearchLab()
})

closeLabButton.addEventListener('click', () => {
  labPanel.classList.add('hidden')
  menuContent.classList.remove('hidden')
})

labPanel.addEventListener('click', (event) => {
  const startResearchButton = event.target.closest('[data-start-research]')
  const unlockSlotButton = event.target.closest('[data-unlock-slot]')
  if (startResearchButton) startResearch(startResearchButton.dataset.startResearch)
  if (unlockSlotButton) unlockResearchSlot(Number.parseInt(unlockSlotButton.dataset.unlockSlot, 10))
})

window.addEventListener('keydown', (event) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault()
  keys.add(event.code)
})
window.addEventListener('keyup', (event) => keys.delete(event.code))
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

applyDifficulty()
completeFinishedResearches()
updateBankedCells()
updateCash()
updateChronoshards()
renderResearchLab()
resetGame()
animate()
setInterval(() => {
  if (completeFinishedResearches() || !labPanel.classList.contains('hidden')) renderResearchLab()
}, 1000)

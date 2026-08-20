import * as THREE from 'three'
import { ANIMATION, CAMERA, COLORS, ENTITIES, GAME, LIGHTING, OBSTACLE_TYPES, SCENE, SOUND } from './constants.js'
import './style.css'

document.querySelector('#app').innerHTML = `
  <main class="game-shell">
    <canvas id="game" aria-label="Neon Drift game canvas"></canvas>
    <header class="hud">
      <div class="brand"><span class="brand-mark"></span>NEON DRIFT</div>
      <dl class="stats">
        <div><dt>CELLS</dt><dd id="score">000</dd></div>
        <div><dt>TIME</dt><dd id="time">00:00</dd></div>
      </dl>
    </header>
    <aside class="instructions"><b>MOVE</b><span>WASD / ARROW KEYS</span></aside>
    <section class="overlay" id="overlay" aria-live="polite">
      <p class="eyebrow">SYSTEM OVERRIDE</p>
      <h1 id="overlay-title">NEON DRIFT</h1>
      <p id="overlay-copy">Collect energy cells. Avoid the rising blocks.</p>
      <button id="start-button" type="button">START RUN</button>
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

const arenaBoundary = new THREE.LineLoop(
  new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-GAME.arenaLimit, 0.04, -GAME.arenaLimit),
    new THREE.Vector3(GAME.arenaLimit, 0.04, -GAME.arenaLimit),
    new THREE.Vector3(GAME.arenaLimit, 0.04, GAME.arenaLimit),
    new THREE.Vector3(-GAME.arenaLimit, 0.04, GAME.arenaLimit),
  ]),
  new THREE.LineDashedMaterial({ color: COLORS.arenaBoundary, dashSize: 0.45, gapSize: 0.2 }),
)
arenaBoundary.computeLineDistances()
scene.add(arenaBoundary)

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
player.position.y = GAME.playerStartHeight
scene.add(player)

const keys = new Set()
const cells = []
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
let obstacleSpawnTimer = 0
let hazardTimer = 0

const cellGeometry = new THREE.OctahedronGeometry(ENTITIES.cellRadius)
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
  let position
  do {
    position = new THREE.Vector3(THREE.MathUtils.randFloat(-GAME.arenaLimit, GAME.arenaLimit), 0, THREE.MathUtils.randFloat(-GAME.arenaLimit, GAME.arenaLimit))
  } while (position.distanceTo(player.position) < minDistance)
  return position
}

function addCell() {
  const material = new THREE.MeshStandardMaterial({ color: COLORS.cell, emissive: COLORS.cellEmissive, emissiveIntensity: ENTITIES.cellEmissiveIntensity, metalness: ENTITIES.cellMetalness, roughness: ENTITIES.cellRoughness })
  const cell = new THREE.Mesh(cellGeometry, material)
  cell.position.copy(randomArenaPosition(GAME.cellMinDistance))
  cell.position.y = GAME.playerStartHeight
  cell.userData.phase = Math.random() * Math.PI * 2
  scene.add(cell)
  cells.push(cell)
}

function addObstacle(type) {
  createObstacle(randomArenaPosition(GAME.obstacleMinDistance), type)
}

function scheduleObstacle() {
  const position = randomArenaPosition(GAME.obstacleMinDistance)
  const types = Object.keys(OBSTACLE_TYPES)
  const type = types[Math.floor(Math.random() * types.length)]
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
  obstacleSpawnTimer = 0
  hazardTimer = 0
  scoreElement.textContent = '000'
  timeElement.textContent = '00:00'
  for (let index = 0; index < GAME.initialCellCount; index += 1) addCell()
  for (const type of GAME.initialObstacleTypes) addObstacle(type)
}

function endGame() {
  started = false
  ended = true
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
  const regularObstacleLifetime = GAME.regularObstacleLifetime + score * GAME.regularObstacleLifetimeIncreasePerCell
  const obstacleSpawnInterval = Math.max(
    GAME.obstacleSpawnWarningDuration,
    GAME.obstacleSpawnInterval - score * GAME.obstacleSpawnDecreasePerCell,
  )
  const direction = new THREE.Vector3(
    (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0),
    0,
    (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0),
  )

  if (direction.lengthSq() > 0) {
    direction.normalize()
    player.position.addScaledVector(direction, GAME.playerSpeed * delta)
    player.rotation.y = Math.atan2(direction.x, direction.z)
  }

  player.position.x = THREE.MathUtils.clamp(player.position.x, -GAME.arenaLimit, GAME.arenaLimit)
  player.position.z = THREE.MathUtils.clamp(player.position.z, -GAME.arenaLimit, GAME.arenaLimit)
  player.rotation.y += delta * ANIMATION.playerTurnSpeed
  playerCore.rotation.x += delta * ANIMATION.playerCoreSpinSpeed
  playerRing.rotation.z += delta * ANIMATION.playerRingSpinSpeed

  for (let index = cells.length - 1; index >= 0; index -= 1) {
    const cell = cells[index]
    cell.rotation.y += delta * ANIMATION.cellSpinSpeed
    cell.position.y = ANIMATION.cellBobBaseHeight + Math.sin(total * ANIMATION.cellBobSpeed + cell.userData.phase) * ANIMATION.cellBobAmplitude
    if (cell.position.distanceTo(player.position) < GAME.cellPickupRadius) {
      soundSystem.playCellCollect(cell.position)
      scene.remove(cell)
      cells.splice(index, 1)
      score += 1
      addCell()
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
    if (playerOffset.length() <= obstacleType.range && obstacleType.speed > 0) {
      obstacle.position.addScaledVector(playerOffset.normalize(), obstacleType.speed * delta)
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
    obstacle.rotation.y += delta * obstacle.userData.speed
    obstacle.position.y = ANIMATION.obstacleBobBaseHeight + Math.sin(total * ANIMATION.obstacleBobSpeed + obstacle.position.x) * ANIMATION.obstacleBobAmplitude
    if (obstacle.userData.type === 'banger') {
      obstacle.userData.age += delta
      const fuseProgress = Math.min(obstacle.userData.age / ENTITIES.bangerFuseDuration, 1)
      const fusePulse = (Math.sin(obstacle.userData.age * ANIMATION.bangerFusePulseSpeed) + 1) / 2
      obstacle.material.emissiveIntensity = ANIMATION.bangerFuseEmissiveBaseIntensity + fusePulse * ANIMATION.bangerFuseEmissivePulseAmount
      obstacle.userData.pulseTimer = (obstacle.userData.pulseTimer ?? 0) + delta
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
  obstacleSpawnTimer += delta
  hazardTimer += delta
  if (spawnTimer > GAME.cellSpawnInterval) {
    addCell()
    spawnTimer = 0
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
  overlay.classList.add('hidden')
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

resetGame()
animate()

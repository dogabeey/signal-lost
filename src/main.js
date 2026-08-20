import * as THREE from 'three'
import { ANIMATION, CAMERA, COLORS, ENTITIES, GAME, LIGHTING, OBSTACLE_TYPES, SCENE } from './constants.js'
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
const regularSpawnWarnings = []
const timer = new THREE.Timer()
let started = false
let ended = false
let score = 0
let elapsed = 0
let spawnTimer = 0
let regularObstacleTimer = 0
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

function scheduleRegularObstacle() {
  const position = randomArenaPosition(GAME.obstacleMinDistance)
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(ENTITIES.regularSpawnRingInnerRadius, ENTITIES.regularSpawnRingOuterRadius, ENTITIES.regularSpawnRingSegments),
    new THREE.MeshBasicMaterial({ color: COLORS.regularSpawnRing, transparent: true, opacity: ANIMATION.regularSpawnRingBaseOpacity, side: THREE.DoubleSide, depthWrite: false }),
  )
  ring.rotation.x = -Math.PI / 2
  ring.position.set(position.x, 0.03, position.z)
  scene.add(ring)
  regularSpawnWarnings.push({ ring, position, age: 0 })
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
  if (type === 'chaser') {
    const rangeIndicator = new THREE.Mesh(
      new THREE.RingGeometry(obstacleType.range - ENTITIES.chaserRangeIndicatorWidth, obstacleType.range, ENTITIES.chaserRangeIndicatorSegments),
      new THREE.MeshBasicMaterial({ color: COLORS.chaser, transparent: true, opacity: ANIMATION.chaserRangeIndicatorBaseOpacity, side: THREE.DoubleSide, depthWrite: false }),
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
}

function clearObjects(objects) {
  for (const object of objects) scene.remove(object)
  objects.length = 0
}

function resetGame() {
  clearObjects(cells)
  for (const obstacle of obstacles) scene.remove(obstacle, obstacle.userData.rangeIndicator)
  obstacles.length = 0
  for (const fallingObstacle of fallingObstacles) scene.remove(fallingObstacle.obstacle, fallingObstacle.shadow, fallingObstacle.targetRing)
  fallingObstacles.length = 0
  for (const warning of regularSpawnWarnings) scene.remove(warning.ring)
  regularSpawnWarnings.length = 0
  player.position.set(0, GAME.playerStartHeight, 0)
  score = 0
  elapsed = 0
  spawnTimer = 0
  regularObstacleTimer = 0
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
      scene.remove(cell)
      cells.splice(index, 1)
      score += 1
      addCell()
    }
  }

  for (let index = obstacles.length - 1; index >= 0; index -= 1) {
    const obstacle = obstacles[index]
    const obstacleType = OBSTACLE_TYPES[obstacle.userData.type]
    if (obstacle.userData.type === 'regular') {
      obstacle.userData.age += delta
      if (obstacle.userData.age > GAME.regularObstacleLifetime) {
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
    if (obstacle.position.distanceTo(player.position) < GAME.playerRadius) endGame()
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

  for (let index = regularSpawnWarnings.length - 1; index >= 0; index -= 1) {
    const warning = regularSpawnWarnings[index]
    warning.age += delta
    const progress = warning.age / GAME.regularObstacleSpawnWarningDuration
    const pulse = 1 + Math.sin(warning.age * ANIMATION.regularSpawnRingPulseSpeed) * ANIMATION.regularSpawnRingPulseAmount
    warning.ring.scale.setScalar((ANIMATION.regularSpawnRingBaseScale + progress * ANIMATION.regularSpawnRingScaleGrowth) * pulse)
    warning.ring.material.opacity = ANIMATION.regularSpawnRingBaseOpacity * (1 - progress)
    warning.ring.rotation.z -= delta * 2

    if (progress >= 1) {
      createObstacle(warning.position, 'regular')
      scene.remove(warning.ring)
      regularSpawnWarnings.splice(index, 1)
    }
  }

  spawnTimer += delta
  regularObstacleTimer += delta
  hazardTimer += delta
  if (spawnTimer > GAME.cellSpawnInterval) {
    addCell()
    spawnTimer = 0
  }
  if (regularObstacleTimer > GAME.regularObstacleSpawnInterval) {
    scheduleRegularObstacle()
    regularObstacleTimer = 0
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

startButton.addEventListener('click', () => {
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

function createStarLayer({ THREE, SCENE, count, size, opacity }) {
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  for (let index = 0; index < count; index += 1) {
    const y = THREE.MathUtils.randFloatSpread(2)
    const horizontal = Math.sqrt(1 - y * y)
    const angle = Math.random() * Math.PI * 2
    const offset = index * 3
    positions[offset] = Math.cos(angle) * horizontal * SCENE.starfieldRadius
    positions[offset + 1] = y * SCENE.starfieldRadius
    positions[offset + 2] = Math.sin(angle) * horizontal * SCENE.starfieldRadius
    const warmth = Math.random()
    colors[offset] = 0.72 + warmth * 0.28
    colors[offset + 1] = 0.82 + warmth * 0.18
    colors[offset + 2] = 1
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const stars = new THREE.Points(geometry, new THREE.PointsMaterial({ size, sizeAttenuation: false, transparent: true, opacity, vertexColors: true, depthWrite: false, fog: false }))
  stars.frustumCulled = false
  return stars
}

function createGridGeometry(THREE, limit) {
  const points = []
  const segments = 80
  for (let radius = 2; radius < limit; radius += 2) {
    for (let index = 0; index < segments; index += 1) {
      const startAngle = index / segments * Math.PI * 2
      const endAngle = (index + 1) / segments * Math.PI * 2
      points.push(new THREE.Vector3(Math.cos(startAngle) * radius, 0.01, Math.sin(startAngle) * radius), new THREE.Vector3(Math.cos(endAngle) * radius, 0.01, Math.sin(endAngle) * radius))
    }
  }
  for (let index = 0; index < 12; index += 1) {
    const angle = index / 12 * Math.PI * 2
    points.push(new THREE.Vector3(), new THREE.Vector3(Math.cos(angle) * limit, 0.01, Math.sin(angle) * limit))
  }
  return new THREE.BufferGeometry().setFromPoints(points)
}

function createBoundaryGeometry(THREE, limit) {
  return new THREE.BufferGeometry().setFromPoints(Array.from({ length: 96 }, (_, index) => {
    const angle = index / 96 * Math.PI * 2
    return new THREE.Vector3(Math.cos(angle) * limit, 0.04, Math.sin(angle) * limit)
  }))
}

export function createArenaVisuals({ THREE, scene, COLORS, GAME, SCENE, LIGHTING }) {
  const starfield = new THREE.Group()
  starfield.add(createStarLayer({ THREE, SCENE, count: SCENE.starCount, size: SCENE.starSize, opacity: 0.84 }))
  starfield.add(createStarLayer({ THREE, SCENE, count: SCENE.brightStarCount, size: SCENE.brightStarSize, opacity: 0.96 }))
  scene.add(starfield)

  scene.add(new THREE.HemisphereLight(LIGHTING.hemisphereSky, LIGHTING.hemisphereGround, LIGHTING.hemisphereIntensity))
  const keyLight = new THREE.DirectionalLight(LIGHTING.key, LIGHTING.keyIntensity)
  keyLight.position.set(-7, 13, 5); keyLight.castShadow = true; keyLight.shadow.mapSize.set(1024, 1024); scene.add(keyLight)

  const floor = new THREE.Mesh(new THREE.CircleGeometry(GAME.arenaSize / 2, 96), new THREE.MeshStandardMaterial({ color: COLORS.floor, metalness: SCENE.floorMetalness, roughness: SCENE.floorRoughness, transparent: true, opacity: SCENE.floorOpacity, depthWrite: false }))
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor)
  const grid = new THREE.LineSegments(createGridGeometry(THREE, GAME.arenaLimit), new THREE.LineBasicMaterial({ color: COLORS.gridMinor, transparent: true, opacity: 0.8 }))
  grid.position.y = 0.01; scene.add(grid)
  const arenaBoundary = new THREE.LineLoop(createBoundaryGeometry(THREE, GAME.arenaLimit), new THREE.LineDashedMaterial({ color: COLORS.arenaBoundary, dashSize: 0.45, gapSize: 0.2 }))
  arenaBoundary.computeLineDistances(); scene.add(arenaBoundary)

  return {
    starfield, floor, grid, arenaBoundary,
    resize(extraPadding) {
      const limit = GAME.arenaLimit + extraPadding
      floor.geometry.dispose(); floor.geometry = new THREE.CircleGeometry(GAME.arenaSize / 2 + extraPadding, 96)
      grid.geometry.dispose(); grid.geometry = createGridGeometry(THREE, limit)
      arenaBoundary.geometry.dispose(); arenaBoundary.geometry = createBoundaryGeometry(THREE, limit); arenaBoundary.computeLineDistances()
    },
  }
}

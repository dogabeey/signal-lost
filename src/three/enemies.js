export function createEnemyVisualFactory({ THREE, ENTITIES }) {
  const coreGeometry = new THREE.IcosahedronGeometry(ENTITIES.obstacleCoreRadius, 1)
  const spikeGeometry = new THREE.ConeGeometry(ENTITIES.obstacleSpikeRadius, ENTITIES.obstacleSpikeHeight, ENTITIES.obstacleSpikeSegments)
  const chaserSpikeGeometry = new THREE.ConeGeometry(ENTITIES.obstacleSpikeRadius * 0.72, ENTITIES.obstacleSpikeHeight * 0.7, ENTITIES.obstacleSpikeSegments)
  const chaserTipGeometry = new THREE.ConeGeometry(ENTITIES.obstacleSpikeRadius * 0.27, ENTITIES.obstacleSpikeHeight * 0.22, ENTITIES.obstacleSpikeSegments)
  const creeperTipGeometry = new THREE.ConeGeometry(ENTITIES.obstacleSpikeRadius * 0.32, ENTITIES.obstacleSpikeHeight * 0.27, ENTITIES.obstacleSpikeSegments)
  const shooterSpikeGeometry = new THREE.CylinderGeometry(ENTITIES.obstacleSpikeRadius * 0.32, ENTITIES.obstacleSpikeRadius, ENTITIES.obstacleSpikeHeight * 0.82, ENTITIES.obstacleSpikeSegments)
  const shooterSocketGeometry = new THREE.CircleGeometry(ENTITIES.obstacleSpikeRadius * 0.32, ENTITIES.obstacleSpikeSegments)
  const chaserTipMaterial = new THREE.MeshStandardMaterial({ color: '#ff3b30', emissive: '#8c0b06', emissiveIntensity: 1.7, metalness: 0.35, roughness: 0.28 })
  const creeperTipMaterial = new THREE.MeshStandardMaterial({ color: '#c88cff', emissive: '#7a18ff', emissiveIntensity: 1.75, metalness: 0.2, roughness: 0.22 })
  const shooterSocketMaterial = new THREE.MeshBasicMaterial({ color: '#050505', side: THREE.DoubleSide })
  const chaserDirections = [
    [0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1],
    [1, 1, 1], [-1, 1, 1], [1, 1, -1], [-1, 1, -1], [1, -1, 1], [-1, -1, 1], [1, -1, -1], [-1, -1, -1],
    [0, 1, 2], [0, 1, -2], [0, -1, 2], [0, -1, -2], [1, 2, 0], [-1, 2, 0], [1, -2, 0], [-1, -2, 0], [2, 0, 1], [-2, 0, 1], [2, 0, -1], [-2, 0, -1],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z).normalize())
  const spikeDirections = [
    [0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1],
    [1, 1, 1], [-1, 1, 1], [1, 1, -1], [-1, 1, -1], [1, -1, 1], [-1, -1, 1], [1, -1, -1], [-1, -1, -1],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z).normalize())
  const upDirection = new THREE.Vector3(0, 1, 0)

  return function createSpikedEnemy(material, type = 'regular') {
    const enemy = new THREE.Group()
    const core = new THREE.Mesh(coreGeometry, material)
    core.castShadow = true
    enemy.add(core)
    const spikes = []
    const creeperTipMaterials = []
    const directions = type === 'chaser' ? chaserDirections : spikeDirections
    for (const [index, direction] of directions.entries()) {
      const spikeHeight = type === 'chaser' ? ENTITIES.obstacleSpikeHeight * 0.7 : ENTITIES.obstacleSpikeHeight
      const spikeRoot = new THREE.Group()
      spikeRoot.position.copy(direction).multiplyScalar(ENTITIES.obstacleCoreRadius + spikeHeight * 0.28)
      spikeRoot.quaternion.setFromUnitVectors(upDirection, direction)
      const baseQuaternion = spikeRoot.quaternion.clone()
      const spike = new THREE.Mesh(type === 'chaser' ? chaserSpikeGeometry : type === 'shooter' ? shooterSpikeGeometry : spikeGeometry, material)
      spike.castShadow = true
      spikeRoot.add(spike)
      if (type === 'chaser') {
        const tip = new THREE.Mesh(chaserTipGeometry, chaserTipMaterial)
        tip.position.y = spikeHeight * 0.43
        tip.castShadow = true
        spikeRoot.add(tip)
      }
      if (type === 'creeper' || type === 'poisonCreeper') {
        const tipMaterial = creeperTipMaterial.clone()
        const tip = new THREE.Mesh(creeperTipGeometry, tipMaterial)
        tip.position.y = spikeHeight * 0.47
        tip.castShadow = true
        spikeRoot.add(tip)
        creeperTipMaterials.push(tipMaterial)
      }
      if (type === 'shooter') {
        const socket = new THREE.Mesh(shooterSocketGeometry, shooterSocketMaterial)
        socket.rotation.x = -Math.PI / 2
        socket.position.y = spikeHeight * 0.41 + 0.002
        spikeRoot.add(socket)
      }
      spikes.push({ root: spikeRoot, baseQuaternion, phase: index * 1.71 })
      enemy.add(spikeRoot)
    }
    enemy.userData.material = material
    enemy.userData.spikes = spikes
    enemy.userData.creeperTipMaterials = creeperTipMaterials
    return enemy
  }
}

export function createUltimateEnemyVisual(THREE) {
  const ship = new THREE.Group()
  const hull = new THREE.MeshStandardMaterial({ color: '#151021', emissive: '#3b0d72', emissiveIntensity: 1.8, metalness: 0.82, roughness: 0.2 })
  const carapace = new THREE.MeshStandardMaterial({ color: '#372052', emissive: '#6b1caa', emissiveIntensity: 1.3, metalness: 0.6, roughness: 0.26 })
  const eyeMaterial = new THREE.MeshStandardMaterial({ color: '#d9ff6a', emissive: '#9dff15', emissiveIntensity: 3.8, metalness: 0.18, roughness: 0.18 })
  const mouthMaterial = new THREE.MeshBasicMaterial({ color: '#06030a' })
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.66, 12, 8), hull)
  body.scale.set(1.5, 0.62, 1.05)
  body.castShadow = true
  ship.add(body)
  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.72, 0.64, 6), carapace)
  crown.rotation.x = Math.PI / 2
  crown.position.z = -0.23
  crown.castShadow = true
  ship.add(crown)
  const eyeSocket = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 7), mouthMaterial)
  eyeSocket.scale.set(1.45, 0.72, 0.3)
  eyeSocket.position.set(0, 0.04, 0.72)
  ship.add(eyeSocket)
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), eyeMaterial)
  eye.scale.set(1.55, 0.7, 0.32)
  eye.position.set(0, 0.04, 0.79)
  ship.add(eye)
  const mandibles = []
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.45, 4), carapace)
    wing.position.set(side * 0.93, -0.04, -0.08)
    wing.rotation.set(0, side * Math.PI / 2, side * 0.48)
    wing.castShadow = true
    ship.add(wing)
    const mandible = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.92, 5), eyeMaterial)
    mandible.position.set(side * 0.5, -0.16, 0.78)
    mandible.rotation.set(side * 0.42, 0, side * 0.26)
    ship.add(mandible)
    mandibles.push(mandible)
  }
  for (let index = 0; index < 4; index += 1) {
    const spine = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.58, 5), carapace)
    spine.position.set((index - 1.5) * 0.3, 0.34, -0.42)
    spine.rotation.x = -Math.PI / 2.9
    ship.add(spine)
  }
  ship.userData.eyeMaterial = eyeMaterial
  ship.userData.mandibles = mandibles
  return ship
}

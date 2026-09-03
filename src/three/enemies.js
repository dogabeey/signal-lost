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

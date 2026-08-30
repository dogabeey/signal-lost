export function createEnemyVisualFactory({ THREE, ENTITIES }) {
  const coreGeometry = new THREE.IcosahedronGeometry(ENTITIES.obstacleCoreRadius, 1)
  const spikeGeometry = new THREE.ConeGeometry(ENTITIES.obstacleSpikeRadius, ENTITIES.obstacleSpikeHeight, ENTITIES.obstacleSpikeSegments)
  const spikeDirections = [
    [0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1],
    [1, 1, 1], [-1, 1, 1], [1, 1, -1], [-1, 1, -1], [1, -1, 1], [-1, -1, 1], [1, -1, -1], [-1, -1, -1],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z).normalize())
  const upDirection = new THREE.Vector3(0, 1, 0)

  return function createSpikedEnemy(material) {
    const enemy = new THREE.Group()
    const core = new THREE.Mesh(coreGeometry, material)
    core.castShadow = true
    enemy.add(core)
    for (const direction of spikeDirections) {
      const spike = new THREE.Mesh(spikeGeometry, material)
      spike.position.copy(direction).multiplyScalar(ENTITIES.obstacleCoreRadius + ENTITIES.obstacleSpikeHeight * 0.28)
      spike.quaternion.setFromUnitVectors(upDirection, direction)
      spike.castShadow = true
      enemy.add(spike)
    }
    enemy.userData.material = material
    return enemy
  }
}

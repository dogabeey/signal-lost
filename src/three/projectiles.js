export function createProjectileVisualFactory({ THREE, COLORS, ENTITIES }) {
  const shooterGeometry = new THREE.IcosahedronGeometry(ENTITIES.shooterProjectileRadius, 1)
  return {
    createShooterProjectile() {
      return new THREE.Mesh(shooterGeometry, new THREE.MeshStandardMaterial({ color: '#7dff9d', emissive: '#00ff5a', emissiveIntensity: 4, metalness: 0.25, roughness: 0.16 }))
    },
    createAutocannonProjectile() {
      return new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff1a6', transparent: true, opacity: 0.95 }))
    },
    createSplinter() {
      return new THREE.Mesh(new THREE.TetrahedronGeometry(0.32), new THREE.MeshStandardMaterial({ color: COLORS.splinter, emissive: COLORS.splinterEmissive, emissiveIntensity: 1.3, metalness: 0.4, roughness: 0.3 }))
    },
  }
}

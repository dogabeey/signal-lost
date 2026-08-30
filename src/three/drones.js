export function createDroneVisual(THREE) {
  const drone = new THREE.Group()
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: '#314c63', emissive: '#79caff', emissiveIntensity: 0.8, metalness: 0.9, roughness: 0.18 })
  const glowMaterial = new THREE.MeshBasicMaterial({ color: '#baf8ff', transparent: true, opacity: 0.95, depthWrite: false })
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 7), bodyMaterial); body.scale.set(1.25, 0.55, 1.5); drone.add(body)
  const rotors = []
  for (const [x, z] of [[-0.22, -0.2], [0.22, -0.2], [-0.22, 0.2], [0.22, 0.2]]) { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.035, 0.13), bodyMaterial); arm.position.set(x, 0, z); const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.018, 12), glowMaterial); rotor.position.set(x, 0.045, z); drone.add(arm, rotor); rotors.push(rotor) }
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), glowMaterial); eye.position.set(0, 0.015, 0.2); drone.add(eye); drone.userData.rotors = rotors
  return drone
}

export function createEffectVisualFactory({ THREE, COLORS }) {
  function ring(inner, outer, segments, color, opacity = 1) {
    const mesh = new THREE.Mesh(new THREE.RingGeometry(inner, outer, segments), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false }))
    mesh.rotation.x = -Math.PI / 2
    return mesh
  }
  return {
    createExplosion(position, radius) {
      const shockwave = ring(0.18, 0.42, 64, COLORS.banger)
      shockwave.position.set(position.x, 0.05, position.z)
      const blast = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: COLORS.banger, transparent: true, opacity: 0.65, wireframe: true, depthWrite: false }))
      blast.position.set(position.x, 0.85, position.z)
      const light = new THREE.PointLight(COLORS.banger, 10, radius * 2); light.position.copy(blast.position)
      return { shockwave, blast, light }
    },
    createBangerPulse(position) {
      const pulse = ring(0.22, 0.42, 48, COLORS.banger, 0.9); pulse.position.set(position.x, 0.06, position.z); return pulse
    },
    createShockwave(origin) {
      const shockwave = ring(0.2, 0.42, 64, COLORS.slowAura, 0.95); shockwave.position.set(origin.x, 0.07, origin.z); return shockwave
    },
    createPlayerDeath(position) {
      const flash = new THREE.Mesh(new THREE.SphereGeometry(0.95, 24, 16), new THREE.MeshBasicMaterial({ color: '#fff4cf', transparent: true, opacity: 1, depthWrite: false })); flash.position.copy(position)
      const blast = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 2), new THREE.MeshBasicMaterial({ color: COLORS.playerRing, transparent: true, opacity: 0.95, wireframe: true, depthWrite: false })); blast.position.copy(position)
      const shockwave = ring(0.24, 0.5, 64, COLORS.player); shockwave.position.set(position.x, 0.06, position.z)
      const innerShockwave = shockwave.clone(); innerShockwave.material = shockwave.material.clone()
      const light = new THREE.PointLight('#fff4cf', 22, 18); light.position.copy(position)
      const fragments = Array.from({ length: 18 }, () => {
        const fragment = new THREE.Mesh(new THREE.TetrahedronGeometry(THREE.MathUtils.randFloat(0.08, 0.19), 0), new THREE.MeshBasicMaterial({ color: Math.random() > 0.45 ? COLORS.playerRing : COLORS.player, transparent: true, opacity: 1, depthWrite: false }))
        fragment.position.copy(position)
        fragment.userData.velocity = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.75 + 0.18, Math.random() - 0.5).normalize().multiplyScalar(THREE.MathUtils.randFloat(4, 10))
        return fragment
      })
      return { flash, blast, shockwave, innerShockwave, light, fragments }
    },
  }
}

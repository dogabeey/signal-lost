export function createPlayerShip({ THREE, COLORS, ENTITIES, GAME }) {
  const player = new THREE.Group()
  const playerCore = new THREE.Mesh(
    new THREE.ConeGeometry(0.58, 1.45, 6),
    new THREE.MeshStandardMaterial({ color: COLORS.player, emissive: COLORS.playerEmissive, emissiveIntensity: ENTITIES.playerCoreEmissiveIntensity, metalness: 0.78, roughness: 0.18 }),
  )
  playerCore.rotation.x = Math.PI / 2
  playerCore.position.y = 0.18
  playerCore.castShadow = true
  player.add(playerCore)

  const wingMaterial = new THREE.MeshStandardMaterial({ color: '#f6b05c', emissive: '#b9502d', emissiveIntensity: 0.55, metalness: 0.85, roughness: 0.16 })
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.08, 0.58), wingMaterial)
    wing.position.set(side * 0.52, 0.12, -0.08)
    wing.rotation.z = side * -0.16
    wing.castShadow = true
    player.add(wing)
  }

  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.29, 12, 8), new THREE.MeshStandardMaterial({ color: '#76ddff', emissive: '#267ca0', emissiveIntensity: 1.25, metalness: 0.92, roughness: 0.08 }))
  cockpit.scale.set(0.82, 0.62, 1.15)
  cockpit.position.set(0, 0.38, 0.18)
  player.add(cockpit)

  const engineRing = new THREE.Mesh(new THREE.TorusGeometry(0.3, ENTITIES.playerRingTube * 0.72, ENTITIES.playerRingRadialSegments, ENTITIES.playerRingTubularSegments), new THREE.MeshBasicMaterial({ color: COLORS.playerRing, transparent: true, opacity: 0.88 }))
  engineRing.position.set(0, 0.17, -0.67)
  player.add(engineRing)

  const flame = new THREE.Group()
  const outerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.82, 8), new THREE.MeshBasicMaterial({ color: '#ff5c32', transparent: true, opacity: 0.74, depthWrite: false }))
  const innerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.57, 8), new THREE.MeshBasicMaterial({ color: '#ffe781', transparent: true, opacity: 0.94, depthWrite: false }))
  for (const layer of [outerFlame, innerFlame]) layer.rotation.x = -Math.PI / 2
  innerFlame.position.z = -0.08
  flame.add(outerFlame, innerFlame)
  flame.position.set(0, 0.17, -0.93)
  player.add(flame)

  const slowAuraRing = new THREE.Mesh(new THREE.RingGeometry(1 - ENTITIES.slowAuraRingWidth, 1, ENTITIES.slowAuraRingSegments), new THREE.MeshBasicMaterial({ color: COLORS.slowAura, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }))
  slowAuraRing.rotation.x = -Math.PI / 2
  slowAuraRing.position.y = -GAME.playerStartHeight + 0.04
  slowAuraRing.visible = false
  player.add(slowAuraRing)

  const shieldBubble = new THREE.Mesh(new THREE.SphereGeometry(GAME.playerRadius * 1.15, 20, 14), new THREE.MeshBasicMaterial({ color: COLORS.slowAura, transparent: true, opacity: 0.18, wireframe: true, depthWrite: false }))
  shieldBubble.visible = false
  player.add(shieldBubble)
  player.position.y = GAME.playerStartHeight

  return {
    player, playerCore, slowAuraRing, shieldBubble,
    updateVisuals(delta, total, ringSpinSpeed) {
      engineRing.rotation.z += delta * ringSpinSpeed
      const flamePulse = 0.9 + Math.sin(total * 20) * 0.12 + Math.sin(total * 33) * 0.06
      flame.scale.set(1, 1, flamePulse)
      outerFlame.material.opacity = 0.62 + Math.sin(total * 17) * 0.12
      innerFlame.material.opacity = 0.8 + Math.sin(total * 23) * 0.14
    },
  }
}

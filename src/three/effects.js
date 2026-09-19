// Gameplay owns short-lived lights and lifetimes; Quarks owns all particle motion.
export function createEffectVisualFactory({ THREE, Quarks, particleRenderer, COLORS, getQuality = () => 'high' }) {
  const density = () => ({ low: 0.45, medium: 0.7, high: 1 }[getQuality()] ?? 1)
  const qualityCount = (count) => Math.max(1, Math.round(count * density()))
  const colorVector = (color, alpha = 1) => {
    const value = new THREE.Color(color)
    return new Quarks.Vector4(value.r, value.g, value.b, alpha)
  }
  const colorVector3 = (color) => {
    const value = new THREE.Color(color)
    return new Quarks.Vector3(value.r, value.g, value.b)
  }
  const poisonResidueTexture = (() => {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const context = canvas.getContext('2d')
    const gradient = context.createRadialGradient(64, 64, 9, 64, 64, 64)
    gradient.addColorStop(0, 'rgba(255,255,255,0.9)')
    gradient.addColorStop(0.58, 'rgba(255,255,255,0.68)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, 128, 128)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  })()

  function createParticles({ position, color, count, life, size, speed, radius = 0, gravity = 0, duration = 0.05, texture = null, renderMode = Quarks.RenderMode.BillBoard }) {
    const material = new THREE.MeshBasicMaterial({ color, map: texture, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true })
    const system = new Quarks.ParticleSystem({
      autoDestroy: true,
      looping: false,
      duration,
      shape: new Quarks.SphereEmitter({ radius, thickness: 1 }),
      startLife: new Quarks.IntervalValue(life * 0.72, life),
      startSpeed: new Quarks.IntervalValue(speed * 0.65, speed),
      startSize: new Quarks.IntervalValue(size * 0.55, size),
      startColor: new Quarks.ColorRange(colorVector(color, 0.95), colorVector('#ffffff', 0.7)),
      emissionBursts: [{ time: 0, count: new Quarks.ConstantValue(qualityCount(count)), cycle: 1, interval: 0.01, probability: 1 }],
      behaviors: [
        new Quarks.ColorOverLife(new Quarks.Gradient(
          [[colorVector3(color), 0], [colorVector3(color), 0.55], [colorVector3(color), 1]],
          [[0.95, 0], [0.55, 0.55], [0, 1]],
        )),
        ...(gravity ? [new Quarks.ApplyForce(new Quarks.Vector3(0, -1, 0), new Quarks.ConstantValue(gravity))] : []),
      ],
      material,
      renderMode,
      worldSpace: true,
    })
    system.emitter.position.copy(position)
    particleRenderer.addSystem(system)
    return system.emitter
  }

  function createLight(position, color, intensity, distance) {
    const light = new THREE.PointLight(color, intensity, distance)
    light.position.copy(position)
    return light
  }

  return {
    createExplosion(position, radius) {
      const emitter = createParticles({ position, color: COLORS.banger, count: 30, life: 0.48, size: Math.max(0.12, radius * 0.34), speed: Math.max(2.4, radius * 4), radius: radius * 0.18 })
      return { emitters: [emitter], light: createLight(position, COLORS.banger, 10, radius * 2) }
    },
    createBangerPulse(position) {
      const pulse = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.42, 48), new THREE.MeshBasicMaterial({ color: COLORS.banger, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }))
      pulse.rotation.x = -Math.PI / 2
      pulse.position.set(position.x, 0.06, position.z)
      return pulse
    },
    createShockwave(origin) {
      const shockwave = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.42, 64), new THREE.MeshBasicMaterial({ color: COLORS.slowAura, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false }))
      shockwave.rotation.x = -Math.PI / 2
      shockwave.position.set(origin.x, 0.07, origin.z)
      return shockwave
    },
    createShieldBreak(position) {
      const emitter = createParticles({ position, color: '#8cfff0', count: 38, life: 0.55, size: 0.19, speed: 5.4, radius: 0.22 })
      return { emitters: [emitter], light: createLight(position, '#63f5cd', 12, 10) }
    },
    createPoisonTrail(position, radius, duration) {
      const residuePosition = position.clone()
      residuePosition.y = 0.045
      const emitter = createParticles({ position: residuePosition, color: COLORS.poisonTrail, count: 7, life: duration, size: radius * 1.35, speed: 0, radius: radius * 0.56, duration: 0.05, texture: poisonResidueTexture, renderMode: Quarks.RenderMode.HorizontalBillBoard })
      return { emitters: [emitter] }
    },
    createPlayerDeath(position) {
      const emitter = createParticles({ position, color: COLORS.playerRing, count: 64, life: 0.9, size: 0.22, speed: 8.8, radius: 0.2, gravity: 5 })
      const coreEmitter = createParticles({ position, color: '#fff4cf', count: 22, life: 0.32, size: 0.4, speed: 3.2, radius: 0.05 })
      return { emitters: [emitter, coreEmitter], light: createLight(position, '#fff4cf', 22, 18) }
    },
  }
}

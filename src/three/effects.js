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

  function createParticles({ position, color, count, life, size, speed, radius = 0, gravity = 0, duration = 0.05, texture = null, renderMode = Quarks.RenderMode.BillBoard, instancingGeometry, sizeOverLife, looping = false, emissionRate = 0, force = null }) {
    const material = new THREE.MeshBasicMaterial({ color, map: texture, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true })
    const system = new Quarks.ParticleSystem({
      autoDestroy: !looping,
      looping,
      duration,
      shape: new Quarks.SphereEmitter({ radius, thickness: 1 }),
      startLife: new Quarks.IntervalValue(life * 0.72, life),
      startSpeed: new Quarks.IntervalValue(speed * 0.65, speed),
      startSize: new Quarks.IntervalValue(size * 0.55, size),
      startColor: new Quarks.ColorRange(colorVector(color, 0.95), colorVector('#ffffff', 0.7)),
      emissionOverTime: emissionRate ? new Quarks.ConstantValue(qualityCount(emissionRate)) : undefined,
      emissionBursts: emissionRate ? [] : [{ time: 0, count: new Quarks.ConstantValue(qualityCount(count)), cycle: 1, interval: 0.01, probability: 1 }],
      behaviors: [
        new Quarks.ColorOverLife(new Quarks.Gradient(
          [[colorVector3(color), 0], [colorVector3(color), 0.55], [colorVector3(color), 1]],
          [[0.95, 0], [0.55, 0.55], [0, 1]],
        )),
        ...(gravity ? [new Quarks.ApplyForce(new Quarks.Vector3(0, -1, 0), new Quarks.ConstantValue(gravity))] : []),
        ...(force ? [new Quarks.ApplyForce(force.direction, new Quarks.ConstantValue(force.magnitude))] : []),
        ...(sizeOverLife ? [new Quarks.SizeOverLife(sizeOverLife)] : []),
      ],
      material,
      renderMode,
      ...(instancingGeometry ? { instancingGeometry } : {}),
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
      const expansion = new Quarks.PiecewiseBezier([
        [new Quarks.Bezier(0.05, radius, radius, radius), 0],
        [new Quarks.Bezier(radius, radius, radius, radius), 0.18],
      ])
      const emitter = createParticles({
        position,
        color: COLORS.banger,
        count: 1,
        life: 0.65,
        size: 1,
        speed: 0,
        instancingGeometry: new THREE.SphereGeometry(1, 16, 12),
        renderMode: Quarks.RenderMode.Mesh,
        sizeOverLife: expansion,
      })
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
    createFieryRockFire(position, radius) {
      const firePosition = position.clone()
      firePosition.y = 0.08
      const flames = createParticles({ position: firePosition, color: COLORS.fire, count: 0, life: 0.7, size: radius * 0.55, speed: 0.28, radius: radius * 0.55, duration: 1, looping: true, emissionRate: 14, force: { direction: new Quarks.Vector3(0, 1, 0), magnitude: 1.25 } })
      const embers = createParticles({ position: firePosition, color: '#ffe19a', count: 0, life: 1.15, size: 0.075, speed: 0.62, radius: radius * 0.48, duration: 1, looping: true, emissionRate: 7, force: { direction: new Quarks.Vector3(0, 1, 0), magnitude: 0.72 } })
      return { emitters: [flames, embers], light: createLight(new THREE.Vector3(position.x, 1.2, position.z), COLORS.fire, 5.5, radius * 3) }
    },
    createFallingRockImpact(position, radius, color) {
      const impactPosition = position.clone()
      impactPosition.y = 0.08
      const dust = createParticles({ position: impactPosition, color: '#d9c7a0', count: 26, life: 0.62, size: radius * 0.42, speed: radius * 2.8, radius: radius * 0.24, force: { direction: new Quarks.Vector3(0, 1, 0), magnitude: 0.28 } })
      const shards = createParticles({ position: impactPosition, color, count: 18, life: 0.48, size: radius * 0.13, speed: radius * 5, radius: radius * 0.12, gravity: 7, instancingGeometry: new THREE.TetrahedronGeometry(1, 0), renderMode: Quarks.RenderMode.Mesh })
      return { emitters: [dust, shards] }
    },
  }
}

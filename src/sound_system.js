export function createSoundSystem({ THREE, SOUND, getSettings, getPlayer, getCamera }) {
  let context
  let masterGain
  const buffers = new Map()
  let soundLoadPromise

  async function loadSound(name, url) {
    try {
      const response = await fetch(url)
      if (!response.ok) return
      buffers.set(name, await context.decodeAudioData(await response.arrayBuffer()))
    } catch {}
  }

  function initialize() {
    if (!context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!AudioContext) return Promise.resolve()
      context = new AudioContext()
      masterGain = context.createGain()
      setMasterVolume(true)
      masterGain.connect(context.destination)
      soundLoadPromise = Promise.all(Object.entries(SOUND.assets).map(([name, url]) => loadSound(name, url)))
    }
    const resumePromise = context.state === 'suspended' ? context.resume() : Promise.resolve()
    return Promise.all([resumePromise, soundLoadPromise])
  }

  function setMasterVolume(immediate = false) {
    if (!masterGain || !context) return
    const settings = getSettings()
    const volume = SOUND.masterVolume * (settings.sound.muted ? 0 : settings.sound.masterVolume / 100)
    if (immediate) masterGain.gain.value = volume
    else masterGain.gain.setTargetAtTime(volume, context.currentTime, 0.03)
  }

  function getSpatialMix(sourcePosition) {
    const offset = sourcePosition.clone().sub(getPlayer().position)
    offset.y = 0
    const distance = offset.length()
    const attenuation = THREE.MathUtils.lerp(SOUND.spatialMinGain, 1, (1 - THREE.MathUtils.clamp(distance / SOUND.spatialMaxDistance, 0, 1)) ** 2)
    if (distance === 0) return { attenuation, pan: 0 }
    const cameraRight = new THREE.Vector3(1, 0, 0).applyQuaternion(getCamera().quaternion)
    cameraRight.y = 0
    cameraRight.normalize()
    return { attenuation, pan: THREE.MathUtils.clamp(offset.normalize().dot(cameraRight), -1, 1) }
  }

  function connectSpatialSource(source, volume, sourcePosition) {
    const gain = context.createGain()
    const spatialGain = context.createGain()
    const stereoPanner = context.createStereoPanner?.()
    const now = context.currentTime
    const settings = getSettings()
    const { attenuation, pan } = settings.sound.spatialAudio ? getSpatialMix(sourcePosition) : { attenuation: 1, pan: 0 }
    gain.gain.setValueAtTime(volume, now)
    spatialGain.gain.setValueAtTime(attenuation, now)
    source.connect(gain)
    gain.connect(spatialGain)
    if (stereoPanner) {
      stereoPanner.pan.setValueAtTime(pan, now)
      spatialGain.connect(stereoPanner)
      stereoPanner.connect(masterGain)
    } else spatialGain.connect(masterGain)
  }

  function playTone(startFrequency, endFrequency, duration, volume, sourcePosition, type) {
    if (!context || context.state !== 'running') return
    const oscillator = context.createOscillator()
    const now = context.currentTime
    oscillator.type = type
    oscillator.frequency.setValueAtTime(startFrequency, now)
    oscillator.frequency.linearRampToValueAtTime(endFrequency, now + duration)
    connectSpatialSource(oscillator, volume, sourcePosition)
    oscillator.start(now)
    oscillator.stop(now + duration)
  }

  function playFallingWhoosh(duration, volume, sourcePosition) {
    if (!context || context.state !== 'running') return
    const now = context.currentTime
    const noise = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate)
    const samples = noise.getChannelData(0)
    for (let index = 0; index < samples.length; index += 1) samples[index] = Math.random() * 2 - 1
    const source = context.createBufferSource()
    const filter = context.createBiquadFilter()
    const envelope = context.createGain()
    source.buffer = noise
    filter.type = 'bandpass'; filter.Q.value = 0.65
    filter.frequency.setValueAtTime(180, now); filter.frequency.exponentialRampToValueAtTime(720, now + duration)
    envelope.gain.setValueAtTime(0.0001, now); envelope.gain.exponentialRampToValueAtTime(1, now + 0.18); envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    source.connect(filter); filter.connect(envelope); connectSpatialSource(envelope, volume, sourcePosition); source.start(now)
  }

  function playImpactCrash(volume, sourcePosition) {
    if (!context || context.state !== 'running') return
    const now = context.currentTime
    const noise = context.createBuffer(1, Math.ceil(context.sampleRate * 0.24), context.sampleRate)
    const samples = noise.getChannelData(0)
    for (let index = 0; index < samples.length; index += 1) samples[index] = (Math.random() * 2 - 1) * (1 - index / samples.length)
    const source = context.createBufferSource(); const filter = context.createBiquadFilter(); const envelope = context.createGain()
    source.buffer = noise
    filter.type = 'lowpass'; filter.Q.value = 1.2
    filter.frequency.setValueAtTime(1500, now); filter.frequency.exponentialRampToValueAtTime(110, now + 0.24)
    envelope.gain.setValueAtTime(0.0001, now); envelope.gain.exponentialRampToValueAtTime(1, now + 0.012); envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.24)
    source.connect(filter); filter.connect(envelope); connectSpatialSource(envelope, volume, sourcePosition); source.start(now)
  }

  function playSound(name, volume, sourcePosition, fallback) {
    if (!context || context.state !== 'running') return
    const buffer = buffers.get(name)
    if (!buffer) { fallback(); return }
    const source = context.createBufferSource()
    source.buffer = buffer
    connectSpatialSource(source, volume, sourcePosition)
    source.start()
  }

  return {
    initialize,
    setMasterVolume,
    playBangerPulse(progress, position) { const fallback = SOUND.fallback.bangerPulse; const frequency = THREE.MathUtils.lerp(fallback.startFrequency, fallback.endFrequency, progress); playSound('bangerPulse', SOUND.bangerPulseVolume, position, () => playTone(frequency, frequency, fallback.duration, SOUND.bangerPulseVolume, position, fallback.type)) },
    playFallingObstacle(position) { const fallback = SOUND.fallback.fallingObstacle; playSound('fallingObstacle', SOUND.fallingObstacleVolume, position, () => playFallingWhoosh(fallback.duration, SOUND.fallingObstacleVolume, position)) },
    playCellCollect(position) { const fallback = SOUND.fallback.cellCollect; playSound('cellCollect', SOUND.cellCollectVolume, position, () => playTone(fallback.startFrequency, fallback.endFrequency, fallback.duration, SOUND.cellCollectVolume, position, fallback.type)) },
    playBoosterPickup(position, type) { const [start, end] = { speed: [480, 900], thorn: [220, 620], freezer: [720, 260] }[type]; playTone(start, end, 0.22, 0.3, position, type === 'freezer' ? 'sine' : 'triangle') },
    playShieldBreak(position) { playImpactCrash(0.52, position); playTone(180, 58, 0.2, 0.24, position, 'sawtooth') },
    playBuildingEffect(position, type) { const [start, end] = { chronoGenerator: [280, 360], autocannon: [220, 90], droneBay: [520, 760], barrierNode: [260, 440], overclockRelay: [440, 600], salvageExtractor: [180, 300] }[type]; playTone(start, end, 0.12, 0.16, position, 'sine') },
    playObstacleSummon(position) { const fallback = SOUND.fallback.obstacleSummon; playSound('obstacleSummon', SOUND.obstacleSummonVolume, position, () => playTone(fallback.startFrequency, fallback.endFrequency, fallback.duration, SOUND.obstacleSummonVolume, position, fallback.type)) },
    playButtonClick() { const fallback = SOUND.fallback.buttonClick; const position = getPlayer().position; playSound('buttonClick', SOUND.buttonClickVolume, position, () => playTone(fallback.startFrequency, fallback.endFrequency, fallback.duration, SOUND.buttonClickVolume, position, fallback.type)) },
  }
}

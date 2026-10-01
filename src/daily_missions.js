import { MARKET_JOURNAL_KEY, recoverMarketTransaction } from './market/repository.js'

export const MISSION_LIMIT = 9
export const DAILY_MISSION_COUNT = 3
export const WEEKLY_MISSION_TARGET = 15
const DAY = 86400000
const ISTANBUL_OFFSET = 3 * 3600000 // Europe/Istanbul: UTC+03, no daylight saving.

export const MISSION_TEMPLATES = [
  { id: 'travel-300', metric: 'travelDistance', target: 300 },
  { id: 'cells-100', metric: 'cells', target: 100 },
  { id: 'meteors-20', metric: 'dodgedMeteors', target: 20 },
  { id: 'survive-600', metric: 'playSeconds', target: 600 },
  { id: 'rounds-3', metric: 'longRounds', target: 3 },
  { id: 'stationary-180', metric: 'stationarySeconds', target: 180 },
  { id: 'creepers-10', metric: 'slowedCreepers', target: 10 },
  { id: 'bombers-3', metric: 'bomberEscapes', target: 3 },
  { id: 'chrono-5', metric: 'chronoPickups', target: 5 },
  { id: 'ranged-90', metric: 'rangedSeconds', target: 90 },
  { id: 'building-1', metric: 'buildingActions', target: 1 },
  { id: 'weapon-1', metric: 'weaponCards', target: 1 },
]

export function missionCalendar(now) {
  const day = Math.floor((now + ISTANBUL_OFFSET) / DAY)
  const weekday = new Date(day * DAY).getUTCDay()
  const week = day - (weekday + 6) % 7 // Monday midnight.
  return { day, week, nextDayAt: (day + 1) * DAY - ISTANBUL_OFFSET, nextWeekAt: (week + 7) * DAY - ISTANBUL_OFFSET }
}

export function getMissionReward(maxTier) {
  const tier = Math.min(9, Math.max(1, Math.floor(maxTier) || 1))
  return { aetherium: 5, chronoshards: 5 + (tier - 1) * 3 }
}

export function createMissionRepository({ storage, stateKey, aetheriumKey, chronoshardsKey, onReward = () => {} }) {
  return {
    read() {
      const recovering = storage.getItem(MARKET_JOURNAL_KEY) !== null
      recoverMarketTransaction(storage)
      if (recovering) { try { onReward() } catch {} }
      return JSON.parse(storage.getItem(stateKey) ?? 'null')
    },
    commit(state, reward) {
      recoverMarketTransaction(storage)
      const writes = [[stateKey, JSON.stringify(state)]]
      if (reward) {
        for (const [currency, key] of [['aetherium', aetheriumKey], ['chronoshards', chronoshardsKey]]) {
          const balance = Number(storage.getItem(key) ?? 0)
          if (!Number.isFinite(balance) || balance < 0) throw new Error('Invalid mission reward balance')
          writes.push([key, String(balance + reward[currency])])
        }
      }
      // State, removed mission/claimed chest and exact rewards commit together.
      storage.setItem(MARKET_JOURNAL_KEY, JSON.stringify({ version: 1, writes }))
      recoverMarketTransaction(storage)
      if (reward) { try { onReward() } catch { /* Persisted rewards remain authoritative. */ } }
    },
  }
}

export function createDailyMissions({ repository, now = Date.now, random = Math.random, getMaxTier = () => 1 }) {
  const stored = repository.read()
  let state = stored?.version === 1 ? stored : {
    version: 1, lastDay: null, serial: 0, missions: [], weekly: { week: null, completed: 0, claimed: false },
  }
  const listeners = new Set()
  const emit = () => { for (const listener of listeners) { try { listener() } catch {} } }
  const commit = (next, reward) => { repository.commit(next, reward); state = next; emit() }
  const choose = (items) => items[Math.min(items.length - 1, Math.floor(Math.max(0, random()) * items.length))]
  const generate = (next, count) => {
    const amount = Math.min(count, MISSION_LIMIT - next.missions.length)
    for (let index = 0; index < amount; index++) {
      const available = MISSION_TEMPLATES.filter((template) => !next.missions.some((mission) => mission.templateId === template.id))
      const template = choose(available)
      next.serial++
      next.missions.push({ id: `mission-${next.serial}`, templateId: template.id, metric: template.metric, target: template.target, progress: 0, isNew: true, completedWeek: null })
    }
    return amount
  }
  const complete = (next, mission) => {
    if (mission.progress >= mission.target && mission.completedWeek === null) {
      mission.completedWeek = next.weekly.week
      next.weekly.completed++
    }
  }
  const service = {
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    refresh() {
      const persisted = repository.read()
      if (persisted?.version === 1) state = persisted
      const calendar = missionCalendar(now())
      const next = structuredClone(state)
      let changed = false
      // Replace obsolete test tasks without manufacturing progress or altering earned weekly credit.
      const validIds = new Set(MISSION_TEMPLATES.map((template) => template.id))
      const obsoleteCount = next.missions.filter((mission) => !validIds.has(mission.templateId)).length
      if (obsoleteCount) {
        next.missions = next.missions.filter((mission) => validIds.has(mission.templateId))
        generate(next, obsoleteCount)
        changed = true
      }
      if (next.weekly.week === null || calendar.week > next.weekly.week) {
        next.weekly = { week: calendar.week, completed: 0, claimed: false }
        changed = true
      }
      let added = 0
      if (next.lastDay === null || calendar.day > next.lastDay) {
        const daysElapsed = next.lastDay === null ? 1 : calendar.day - next.lastDay
        added = generate(next, Math.min(MISSION_LIMIT, daysElapsed * DAILY_MISSION_COUNT))
        // Full days are consumed even when the queue is full: no deferred flood.
        next.lastDay = calendar.day
        changed = true
      }
      if (changed) commit(next)
      return added
    },
    getState() { return { ...structuredClone(state), calendar: missionCalendar(now()), reward: getMissionReward(getMaxTier()) } },
    getNotificationCount() { return state.missions.filter((mission) => mission.isNew || mission.progress >= mission.target).length },
    markSeen() {
      service.refresh()
      if (!state.missions.some((mission) => mission.isNew)) return
      const next = structuredClone(state)
      for (const mission of next.missions) mission.isNew = false
      commit(next)
    },
    record(metric, amount = 1, eventId) { service.recordBatch([{ metric, amount, eventId }]) },
    recordBatch(events) {
      if (!state.missions.some((mission) => mission.progress < mission.target && events.some((event) => event.metric === mission.metric || event.metric === 'roundSeconds' && mission.metric === 'longRounds'))) return
      service.refresh()
      const next = structuredClone(state)
      let changed = false
      for (const mission of next.missions) {
        if (mission.progress >= mission.target) continue
        for (const event of events) {
          if (!Number.isFinite(event.amount) || event.amount <= 0) continue
          if (event.metric === 'roundSeconds' && mission.metric === 'longRounds') {
            if (!event.eventId || mission.uniqueEvents?.includes(event.eventId)) continue
            if (mission.roundId !== event.eventId) { mission.roundId = event.eventId; mission.roundSeconds = 0 }
            mission.roundSeconds += event.amount
            changed = true
            if (mission.roundSeconds < 120 - 1e-7) continue
            mission.uniqueEvents ??= []
            mission.uniqueEvents.push(event.eventId)
            mission.progress++
          } else {
            if (mission.metric !== event.metric) continue
            if (event.eventId) {
              mission.uniqueEvents ??= []
              if (mission.uniqueEvents.includes(event.eventId)) continue
              mission.uniqueEvents.push(event.eventId)
            }
            mission.progress = Math.min(mission.target, mission.progress + event.amount)
            changed = true
          }
          complete(next, mission)
        }
      }
      if (changed) commit(next)
    },
    observeBomber(id, inside, canEscape = true) {
      if (!state.missions.some((mission) => mission.metric === 'bomberEscapes' && mission.progress < mission.target && !mission.uniqueEvents?.includes(id) && Boolean(mission.enteredBombers?.includes(id)) !== inside)) return
      service.refresh()
      const next = structuredClone(state)
      let changed = false
      for (const mission of next.missions) {
        if (mission.metric !== 'bomberEscapes' || mission.progress >= mission.target || mission.uniqueEvents?.includes(id)) continue
        mission.enteredBombers ??= []
        if (inside && !mission.enteredBombers.includes(id)) { mission.enteredBombers.push(id); changed = true }
        if (!inside && mission.enteredBombers.includes(id)) {
          mission.enteredBombers = mission.enteredBombers.filter((entry) => entry !== id)
          if (canEscape) {
            mission.uniqueEvents ??= []
            mission.uniqueEvents.push(id)
            mission.progress++
            complete(next, mission)
          }
          changed = true
        }
      }
      if (changed) commit(next)
    },
    triggerMidnight() {
      service.refresh()
      const next = structuredClone(state)
      const added = generate(next, DAILY_MISSION_COUNT)
      if (added) commit(next)
      return added
    },
    completeRandom() {
      service.refresh()
      const next = structuredClone(state)
      const available = next.missions.filter((mission) => mission.progress < mission.target)
      if (!available.length) return null
      const mission = choose(available)
      mission.progress = mission.target
      complete(next, mission)
      commit(next)
      return structuredClone(mission)
    },
    claimMission(id) {
      service.refresh()
      const mission = state.missions.find((item) => item.id === id)
      if (!mission || mission.progress < mission.target) return false
      const next = structuredClone(state)
      next.missions = next.missions.filter((item) => item.id !== id)
      commit(next, getMissionReward(getMaxTier()))
      return true
    },
    claimWeekly() {
      service.refresh()
      if (state.weekly.claimed || state.weekly.completed < WEEKLY_MISSION_TARGET) return false
      const next = structuredClone(state)
      next.weekly.claimed = true
      commit(next, { aetherium: 100, chronoshards: 100 })
      return true
    },
  }
  service.refresh()
  return service
}

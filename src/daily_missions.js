import { MARKET_JOURNAL_KEY, recoverMarketTransaction } from './market/repository.js'

export const MISSION_LIMIT = 9
export const DAILY_MISSION_COUNT = 3
export const WEEKLY_MISSION_TARGET = 15
const DAY = 86400000
const ISTANBUL_OFFSET = 3 * 3600000 // Europe/Istanbul: UTC+03, no daylight saving.

export const MISSION_TEMPLATES = [
  { id: 'cells-20', metric: 'cells', target: 20 },
  { id: 'cells-40', metric: 'cells', target: 40 },
  { id: 'cells-60', metric: 'cells', target: 60 },
  { id: 'chrono-2', metric: 'chronoPickups', target: 2 },
  { id: 'chrono-4', metric: 'chronoPickups', target: 4 },
  { id: 'chrono-6', metric: 'chronoPickups', target: 6 },
  { id: 'aetherium-1', metric: 'aetheriumPickups', target: 1 },
  { id: 'aetherium-2', metric: 'aetheriumPickups', target: 2 },
  { id: 'aetherium-3', metric: 'aetheriumPickups', target: 3 },
  { id: 'play-120', metric: 'playSeconds', target: 120 },
  { id: 'play-300', metric: 'playSeconds', target: 300 },
  { id: 'play-600', metric: 'playSeconds', target: 600 },
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
    record(metric, amount = 1) {
      if (!Number.isFinite(amount) || amount <= 0) return
      service.refresh()
      const next = structuredClone(state)
      let changed = false
      for (const mission of next.missions) {
        if (mission.metric !== metric || mission.progress >= mission.target) continue
        mission.progress = Math.min(mission.target, mission.progress + amount)
        complete(next, mission)
        changed = true
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

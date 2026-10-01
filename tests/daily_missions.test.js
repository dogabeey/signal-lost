import test from 'node:test'
import assert from 'node:assert/strict'
import { createDailyMissions, createMissionRepository, getMissionReward, missionCalendar } from '../src/daily_missions.js'
import { MARKET_JOURNAL_KEY } from '../src/market/repository.js'

class MemoryStorage {
  values = new Map()
  failKey = null
  getItem(key) { return this.values.get(key) ?? null }
  setItem(key, value) { if (key === this.failKey) throw new Error('Storage failure'); this.values.set(key, value) }
  removeItem(key) { this.values.delete(key) }
}
const DAY = 86400000
function setup({ time = Date.parse('2026-10-01T12:00:00+03:00'), tier = 1 } = {}) {
  const storage = new MemoryStorage()
  const repository = createMissionRepository({ storage, stateKey: 'missions', aetheriumKey: 'aetherium', chronoshardsKey: 'chronoshards' })
  const make = () => createDailyMissions({ repository, now: () => time, random: () => 0, getMaxTier: () => tier })
  return { storage, service: make(), reload: make, setTime: (value) => { time = value }, setTier: (value) => { tier = value } }
}

test('first login gets 3 distinct missions and reload does not add more', () => {
  const { service, reload } = setup()
  assert.equal(service.getState().missions.length, 3)
  assert.equal(new Set(service.getState().missions.map((m) => m.templateId)).size, 3)
  assert.equal(reload().getState().missions.length, 3)
})
test('three missions arrive at exactly Istanbul midnight, once per calendar day', () => {
  const before = Date.parse('2026-10-01T23:59:59.999+03:00')
  const { service, setTime } = setup({ time: before })
  assert.equal(service.refresh(), 0)
  setTime(before + 1)
  assert.equal(service.refresh(), 3)
  assert.equal(service.getState().missions.length, 6)
  assert.equal(service.refresh(), 0)
})
test('debug generation observes the 9-mission cap, including completed unclaimed missions', () => {
  const { service } = setup()
  assert.equal(service.triggerMidnight(), 3)
  assert.equal(service.triggerMidnight(), 3)
  assert.equal(service.triggerMidnight(), 0)
  service.completeRandom()
  assert.equal(service.triggerMidnight(), 0)
  assert.equal(service.getState().missions.length, 9)
})
test('partial capacity accepts only available slots and discarded daily arrivals never backfill', () => {
  const { service, setTime } = setup()
  service.triggerMidnight(); service.triggerMidnight()
  const mission = service.completeRandom()
  service.claimMission(mission.id)
  assert.equal(service.triggerMidnight(), 1)
  setTime(Date.parse('2026-10-02T00:00:00+03:00'))
  assert.equal(service.refresh(), 0)
  const next = service.completeRandom()
  service.claimMission(next.id)
  assert.equal(service.refresh(), 0)
  assert.equal(service.getState().missions.length, 8)
})
test('missed days catch up only to capacity and preserve unfinished progress', () => {
  const { service, setTime } = setup()
  service.record('cells', 5)
  setTime(Date.parse('2026-10-15T00:00:00+03:00'))
  service.refresh()
  assert.equal(service.getState().missions.length, 9)
  assert.equal(service.getState().missions[0].progress, 5)
})
test('new and completed notification counts form a union and disappear after seeing/claiming', () => {
  const { service } = setup()
  assert.equal(service.getNotificationCount(), 3)
  service.record('cells', 20)
  assert.equal(service.getNotificationCount(), 3)
  service.markSeen()
  assert.equal(service.getNotificationCount(), 1)
  service.claimMission(service.getState().missions[0].id)
  assert.equal(service.getNotificationCount(), 0)
})
test('progress is capped, completion counts once and unknown metrics do nothing', () => {
  const { service } = setup()
  service.record('cells', 20)
  assert.equal(service.getState().weekly.completed, 1)
  service.record('cells', 1000)
  assert.equal(service.getState().weekly.completed, 3)
  service.record('cells', 1000)
  service.record('unknown', 1000)
  service.record('cells', -1)
  assert.equal(service.getState().weekly.completed, 3)
  assert.equal(service.getState().missions[0].progress, 20)
})
test('each claim gives exactly 5 Aetherium and 5 + 3 per advanced tier Chronoshards', () => {
  const { service, storage, setTier } = setup()
  assert.equal(service.claimMission(service.getState().missions[0].id), false)
  const first = service.completeRandom()
  assert.equal(storage.getItem('aetherium'), null)
  assert.equal(service.claimMission(first.id), true)
  assert.equal(service.claimMission(first.id), false)
  assert.equal(storage.getItem('aetherium'), '5')
  assert.equal(storage.getItem('chronoshards'), '5')
  setTier(9)
  const second = service.completeRandom()
  service.claimMission(second.id)
  assert.equal(storage.getItem('aetherium'), '10')
  assert.equal(storage.getItem('chronoshards'), '34')
  assert.deepEqual(getMissionReward(5), { aetherium: 5, chronoshards: 17 })
})
test('weekly box unlocks at 15 completions and gives 100 of each currency only once', () => {
  const { service, storage } = setup()
  assert.equal(service.claimWeekly(), false)
  for (let index = 0; index < 15; index++) {
    if (!service.getState().missions.length) service.triggerMidnight()
    const mission = service.completeRandom()
    service.claimMission(mission.id)
  }
  assert.equal(service.getState().weekly.completed, 15)
  assert.equal(service.claimWeekly(), true)
  assert.equal(service.claimWeekly(), false)
  assert.equal(storage.getItem('aetherium'), '175')
  assert.equal(storage.getItem('chronoshards'), '175')
})
test('Monday midnight resets weekly progress and chest, while old completed missions stay claimable', () => {
  const { service, setTime } = setup({ time: Date.parse('2026-10-04T23:59:59+03:00') })
  const mission = service.completeRandom()
  assert.equal(service.getState().weekly.completed, 1)
  setTime(Date.parse('2026-10-05T00:00:00+03:00'))
  service.refresh()
  assert.equal(service.getState().weekly.completed, 0)
  assert.equal(service.claimMission(mission.id), true)
  assert.equal(service.getState().weekly.completed, 0)
})
test('calendar rollback does not reissue daily missions or reset weekly progress', () => {
  const { service, setTime } = setup()
  service.completeRandom()
  setTime(Date.parse('2026-09-29T12:00:00+03:00'))
  assert.equal(service.refresh(), 0)
  assert.equal(service.getState().weekly.completed, 1)
})
test('partial reward write recovers exactly once, including retry without reloading', () => {
  const { service, storage } = setup()
  const mission = service.completeRandom()
  storage.failKey = 'chronoshards'
  assert.throws(() => service.claimMission(mission.id), /Storage failure/)
  assert.ok(storage.getItem(MARKET_JOURNAL_KEY))
  storage.failKey = null
  assert.equal(service.claimMission(mission.id), false)
  assert.equal(storage.getItem('aetherium'), '5')
  assert.equal(storage.getItem('chronoshards'), '5')
  assert.equal(storage.getItem(MARKET_JOURNAL_KEY), null)
})
test('play time missions advance from recorded active seconds', () => {
  const { service } = setup()
  service.triggerMidnight(); service.triggerMidnight()
  for (const mission of service.getState().missions) service.completeRandom()
  for (const mission of service.getState().missions) service.claimMission(mission.id)
  // Cell/collect objectives free up first, so pick time tasks through persisted fixture.
  const repository = { read: () => ({ version: 1, lastDay: missionCalendar(Date.now()).day, serial: 1, weekly: { week: missionCalendar(Date.now()).week, completed: 0, claimed: false }, missions: [{ id: 'time', templateId: 'play-120', metric: 'playSeconds', target: 120, progress: 0, isNew: false, completedWeek: null }] }), commit() {} }
  const timer = createDailyMissions({ repository })
  timer.record('playSeconds', 120)
  assert.equal(timer.getState().weekly.completed, 1)
})

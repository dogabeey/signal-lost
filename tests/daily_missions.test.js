import test from 'node:test'
import assert from 'node:assert/strict'
import { createDailyMissions, createMissionRepository, getMissionReward, missionCalendar, MISSION_TEMPLATES } from '../src/daily_missions.js'
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
  assert.equal(service.getState().missions[1].progress, 5)
})
test('new and completed notification counts form a union and disappear after seeing/claiming', () => {
  const { service } = setup()
  assert.equal(service.getNotificationCount(), 3)
  service.record('cells', 100)
  assert.equal(service.getNotificationCount(), 3)
  service.markSeen()
  assert.equal(service.getNotificationCount(), 1)
  service.claimMission(service.getState().missions[1].id)
  assert.equal(service.getNotificationCount(), 0)
})
test('progress is capped, completion counts once and unknown metrics do nothing', () => {
  const { service } = setup()
  service.record('cells', 100)
  assert.equal(service.getState().weekly.completed, 1)
  service.record('travelDistance', 300)
  service.record('dodgedMeteors', 20)
  assert.equal(service.getState().weekly.completed, 3)
  service.record('cells', 1000)
  service.record('unknown', 1000)
  service.record('cells', -1)
  assert.equal(service.getState().weekly.completed, 3)
  assert.equal(service.getState().missions[1].progress, 100)
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

function fixture(metric) {
  const calendar = missionCalendar(Date.now())
  const template = MISSION_TEMPLATES.find((item) => item.metric === metric)
  let saved = { version: 1, lastDay: calendar.day, serial: 1, weekly: { week: calendar.week, completed: 0, claimed: false }, missions: [{ id: 'task', templateId: template.id, metric, target: template.target, progress: 0, isNew: false, completedWeek: null }] }
  const make = () => createDailyMissions({ repository: { read: () => structuredClone(saved), commit(next) { saved = structuredClone(next) } } })
  return { service: make(), reload: make }
}
test('pool contains exactly the twelve requested goals', () => {
  assert.deepEqual(MISSION_TEMPLATES.map((m) => m.target), [300,100,20,600,3,180,10,3,5,90,1,1])
})
test('active time and fractional progress persist and cap', () => {
  for (const metric of ['playSeconds','stationarySeconds','rangedSeconds','travelDistance']) {
    const { service, reload } = fixture(metric)
    service.record(metric, 0.5)
    assert.equal(reload().getState().missions[0].progress, 0.5)
    service.record(metric, 1000)
    assert.equal(service.getState().weekly.completed, 1)
  }
})
test('distinct creepers count once even after reload', () => {
  const {service, reload} = fixture('slowedCreepers')
  service.record('slowedCreepers', 1, 'a')
  const resumed = reload()
  resumed.record('slowedCreepers', 1, 'a')
  assert.equal(resumed.getState().missions[0].progress, 1)
  for(let i=0;i<9;i++) resumed.record('slowedCreepers',1,String(i))
  assert.equal(resumed.getState().weekly.completed,1)
})
test('bomber escapes require prior entry, a live fuse, and distinct enemies', () => {
  const {service,reload}=fixture('bomberEscapes')
  service.observeBomber('a',false)
  service.observeBomber('a',true)
  const resumed=reload()
  resumed.observeBomber('a',false)
  resumed.observeBomber('a',true); resumed.observeBomber('a',false)
  resumed.observeBomber('expired',true); resumed.observeBomber('expired',false,false)
  assert.equal(resumed.getState().missions[0].progress,1)
  for(const id of ['b','c']) {resumed.observeBomber(id,true);resumed.observeBomber(id,false)}
  assert.equal(resumed.getState().weekly.completed,1)
})
test('three rounds each need 120 seconds and continuations never count twice', () => {
  const {service,reload}=fixture('longRounds')
  service.record('roundSeconds',119,'a')
  assert.equal(service.getState().missions[0].progress,0)
  const resumed=reload()
  resumed.record('roundSeconds',1,'a'); resumed.record('roundSeconds',120,'a')
  assert.equal(resumed.getState().missions[0].progress,1)
  resumed.record('roundSeconds',119,'short')
  resumed.record('roundSeconds',1,'b')
  assert.equal(resumed.getState().missions[0].progress,1)
  resumed.record('roundSeconds',119,'b');resumed.record('roundSeconds',120,'c')
  assert.equal(resumed.getState().weekly.completed,1)
})
test('obsolete test tasks are replaced without losing earned weekly credit', () => {
  const {storage,reload}=setup()
  const saved=JSON.parse(storage.getItem('missions'))
  saved.missions[0].templateId='cells-20';saved.weekly.completed=4
  storage.setItem('missions',JSON.stringify(saved))
  const next=reload().getState()
  assert.equal(next.missions.length,3)
  assert.equal(next.weekly.completed,4)
  assert.ok(next.missions.every((m)=>MISSION_TEMPLATES.some((t)=>t.id===m.templateId)))
})

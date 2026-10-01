import test from 'node:test'
import assert from 'node:assert/strict'
import { getSectorDifficultyMultiplier, getSectorMeteorSpeedMultiplier } from '../src/sector_difficulty.js'

test('Sector I preserves its existing difficulty and Sector IX adds 25% pressure', () => {
  assert.equal(getSectorDifficultyMultiplier(0), 1)
  assert.equal(getSectorDifficultyMultiplier(8), 1.25)
  for (const oldInterval of [0.5, 1, 3, 12]) {
    assert.equal(oldInterval / getSectorDifficultyMultiplier(0), oldInterval)
    const newInterval = oldInterval / getSectorDifficultyMultiplier(8)
    assert.equal(oldInterval / newInterval, 1.25)
  }
})

test('intermediate sectors gain 3.125 percentage points of pressure per step', () => {
  const multipliers = Array.from({ length: 9 }, (_, index) => getSectorDifficultyMultiplier(index))
  assert.deepEqual(multipliers, [1, 1.03125, 1.0625, 1.09375, 1.125, 1.15625, 1.1875, 1.21875, 1.25])
})

test('meteor speed ranges linearly from half speed in Sector I to original speed in IX', () => {
  const speeds = Array.from({ length: 9 }, (_, index) => getSectorMeteorSpeedMultiplier(index))
  assert.deepEqual(speeds, [0.5, 0.5625, 0.625, 0.6875, 0.75, 0.8125, 0.875, 0.9375, 1])
  assert.equal(1.8 / speeds[0], 3.6)
  assert.equal(1.8 / speeds[8], 1.8)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { getSectorDifficultyMultiplier } from '../src/sector_difficulty.js'

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

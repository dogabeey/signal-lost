import { t } from './localisation.js'

const ANOMALY_CONFIG_BASE = {
  unlockSector: 2,
  weeklyAnchorDate: '2026-09-02',
  rewardCellTarget: 250,
  rewardBaseChronoshards: 10,
  rewardChronoshardStepPerSector: 2,
  challenges: [
    {
      id: 'cell-scout',
      name: 'Scout Rivalry',
      description: 'A distant red AI ship collects Cells alongside you. Its Cells do not count toward your run, and it cannot harm you.',
      type: 'cell-scout',
      rewardCellTarget: 250,
    },
    {
      id: 'tower-defense',
      name: 'Tower Defense',
      description: 'Defend the central tower from enemy waves. Destroy 1,000 enemies before the tower falls.',
      type: 'tower-defense',
      rewardCellTarget: 1000,
      towerHitpoints: 100,
      towerContactDamage: 1,
      towerProjectileDamage: 1,
      towerRadius: 1.15,
      difficultyMultiplier: 1,
      enemyTypes: ['regular', 'chaser', 'creeper', 'shooter'],
      enemySpawnWeights: { regular: 0.4, chaser: 0.25, creeper: 0.2, shooter: 0.15 },
      enemyMovementSpeeds: { chaser: 2.4, creeper: 1.25, shooter: 1.1 },
    },
  ],
}

export const ANOMALY_CONFIG = {
  ...ANOMALY_CONFIG_BASE,
  challenges: ANOMALY_CONFIG_BASE.challenges.map((challenge) => ({
    ...challenge,
    name: t(`anomaly.${challenge.id}.name`, {}, challenge.name),
    description: t(`anomaly.${challenge.id}.description`, {}, challenge.description),
  })),
}

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

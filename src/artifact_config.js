// Add permanent achievement rewards here. `buff.stat` uses the same stat keys as Research effects.
export const ARTIFACT_CONFIG = {
  artifacts: [
    {
      id: 'pioneer-core',
      name: 'Pioneer Core',
      icon: 'pioneer-core.svg',
      requirement: { type: 'tier-high-score', tier: 1, cells: 50 },
      buff: { stat: 'playerSpeedMultiplier', amount: 0.03, label: '+3% player movement speed' },
    },
    {
      id: 'salvager-seal',
      name: 'Salvager Seal',
      icon: 'salvager-seal.svg',
      requirement: { type: 'tier-high-score', tier: 2, cells: 100 },
      buff: { stat: 'cashMultiplier', amount: 0.05, label: '+5% cash earned from Cells' },
    },
    {
      id: 'chrono-lens',
      name: 'Chrono Lens',
      icon: 'chrono-lens.svg',
      requirement: { type: 'tier-high-score', tier: 3, cells: 125 },
      buff: { stat: 'chronoSpawnRate', amount: 0.04, label: '+4% Chrono Cell spawn rate' },
    },
  ],
}

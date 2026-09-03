// Add permanent achievement rewards here. `buff.stat` uses the same stat keys as Research effects.
export const ARTIFACT_CONFIG = {
  artifacts: [
    {
      id: 'ftl-schematics',
      name: 'FTL Schematics',
      icon: 'ftl-schematics.svg',
      requirement: { type: 'milestone-claimed', milestoneId: 'tier-3-500', tier: 3, cells: 500 },
      buff: { stat: 'playerSpeedMultiplier', amount: 0.1, label: '+10% player movement speed' },
    },
    {
      id: 'broken-extractor',
      name: 'Broken Extractor',
      icon: 'broken-extractor.svg',
      requirement: { type: 'milestone-claimed', milestoneId: 'tier-5-500', tier: 5, cells: 500 },
      buff: { stat: 'cashMultiplier', amount: 0.1, label: '+10% cash earned from Cells' },
    },
    {
      id: 'dark-core',
      name: 'Dark Core',
      icon: 'dark-core.svg',
      repeatable: true,
      requirement: { type: 'anomaly-run-success', cells: 250 },
      buff: { stat: 'chronoshardGainMultiplier', amount: 0.1, label: '+10% Chronoshards earned' },
    },
    {
      id: 'map-to-earth',
      name: 'Map To Earth',
      icon: 'map-to-earth.svg',
      requirement: { type: 'hidden-world-map', minTier: 6, chance: 0.01 },
      buff: { stat: 'arenaSizeMultiplier', amount: 0.2, label: '+20% arena size in every Tier' },
    },
    {
      id: 'alientech-gizmo',
      name: 'Alientech Gizmo',
      icon: 'alientech-gizmo.svg',
      requirement: { type: 'milestone-claimed', milestoneId: 'tier-7-500', tier: 7, cells: 500 },
      buff: { stat: 'researchCostReduction', amount: 0.2, label: '-20% Research cost' },
    },
    {
      id: 'hubble-telescope',
      name: 'Hubble Telescope',
      icon: 'hubble-telescope.svg',
      requirement: { type: 'milestone-claimed', milestoneId: 'tier-9-500', tier: 9, cells: 500 },
      buff: { stat: 'effectRange', amount: 0.2, label: '+20% player effect range' },
    },
  ],
}

// Status damage is configured here so new types (for example poison) and their
// future immunity research can be added without changing the game loop.
export const DAMAGE_TYPES = {
  fire: {
    label: 'Burning',
    duration: 1.5,
    color: '#ff4f3e',
    immunityResearchId: 'fire-immunity',
    requiresExposure: true,
    refreshOnReapply: false,
  },
  poison: {
    label: 'Poisoned',
    duration: 3,
    color: '#91e85a',
    immunityResearchId: 'poison-immunity',
    requiresExposure: true,
    refreshOnReapply: true,
  },
}

// Status damage is configured here so new types (for example poison) and their
// future immunity research can be added without changing the game loop.
import { t } from './localisation.js'

export const DAMAGE_TYPES = {
  fire: {
    label: t('status.fire', {}, 'Burning'),
    duration: 1.5,
    color: '#ff4f3e',
    immunityResearchId: 'fire-immunity',
    requiresExposure: true,
    refreshOnReapply: false,
  },
  poison: {
    label: t('status.poison', {}, 'Poisoned'),
    duration: 3,
    color: '#91e85a',
    immunityResearchId: 'poison-immunity',
    requiresExposure: true,
    refreshOnReapply: true,
  },
}

import { t } from './localisation.js'

export const CHEAT_CONFIG = {
  enabled: true,
  hotkey: '\"',
  title: t('cheat.title'),
  commands: {
    cash: 'cash',
    chrono: 'chrono',
    freeResearch: 'free_research',
    unlockSectors: 'unlock_sectors',
    gainArtifact: 'gain_artifact',
    clearSave: 'clear_save',
    sandbox: 'sandbox',
  },
  clearSaveTargets: ['currency', 'game_progress', 'milestones', 'research', 'buildings', 'weapons', 'artifacts', 'all'],
}

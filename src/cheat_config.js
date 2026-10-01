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
    spawn: 'spawn',
    anomaly: 'anomaly',
    cell: 'cell',
    cellObtain: 'cell_obtain',
    god: 'god',
    triggerMission: 'trigger_misison',
    completeRandomMission: 'complete_random_mission',
  },
  clearSaveTargets: ['currency', 'game_progress', 'milestones', 'research', 'buildings', 'weapons', 'artifacts', 'all'],
}

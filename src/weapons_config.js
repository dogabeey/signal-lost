import { t } from './localisation.js'

const WEAPON_CONFIG_BASE = {
  purchaseCost: 15,
  levelCopyRequirements: [3, 5, 10, 25],
  weapons: {
    nuke: { name: 'Nuke', key: '1', color: '#ff795f', description: 'Destroys a percentage of enemies in the arena.', baseEffect: 0.3, effectPerLevel: 0.1 },
    megaMagnet: { name: 'Mega Magnet', key: '2', color: '#63f5cd', description: 'Pulls every Cell rapidly toward your ship.', baseEffect: 2.5, effectPerLevel: 0.8, duration: true },
    atmosphereShield: { name: 'Atmosphere Shield', key: '3', color: '#b59aff', description: 'Destroys and blocks falling meteors for a short time.', baseEffect: 4, effectPerLevel: 1.2, duration: true },
    phaseDash: { name: 'Phase Dash', key: '4', color: '#78eaff', description: 'Dash through enemies and erase every enemy in your path.', baseEffect: 6.5, effectPerLevel: 1.1 },
    chronoFreeze: { name: 'Chrono Freeze', key: '5', color: '#74bfff', description: 'Freezes every enemy and their lifetime for a short time.', baseEffect: 2.5, effectPerLevel: 0.65, duration: true },
    plasmaOrbital: { name: 'Plasma Orbital', key: '6', color: '#ff8cff', description: 'Deploys plasma orbitals that destroy enemies on contact.', baseEffect: 4, effectPerLevel: 0.8, duration: true },
    cellOverdrive: { name: 'Cell Overdrive', key: '7', color: '#ffd36f', description: 'Doubles Cells collected for a short time.', baseEffect: 4, effectPerLevel: 0.8, duration: true },
    demonMode: { name: 'Demon Mode', key: '8', color: '#ff465d', description: 'Move faster and destroy enemies you pass through.', baseEffect: 4, effectPerLevel: 0.8, duration: true },
  },
}

export const WEAPON_CONFIG = {
  ...WEAPON_CONFIG_BASE,
  weapons: Object.fromEntries(Object.entries(WEAPON_CONFIG_BASE.weapons).map(([id, weapon]) => [id, {
    ...weapon,
    name: t(`weapon.${id}.name`, {}, weapon.name),
    description: t(`weapon.${id}.description`, {}, weapon.description),
  }])),
}

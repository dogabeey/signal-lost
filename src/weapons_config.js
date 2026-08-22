export const WEAPON_CONFIG = {
  purchaseCost: 35,
  levelCopyRequirements: [3, 5, 10, 25],
  weapons: {
    nuke: { name: 'Nuke', key: '1', color: '#ff795f', description: 'Destroys a percentage of enemies in the arena.', baseEffect: 0.3, effectPerLevel: 0.1 },
    megaMagnet: { name: 'Mega Magnet', key: '2', color: '#63f5cd', description: 'Pulls every Cell rapidly toward your ship.', baseEffect: 2.5, effectPerLevel: 0.8 },
    atmosphereShield: { name: 'Atmosphere Shield', key: '3', color: '#b59aff', description: 'Destroys and blocks falling meteors for a short time.', baseEffect: 4, effectPerLevel: 1.2 },
  },
}

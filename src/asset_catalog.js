const buildingAssets = {
  chronoGenerator: '/assets/buildings/chrono-generator.png',
  autocannon: '/assets/buildings/autocannon.png',
  droneBay: '/assets/buildings/drone-bay.png',
  barrierNode: '/assets/buildings/barrier-node.png',
  overclockRelay: '/assets/buildings/overclock-relay.png',
  salvageExtractor: '/assets/buildings/salvage-extractor.png',
}

const weaponAssets = {
  nuke: '/assets/weapons/nuke.png',
  megaMagnet: '/assets/weapons/mega-magnet.png',
  atmosphereShield: '/assets/weapons/atmosphere-shield.png',
}

// Add a matching generated PNG here whenever a new model is introduced.
export function getBuildingAsset(type) {
  return buildingAssets[type] ?? ''
}

export function getWeaponAsset(type) {
  return weaponAssets[type] ?? ''
}

const publicAsset = (path) => `${import.meta.env.BASE_URL}assets/${path}`

const buildingAssets = {
  chronoGenerator: publicAsset('buildings/chrono-generator.png'),
  autocannon: publicAsset('buildings/autocannon.png'),
  droneBay: publicAsset('buildings/drone-bay.png'),
  barrierNode: publicAsset('buildings/barrier-node.png'),
  overclockRelay: publicAsset('buildings/overclock-relay.png'),
  salvageExtractor: publicAsset('buildings/salvage-extractor.png'),
}

const weaponAssets = {
  nuke: publicAsset('weapons/nuke.png'),
  megaMagnet: publicAsset('weapons/mega-magnet.png'),
  atmosphereShield: publicAsset('weapons/atmosphere-shield.png'),
  phaseDash: publicAsset('weapons/phase-dash.png'),
  chronoFreeze: publicAsset('weapons/chrono-freeze.png'),
  plasmaOrbital: publicAsset('weapons/plasma-orbital.png'),
  cellOverdrive: publicAsset('weapons/cell-overdrive.png'),
  demonMode: publicAsset('weapons/demon-mode.png'),
}

const uiIconAssets = {
  researchLab: publicAsset('ui/research-lab.svg'),
  buildingSystem: publicAsset('ui/building-system.svg'),
  weaponry: publicAsset('ui/weaponry.svg'),
  encyclopedia: publicAsset('ui/encyclopedia.svg'),
  settings: publicAsset('ui/settings.svg'),
}

// Add a matching generated PNG here whenever a new model is introduced.
export function getBuildingAsset(type) {
  return buildingAssets[type] ?? ''
}

export function getWeaponAsset(type) {
  return weaponAssets[type] ?? ''
}

export function getUiIconAsset(id) {
  return uiIconAssets[id] ?? ''
}

const publicAsset = (path) => `${import.meta.env.BASE_URL}assets/${path}`

const buildingAssets = {
  chronoGenerator: publicAsset('buildings/chrono-generator.svg'),
  autocannon: publicAsset('buildings/autocannon.svg'),
  droneBay: publicAsset('buildings/drone-bay.svg'),
  barrierNode: publicAsset('buildings/barrier-node.svg'),
  overclockRelay: publicAsset('buildings/overclock-relay.svg'),
  salvageExtractor: publicAsset('buildings/salvage-extractor.svg'),
}

const weaponAssets = {
  nuke: publicAsset('weapons/nuke.svg'),
  megaMagnet: publicAsset('weapons/mega-magnet.svg'),
  atmosphereShield: publicAsset('weapons/atmosphere-shield.svg'),
  phaseDash: publicAsset('weapons/phase-dash.svg'),
  chronoFreeze: publicAsset('weapons/chrono-freeze.svg'),
  plasmaOrbital: publicAsset('weapons/plasma-orbital.svg'),
  cellOverdrive: publicAsset('weapons/cell-overdrive.svg'),
  demonMode: publicAsset('weapons/demon-mode.svg'),
}

const uiIconAssets = {
  researchLab: publicAsset('ui/research-lab.svg'),
  buildingSystem: publicAsset('ui/building-system.svg'),
  weaponry: publicAsset('ui/weaponry.svg'),
  home: publicAsset('ui/home.svg'),
  encyclopedia: publicAsset('ui/encyclopedia.svg'),
  settings: publicAsset('ui/settings.svg'),
}

// Add a matching SVG icon here whenever a new model is introduced.
export function getBuildingAsset(type) {
  return buildingAssets[type] ?? ''
}

export function getWeaponAsset(type) {
  return weaponAssets[type] ?? ''
}

export function getUiIconAsset(id) {
  return uiIconAssets[id] ?? ''
}

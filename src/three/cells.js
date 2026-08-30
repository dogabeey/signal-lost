export function createCellVisualFactory({ THREE, COLORS, ENTITIES }) {
  const cellGeometry = new THREE.OctahedronGeometry(ENTITIES.cellRadius)
  const chronoCellGeometry = new THREE.IcosahedronGeometry(ENTITIES.chronoCellRadius, 1)
  const boosterGeometry = new THREE.OctahedronGeometry(0.42)
  const boosterColors = { speed: '#ffcf76', thorn: '#ff795f', freezer: '#7bdcff' }

  return {
    createCell() {
      return new THREE.Mesh(cellGeometry, new THREE.MeshStandardMaterial({ color: COLORS.cell, emissive: COLORS.cellEmissive, emissiveIntensity: ENTITIES.cellEmissiveIntensity, metalness: ENTITIES.cellMetalness, roughness: ENTITIES.cellRoughness }))
    },
    createChronoCell() {
      return new THREE.Mesh(chronoCellGeometry, new THREE.MeshStandardMaterial({ color: COLORS.chronoCell, emissive: COLORS.chronoCellEmissive, emissiveIntensity: ENTITIES.chronoCellEmissiveIntensity, metalness: 0.4, roughness: 0.12, transparent: true }))
    },
    createBooster(type) {
      const color = boosterColors[type]
      return new THREE.Mesh(boosterGeometry, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.7, metalness: 0.25, roughness: 0.2 }))
    },
  }
}

import * as THREE from 'three'

const material = (color) => new THREE.MeshStandardMaterial({ color, roughness: .82 })
const part = (geometry, color, y, group) => { const mesh = new THREE.Mesh(geometry, material(color)); mesh.position.y = y; mesh.castShadow = true; group.add(mesh); return mesh }

// Deliberately primitive, modular player models: swap a part for a GLTF later without changing gameplay code.
export function createCharacter(data) {
  const group = new THREE.Group()
  const skin = '#d89a70'
  part(new THREE.CylinderGeometry(.42, .55, .95, 8), data.color, .95, group)
  part(new THREE.SphereGeometry(.38, 12, 10), skin, 1.75, group)
  const hat = part(data.hat === 'crown' ? new THREE.CylinderGeometry(.42, .3, .22, 8) : new THREE.ConeGeometry(.45, .5, 8), data.accent, 2.1, group)
  ;[-.34, .34].forEach((x) => { const arm = part(new THREE.CapsuleGeometry(.1, .52, 4, 8), data.color, 1.15, group); arm.position.x = x; arm.rotation.z = x * -.45 })
  ;[-.2, .2].forEach((x) => { const leg = part(new THREE.CapsuleGeometry(.12, .4, 4, 8), '#302127', .3, group); leg.position.x = x })
  return { group, target: new THREE.Vector3(), animate(delta) { group.position.y = Math.sin(performance.now() * .003 + group.position.x) * .02; hat.rotation.y += delta * .25 } }
}

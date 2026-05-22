import * as THREE from 'three'

const MIN_SPAWN_DIST = 40
const MAX_SPAWN_DIST = 80
const MAP_LIMIT = 180

export const generateSpawnPositions = () => {
  const px = Math.floor(Math.random() * (MAP_LIMIT * 2)) - MAP_LIMIT
  const pz = Math.floor(Math.random() * (MAP_LIMIT * 2)) - MAP_LIMIT
  const playerPos = new THREE.Vector3(px, 0, pz)

  let ex
  let ez
  let valid = false

  while (!valid) {
    const angle = Math.random() * Math.PI * 2
    const distance = Math.floor(Math.random() * (MAX_SPAWN_DIST - MIN_SPAWN_DIST + 1)) + MIN_SPAWN_DIST

    ex = px + Math.cos(angle) * distance
    ez = pz + Math.sin(angle) * distance

    if (ex >= -MAP_LIMIT && ex <= MAP_LIMIT && ez >= -MAP_LIMIT && ez <= MAP_LIMIT) {
      valid = true
    }
  }

  const pikachuPos = new THREE.Vector3(ex, 0, ez)
  return { playerPos, pikachuPos }
}


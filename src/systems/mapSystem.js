export const generateInitialMap = (playerPos, pikachuPos) => {
  const initialItems = []
  const naturalTypes = ['Tree1', 'Tree2']
  const MIN_TREE_DISTANCE = 15
  let attempts = 0

  while (initialItems.length < 400 && attempts < 5000) {
    attempts++
    const randomType = naturalTypes[Math.floor(Math.random() * naturalTypes.length)]
    const randomX = Math.floor(Math.random() * 400) - 200
    const randomZ = Math.floor(Math.random() * 400) - 200

    let isTooClose = false

    const distToPlayer = Math.sqrt(Math.pow(randomX - playerPos.x, 2) + Math.pow(randomZ - playerPos.z, 2))
    const distToPikachu = Math.sqrt(Math.pow(randomX - pikachuPos.x, 2) + Math.pow(randomZ - pikachuPos.z, 2))

    if (distToPlayer < 12 || distToPikachu < 15) continue

    for (let item of initialItems) {
      const dx = item.position[0] - randomX
      const dz = item.position[2] - randomZ
      if (Math.sqrt(dx * dx + dz * dz) < MIN_TREE_DISTANCE) {
        isTooClose = true
        break
      }
    }

    if (!isTooClose) {
      initialItems.push({ id: `init_${initialItems.length}`, position: [randomX, 0, randomZ], type: randomType })
    }
  }

  return initialItems
}


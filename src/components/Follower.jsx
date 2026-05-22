import { useLayoutEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

export default function Follower({ playerPosRef, initialPosition, items, gameState, setGameState, setFinalTimeStr, timeRef }) {
  const { scene } = useGLTF('/models/Pikachu/scene.gltf')
  const chaserRef = useRef()
  const modelRef = useRef()
  const pos = useRef(initialPosition.clone())
  const chaserTargetQuaternion = useRef(new THREE.Quaternion())

  const CHASER_SPEED = 0.202
  const PLAYER_CATCH_DISTANCE = 4.0
  const TREE_AVOIDANCE_DISTANCE = 6.0

  useLayoutEffect(() => {
    if (modelRef.current) modelRef.current.traverse((obj) => { if (obj.isMesh) obj.frustumCulled = false })
  }, [])

  useFrame((state, delta) => {
    if (!chaserRef.current || !modelRef.current || gameState !== 'playing') return

    const playerPos = playerPosRef.current
    const followerPos = pos.current

    const desiredDirection = new THREE.Vector3().subVectors(playerPos, followerPos)
    const distanceToPlayer = desiredDirection.length()

    if (distanceToPlayer < PLAYER_CATCH_DISTANCE) {
      const totalMs = timeRef.current.accumulated + (Date.now() - timeRef.current.lastResume)
      const minutes = Math.floor((totalMs / 1000) / 60)
      const seconds = Math.floor((totalMs / 1000) % 60)

      setFinalTimeStr(`${minutes}분 ${seconds}초`)
      setGameState('gameover')
      return
    }

    if (distanceToPlayer > 1.0) {
      desiredDirection.normalize()
      let moveDir = desiredDirection.clone()
      let foundPath = false
      const frameSpeed = CHASER_SPEED * delta * 60

      const anglesToTry = [
        0, Math.PI / 6, -Math.PI / 6, Math.PI / 3, -Math.PI / 3,
        Math.PI / 2, -Math.PI / 2, Math.PI / 1.5, -Math.PI / 1.5, Math.PI, -Math.PI,
      ]

      for (let angle of anglesToTry) {
        const testDir = desiredDirection.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angle)
        const nextX = followerPos.x + testDir.x * frameSpeed
        const nextZ = followerPos.z + testDir.z * frameSpeed

        let isColliding = false
        for (let i = 0; i < items.length; i++) {
          const item = items[i]
          const currentDx = followerPos.x - item.position[0]
          const currentDz = followerPos.z - item.position[2]
          const currentDist = Math.sqrt(currentDx * currentDx + currentDz * currentDz)

          const dx = nextX - item.position[0]
          const dz = nextZ - item.position[2]
          const nextDist = Math.sqrt(dx * dx + dz * dz)

          if (nextDist < TREE_AVOIDANCE_DISTANCE && nextDist < currentDist) {
            isColliding = true
            break
          }
        }

        if (!isColliding) {
          moveDir = testDir
          foundPath = true
          break
        }
      }

      if (foundPath) {
        followerPos.add(moveDir.multiplyScalar(frameSpeed))
        const angleY = Math.atan2(moveDir.x, moveDir.z)
        chaserTargetQuaternion.current.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angleY)
      }
    }

    chaserRef.current.position.copy(pos.current)
    chaserRef.current.quaternion.slerp(chaserTargetQuaternion.current, 0.1)
    modelRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 8) * 0.05
  })

  return (
    <group ref={chaserRef}>
      <group ref={modelRef}>
        <primitive object={scene} scale={3} />
      </group>
    </group>
  )
}

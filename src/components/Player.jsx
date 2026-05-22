/* eslint-disable react-hooks/immutability */
import { useEffect, useLayoutEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

export default function Player({ items, playerPosRef, gameState }) {
  const { scene } = useGLTF('/models/Metamong/scene.gltf')
  const playerRef = useRef()
  const modelRef = useRef()

  const pos = playerPosRef
  const targetQuaternion = useRef(new THREE.Quaternion())
  const keys = useRef({ w: false, a: false, s: false, d: false })
  const TREE_COLLISION_DISTANCE = 2.0

  useLayoutEffect(() => {
    if (modelRef.current) modelRef.current.traverse((obj) => { if (obj.isMesh) obj.frustumCulled = false })
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'KeyW' || e.key === 'ArrowUp') keys.current.w = true
      if (e.code === 'KeyA' || e.key === 'ArrowLeft') keys.current.a = true
      if (e.code === 'KeyS' || e.key === 'ArrowDown') keys.current.s = true
      if (e.code === 'KeyD' || e.key === 'ArrowRight') keys.current.d = true
    }
    const handleKeyUp = (e) => {
      if (e.code === 'KeyW' || e.key === 'ArrowUp') keys.current.w = false
      if (e.code === 'KeyA' || e.key === 'ArrowLeft') keys.current.a = false
      if (e.code === 'KeyS' || e.key === 'ArrowDown') keys.current.s = false
      if (e.code === 'KeyD' || e.key === 'ArrowRight') keys.current.d = false
    }
    const handleBlur = () => { keys.current = { w: false, a: false, s: false, d: false } }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

  useFrame((state, delta) => {
    if (!playerRef.current || !modelRef.current || gameState !== 'playing') return

    const speed = 0.2
    const frameSpeed = speed * delta * 60
    let isMoving = false
    const direction = new THREE.Vector3()

    if (keys.current.w) { direction.z -= 1; isMoving = true }
    if (keys.current.s) { direction.z += 1; isMoving = true }
    if (keys.current.a) { direction.x -= 1; isMoving = true }
    if (keys.current.d) { direction.x += 1; isMoving = true }

    if (isMoving) {
      direction.normalize().multiplyScalar(frameSpeed)
      const nextX = pos.current.x + direction.x
      const nextZ = pos.current.z + direction.z

      let isColliding = false
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const currentDx = pos.current.x - item.position[0]
        const currentDz = pos.current.z - item.position[2]
        const currentDist = Math.sqrt(currentDx * currentDx + currentDz * currentDz)

        const dx = nextX - item.position[0]
        const dz = nextZ - item.position[2]
        const nextDist = Math.sqrt(dx * dx + dz * dz)

        if (nextDist < TREE_COLLISION_DISTANCE && nextDist < currentDist) {
          isColliding = true
          break
        }
      }

      if (!isColliding) {
        pos.current.x = nextX
        pos.current.z = nextZ
      }

      const angle = Math.atan2(direction.x, direction.z)
      targetQuaternion.current.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle)
      modelRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 10) * 0.03
    } else {
      modelRef.current.rotation.z = THREE.MathUtils.lerp(modelRef.current.rotation.z, 0, 0.1)
    }

    playerRef.current.position.copy(pos.current)
    playerRef.current.quaternion.slerp(targetQuaternion.current, 0.15)

    const cameraOffset = new THREE.Vector3(pos.current.x, pos.current.y + 15, pos.current.z + 20)
    state.camera.position.lerp(cameraOffset, 0.05)
    state.camera.lookAt(pos.current.x, pos.current.y + 4, pos.current.z)
  })

  return (
    <group ref={playerRef}>
      <group ref={modelRef}>
        <primitive object={scene} scale={4} />
      </group>
    </group>
  )
}

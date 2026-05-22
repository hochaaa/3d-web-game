/* eslint-disable react-hooks/immutability */
import { useLayoutEffect } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

export default function Ground() {
  const grassTexture = useTexture('/grass.jpg')

  useLayoutEffect(() => {
    if (grassTexture) {
      grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping
      grassTexture.repeat.set(100, 100)
      grassTexture.needsUpdate = true
    }
  }, [grassTexture])

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial map={grassTexture} />
      </mesh>
    </group>
  )
}

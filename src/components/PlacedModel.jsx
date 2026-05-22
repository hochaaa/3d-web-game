import { useLayoutEffect, useRef } from 'react'
import { Clone, useGLTF } from '@react-three/drei'
import { ASSET_CONFIG } from '../config/assets'

export default function PlacedModel({ type }) {
  const config = ASSET_CONFIG[type]
  const groupRef = useRef()
  const { scene } = useGLTF(`/models/${type}/scene.gltf`)

  useLayoutEffect(() => {
    if (groupRef.current) groupRef.current.traverse((obj) => { if (obj.isMesh) obj.frustumCulled = false })
  }, [])

  if (!config) return null

  return (
    <group ref={groupRef}>
      <Clone object={scene} scale={config.scale} position={[0, 0, 0]} />
    </group>
  )
}

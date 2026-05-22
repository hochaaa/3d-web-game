import { Suspense } from 'react'
import Ground from './Ground'
import PlacedModel from './PlacedModel'

export default function Village({ items }) {
  return (
    <group>
      <Suspense fallback={null}><Ground /></Suspense>
      {items.map((item) => (
        <group key={item.id} position={item.position}>
          <Suspense fallback={null}><PlacedModel type={item.type} /></Suspense>
        </group>
      ))}
    </group>
  )
}


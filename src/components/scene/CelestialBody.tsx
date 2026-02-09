import { useState, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { positionToScene, radiusToScene, PLANET_COLORS, DEFAULT_COLOR } from '../../utils/sceneScaling'
import { useStore } from '../../store/store'
import type { CelestialObject } from '../../types'

interface CelestialBodyProps {
  object: CelestialObject
}

export default function CelestialBody({ object }: CelestialBodyProps) {
  const x = object.x ?? 0
  const y = object.y ?? 0
  const z = object.z ?? 0
  const radius = radiusToScene(object.radius_km ?? 1000, object.id)
  const color = PLANET_COLORS[object.id] ?? DEFAULT_COLOR
  const position = positionToScene(x, y, z)
  const isSun = object.id === 'sun'

  const selectedObject = useStore((state) => state.selectedObject)
  const setSelectedObject = useStore((state) => state.setSelectedObject)
  const isSelected = selectedObject?.id === object.id

  const [hovered, setHovered] = useState(false)
  const meshRef = useRef<THREE.Mesh>(null)

  // Smooth hover scale animation
  useFrame(() => {
    if (!meshRef.current) return
    const target = hovered || isSelected ? 1.2 : 1.0
    meshRef.current.scale.lerp(new THREE.Vector3(target, target, target), 0.1)
  })

  const handleClick = (e: THREE.Event) => {
    e.stopPropagation()
    setSelectedObject(isSelected ? null : object)
  }

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto' }}
      >
        <sphereGeometry args={[radius, 32, 32]} />
        {isSun ? (
          <meshBasicMaterial color={color} />
        ) : (
          <meshStandardMaterial color={color} />
        )}
      </mesh>

      {/* Label */}
      {(isSelected || hovered) && (
        <Html
          position={[0, radius + 0.8, 0]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div style={{
            background: 'rgba(10, 15, 26, 0.75)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '8px',
            padding: '4px 12px',
            color: 'white',
            fontSize: '13px',
            fontWeight: isSelected ? 600 : 400,
            whiteSpace: 'nowrap',
            userSelect: 'none',
          }}>
            {object.name}
          </div>
        </Html>
      )}
    </group>
  )
}

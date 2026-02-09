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
  // Sun is rendered separately by SunMesh
  if (object.id === 'sun') return null

  const x = object.x ?? 0
  const y = object.y ?? 0
  const z = object.z ?? 0
  const radius = radiusToScene(object.radius_km ?? 1000, object.id)
  const color = PLANET_COLORS[object.id] ?? DEFAULT_COLOR
  const position = positionToScene(x, y, z)

  const selectedObject = useStore((state) => state.selectedObject)
  const setSelectedObject = useStore((state) => state.setSelectedObject)
  const isSelected = selectedObject?.id === object.id

  const [hovered, setHovered] = useState(false)
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (!meshRef.current) return
    const target = hovered || isSelected ? 1.2 : 1.0
    meshRef.current.scale.lerp(new THREE.Vector3(target, target, target), 0.1)
  })

  const handleClick = (e: THREE.Event) => {
    e.stopPropagation()
    setSelectedObject(isSelected ? null : object)
  }

  const isMoon = object.type === 'moon'

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto' }}
      >
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial
          color={color}
          roughness={isMoon ? 0.9 : 0.6}
          metalness={isMoon ? 0.1 : 0.2}
        />
      </mesh>

      {/* Always-visible small label, larger when selected */}
      <Html
        position={[0, radius + 0.6, 0]}
        center
        style={{ pointerEvents: 'none' }}
      >
        <div style={{
          background: isSelected ? 'rgba(10, 15, 26, 0.8)' : 'rgba(10, 15, 26, 0.45)',
          backdropFilter: isSelected ? 'blur(12px)' : undefined,
          WebkitBackdropFilter: isSelected ? 'blur(12px)' : undefined,
          border: isSelected ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '6px',
          padding: isSelected ? '4px 12px' : '2px 8px',
          color: 'white',
          fontSize: isSelected ? '13px' : '10px',
          fontWeight: isSelected ? 600 : 400,
          opacity: hovered || isSelected ? 1 : 0.6,
          whiteSpace: 'nowrap',
          userSelect: 'none',
          transition: 'all 0.15s ease',
        }}>
          {object.name}
        </div>
      </Html>
    </group>
  )
}

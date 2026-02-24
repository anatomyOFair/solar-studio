import { useState, useRef, useMemo } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { positionToScene, radiusToScene, PLANET_COLORS, DEFAULT_COLOR } from '../../utils/sceneScaling'
import { useStore } from '../../store/store'
import type { CelestialObject } from '../../types'

import mercuryTex from '../../assets/textures/8k_mercury.jpg'
import venusTex from '../../assets/textures/8k_venus_surface.jpg'
import earthTex from '../../assets/textures/8k_earth_daymap.jpg'
import earthCloudsTex from '../../assets/textures/8k_earth_clouds.jpg'
import marsTex from '../../assets/textures/8k_mars.jpg'
import jupiterTex from '../../assets/textures/8k_jupiter.jpg'
import saturnTex from '../../assets/textures/8k_saturn.jpg'
import saturnRingTex from '../../assets/textures/8k_saturn_ring_alpha.png'
import uranusTex from '../../assets/textures/2k_uranus.jpg'
import neptuneTex from '../../assets/textures/2k_neptune.jpg'

const TEXTURE_PATHS: Record<string, string> = {
  mercury: mercuryTex,
  venus: venusTex,
  earth: earthTex,
  mars: marsTex,
  jupiter: jupiterTex,
  saturn: saturnTex,
  uranus: uranusTex,
  neptune: neptuneTex,
}

interface CelestialBodyProps {
  object: CelestialObject
}

function TexturedPlanet({ object }: CelestialBodyProps) {
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
  const cloudsRef = useRef<THREE.Mesh>(null)

  const texturePath = TEXTURE_PATHS[object.id]
  const hasTexture = !!texturePath
  const isEarth = object.id === 'earth'
  const isSaturn = object.id === 'saturn'

  const textures = useLoader(
    THREE.TextureLoader,
    hasTexture
      ? isEarth
        ? [texturePath, earthCloudsTex]
        : isSaturn
          ? [texturePath, saturnRingTex]
          : [texturePath]
      : []
  )

  const mainTexture = textures[0] ?? null
  const secondaryTexture = textures[1] ?? null

  // Saturn ring geometry — flat annulus
  const ringGeometry = useMemo(() => {
    if (!isSaturn) return null
    const inner = radius * 1.2
    const outer = radius * 2.2
    const geo = new THREE.RingGeometry(inner, outer, 64)
    // Rotate UVs so texture maps radially
    const pos = geo.attributes.position
    const uv = geo.attributes.uv
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const dist = Math.sqrt(x * x + y * y)
      uv.setXY(i, (dist - inner) / (outer - inner), 0.5)
    }
    return geo
  }, [isSaturn, radius])

  useFrame(() => {
    if (!meshRef.current) return
    const target = hovered || isSelected ? 1.2 : 1.0
    meshRef.current.scale.lerp(new THREE.Vector3(target, target, target), 0.1)
    // Slow rotation for visual interest
    meshRef.current.rotation.y += 0.001
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += 0.0015
    }
  })

  const handleClick = (e: { stopPropagation: () => void }) => {
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
        <sphereGeometry args={[radius, 64, 64]} />
        {hasTexture ? (
          <meshStandardMaterial
            map={mainTexture}
            roughness={isMoon ? 0.9 : 0.7}
            metalness={0.05}
          />
        ) : (
          <meshStandardMaterial
            color={color}
            roughness={isMoon ? 0.9 : 0.6}
            metalness={isMoon ? 0.1 : 0.2}
          />
        )}
      </mesh>

      {/* Earth cloud layer */}
      {isEarth && secondaryTexture && (
        <mesh ref={cloudsRef}>
          <sphereGeometry args={[radius * 1.01, 64, 64]} />
          <meshStandardMaterial
            map={secondaryTexture}
            transparent
            opacity={0.35}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Saturn ring */}
      {isSaturn && ringGeometry && secondaryTexture && (
        <mesh geometry={ringGeometry} rotation={[Math.PI / 2 + 0.47, 0, 0]}>
          <meshStandardMaterial
            map={secondaryTexture}
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
            depthWrite={false}
            roughness={0.9}
            metalness={0}
          />
        </mesh>
      )}

      {/* Always-visible small label, larger when selected */}
      <Html
        position={[0, radius + 0.4, 0]}
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

export default function CelestialBody({ object }: CelestialBodyProps) {
  if (object.id === 'sun') return null
  return <TexturedPlanet object={object} />
}

import { useRef, useMemo, useState } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { radiusToScene } from '../../utils/sceneScaling'
import { useStore } from '../../store/store'
import sunTexturePath from '../../assets/textures/8k_sun.jpg'

const _scaleVec = new THREE.Vector3()

export default function SunMesh() {
  const sunRef = useRef<THREE.Mesh>(null)
  const groupRef = useRef<THREE.Group>(null)
  const radius = radiusToScene(695700, 'sun')

  const objects = useStore((state) => state.objects)
  const selectedObject = useStore((state) => state.selectedObject)
  const setSelectedObject = useStore((state) => state.setSelectedObject)
  const showLabels = useStore((state) => state.showLabels)
  const sunObj = objects.find((o) => o.id === 'sun') ?? null
  const isSelected = selectedObject?.id === 'sun'
  const [hovered, setHovered] = useState(false)

  const sunTexture = useLoader(THREE.TextureLoader, sunTexturePath)

  // Clone texture for the second layer — shares image data, independent UV offsets
  const layerTex = useMemo(() => {
    const tex = sunTexture.clone()
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    return tex
  }, [sunTexture])

  // Also enable wrapping on the base texture
  useMemo(() => {
    sunTexture.wrapS = sunTexture.wrapT = THREE.RepeatWrapping
  }, [sunTexture])

  // Carrington rotation period: 25.38 days = 2,192,832 seconds
  useFrame((_state, delta) => {
    if (sunRef.current) {
      sunRef.current.rotation.y += ((2 * Math.PI) / 2_192_832) * delta
    }
    // Scroll UV offsets in different directions for turbulent look
    sunTexture.offset.x += delta * 0.002
    sunTexture.offset.y += delta * 0.0005
    layerTex.offset.x -= delta * 0.0015
    layerTex.offset.y += delta * 0.001

    // Hover/select scale
    if (groupRef.current) {
      const target = hovered || isSelected ? 1.15 : 1.0
      groupRef.current.scale.lerp(_scaleVec.set(target, target, target), 0.1)
    }
  })

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    if (isSelected) return // Already focused — don't unfocus
    if (sunObj) setSelectedObject(sunObj)
  }

  return (
    <group>
      <group ref={groupRef}>
        <mesh
          ref={sunRef}
          onClick={handleClick}
          onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
          onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto' }}
        >
          <sphereGeometry args={[radius, 64, 64]} />
          {/* Base layer — full emissive sun texture */}
          <meshStandardMaterial
            emissiveMap={sunTexture}
            emissive="#ffffff"
            emissiveIntensity={2}
            toneMapped={false}
          />
        </mesh>

        {/* Second layer — same texture scrolling opposite direction, additive blend */}
        <mesh rotation={[0.3, 0.7, 0]}>
          <sphereGeometry args={[radius * 1.002, 64, 64]} />
          <meshStandardMaterial
            emissiveMap={layerTex}
            emissive="#ffffff"
            emissiveIntensity={1.2}
            transparent
            opacity={0.3}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* Label — visible when showLabels is on, or when hovered/selected */}
      {(showLabels || isSelected || hovered) && (
        <Html
          position={[0, radius + 0.4, 0]}
          center
          zIndexRange={[1, 0]}
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
            Sun
          </div>
        </Html>
      )}

      {/* Point light — decay=0 so all planets get consistent illumination */}
      <pointLight color="#fff5e0" intensity={2} decay={0} />
    </group>
  )
}

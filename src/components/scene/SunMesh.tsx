import { useRef, useMemo } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { radiusToScene } from '../../utils/sceneScaling'
import sunTexturePath from '../../assets/textures/8k_sun.jpg'

export default function SunMesh() {
  const sunRef = useRef<THREE.Mesh>(null)
  const radius = radiusToScene(695700, 'sun')

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
  })

  return (
    <group>
      <mesh ref={sunRef}>
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

      {/* Point light — decay=0 so all planets get consistent illumination */}
      <pointLight color="#fff5e0" intensity={2} decay={0} />
    </group>
  )
}

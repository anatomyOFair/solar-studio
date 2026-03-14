import { useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { radiusToScene } from '../../utils/sceneScaling'
import sunTexturePath from '../../assets/textures/8k_sun.jpg'

/**
 * Sun sphere + point light.
 * Uses meshStandardMaterial with the texture on the emissive channel
 * (not diffuse) so emissiveIntensity multiplies values above 1.0.
 * toneMapped={false} prevents clamping — bloom picks up the excess.
 */
export default function SunMesh() {
  const sunRef = useRef<THREE.Mesh>(null)
  const radius = radiusToScene(695700, 'sun')

  const sunTexture = useLoader(THREE.TextureLoader, sunTexturePath)

  // Carrington rotation period: 25.38 days = 2,192,832 seconds
  useFrame((_state, delta) => {
    if (sunRef.current) {
      sunRef.current.rotation.y += ((2 * Math.PI) / 2_192_832) * delta
    }
  })

  return (
    <group>
      <mesh ref={sunRef}>
        <sphereGeometry args={[radius, 64, 64]} />
        <meshStandardMaterial
          emissiveMap={sunTexture}
          emissive="#ffffff"
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>

      {/* Point light — decay=0 so all planets get consistent illumination */}
      <pointLight color="#fff5e0" intensity={2} decay={0} />
    </group>
  )
}

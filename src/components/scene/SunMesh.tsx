import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { radiusToScene, PLANET_COLORS } from '../../utils/sceneScaling'

const SUN_COLOR = PLANET_COLORS.sun

/**
 * Sun sphere + point light + additive-blended glow sprite.
 * The glow is a simple radial gradient on a plane, always facing camera.
 */
export default function SunMesh() {
  const glowRef = useRef<THREE.Mesh>(null)
  const radius = radiusToScene(695700, 'sun')

  const glowTexture = useMemo(() => {
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    gradient.addColorStop(0, 'rgba(255, 204, 51, 0.6)')
    gradient.addColorStop(0.3, 'rgba(255, 170, 20, 0.25)')
    gradient.addColorStop(0.6, 'rgba(255, 140, 0, 0.08)')
    gradient.addColorStop(1, 'rgba(255, 100, 0, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
    const tex = new THREE.CanvasTexture(canvas)
    return tex
  }, [])

  // Subtle pulsing
  useFrame(({ clock }) => {
    if (!glowRef.current) return
    const s = 1 + Math.sin(clock.elapsedTime * 0.8) * 0.05
    glowRef.current.scale.set(s, s, s)
  })

  return (
    <group>
      {/* Sun sphere */}
      <mesh>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshBasicMaterial color={SUN_COLOR} />
      </mesh>

      {/* Point light from sun */}
      <pointLight color={SUN_COLOR} intensity={3} distance={600} decay={1.5} />

      {/* Glow sprite */}
      <mesh ref={glowRef}>
        <planeGeometry args={[radius * 8, radius * 8]} />
        <meshBasicMaterial
          map={glowTexture}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

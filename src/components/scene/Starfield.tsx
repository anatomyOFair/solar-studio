import { useMemo } from 'react'
import * as THREE from 'three'

const STAR_COUNT = 3000
const RADIUS = 400

/**
 * Static starfield — random points placed on a large sphere.
 * No animation, no drift. Just fixed dots that stay put as you orbit.
 */
export default function Starfield() {
  const geometry = useMemo(() => {
    const positions = new Float32Array(STAR_COUNT * 3)
    const sizes = new Float32Array(STAR_COUNT)

    for (let i = 0; i < STAR_COUNT; i++) {
      // Random point on a sphere
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = RADIUS + (Math.random() - 0.5) * 50 // slight depth variation

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)

      // Most stars small, a few brighter
      sizes[i] = Math.random() < 0.05 ? 2.5 : 1.0
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    return geo
  }, [])

  return (
    <points geometry={geometry}>
      <pointsMaterial
        color="#ffffff"
        size={1.2}
        sizeAttenuation={false}
        transparent
        opacity={0.7}
      />
    </points>
  )
}

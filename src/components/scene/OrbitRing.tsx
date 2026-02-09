import { useMemo } from 'react'
import * as THREE from 'three'

interface OrbitRingProps {
  /** Full 3D radius in scene units */
  radius: number
  /** Tilt angle in radians (inclination from XZ plane) */
  tiltX?: number
  tiltZ?: number
}

const SEGMENTS = 128

/**
 * Tilted circle representing a planet's orbit.
 * The tilt matches the planet's orbital inclination.
 */
export default function OrbitRing({ radius, tiltX = 0, tiltZ = 0 }: OrbitRingProps) {
  const geometry = useMemo(() => {
    const points: THREE.Vector3[] = []
    for (let i = 0; i <= SEGMENTS; i++) {
      const angle = (i / SEGMENTS) * Math.PI * 2
      points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius))
    }
    return new THREE.BufferGeometry().setFromPoints(points)
  }, [radius])

  return (
    <group rotation={[tiltX, 0, tiltZ]}>
      <line geometry={geometry}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.08} />
      </line>
    </group>
  )
}

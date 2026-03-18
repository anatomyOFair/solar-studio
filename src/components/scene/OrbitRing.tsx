import { useMemo, useEffect, useRef } from 'react'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

interface OrbitRingProps {
  /** Full 3D radius in scene units */
  radius: number
  /** Tilt angle in radians (inclination from XZ plane) */
  tiltX?: number
  tiltZ?: number
  /** Real distance from sun in AU (shown as label) */
  distanceAu?: number
}

const SEGMENTS = 128

/**
 * Tilted circle representing a planet's orbit.
 * The tilt matches the planet's orbital inclination.
 */
export default function OrbitRing({ radius, tiltX = 0, tiltZ = 0, distanceAu }: OrbitRingProps) {
  const lineRef = useRef<THREE.Line>(null)

  const geometry = useMemo(() => {
    const points: THREE.Vector3[] = []
    for (let i = 0; i <= SEGMENTS; i++) {
      const angle = (i / SEGMENTS) * Math.PI * 2
      points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius))
    }
    return new THREE.BufferGeometry().setFromPoints(points)
  }, [radius])

  const material = useMemo(() => {
    return new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.08 })
  }, [])

  const lineObject = useMemo(() => new THREE.Line(geometry, material), [geometry, material])

  useEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  return (
    <group rotation={[tiltX, 0, tiltZ]}>
      <primitive ref={lineRef} object={lineObject} />
      {distanceAu != null && (
        <Html position={[radius, 0, 0]} center zIndexRange={[1, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{
            color: 'rgba(255, 255, 255, 0.3)',
            fontSize: 9,
            whiteSpace: 'nowrap',
            userSelect: 'none',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            letterSpacing: '0.03em',
          }}>
            {distanceAu.toFixed(1)} AU
          </div>
        </Html>
      )}
    </group>
  )
}

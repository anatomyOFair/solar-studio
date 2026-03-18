import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { auToScene } from '../../utils/sceneScaling'

const COUNT = 6000
const INNER_AU = 2.1
const OUTER_AU = 3.3
const INNER_R = auToScene(INNER_AU)
const OUTER_R = auToScene(OUTER_AU)
const Y_SPREAD = 0.3

const dummy = new THREE.Object3D()

export default function AsteroidBelt() {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return

    const color = new THREE.Color()
    const colors = new Float32Array(COUNT * 3)

    for (let i = 0; i < COUNT; i++) {
      // Radial: weighted toward center of belt
      const t = Math.random()
      const r = INNER_R + (OUTER_R - INNER_R) * (0.5 + 0.5 * (2 * t - 1) * Math.abs(2 * t - 1))

      const angle = Math.random() * Math.PI * 2
      const y = (Math.random() - 0.5) * Y_SPREAD

      dummy.position.set(
        Math.cos(angle) * r,
        y,
        Math.sin(angle) * r,
      )

      // Random scale — tiny rocks
      const s = 0.003 + Math.random() * 0.012
      dummy.scale.setScalar(s)

      // Random rotation for variety
      dummy.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      )

      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)

      // Gray color variation
      const grey = 0.45 + Math.random() * 0.25
      color.setRGB(grey, grey * 0.95, grey * 0.9)
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    mesh.instanceMatrix.needsUpdate = true
    mesh.geometry.setAttribute(
      'color',
      new THREE.InstancedBufferAttribute(colors, 3),
    )
  }, [])

  // Gentle drift
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.001
    }
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial roughness={1} metalness={0.1} vertexColors />
    </instancedMesh>
  )
}

import { useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import milkyWayTex from '../../assets/textures/8k_stars_milky_way.jpg'

const RADIUS = 400

/**
 * Starfield skybox — 8K milky way texture mapped onto a large inverted sphere.
 */
export default function Starfield() {
  const texture = useLoader(THREE.TextureLoader, milkyWayTex)

  return (
    <mesh>
      <sphereGeometry args={[RADIUS, 64, 64]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} />
    </mesh>
  )
}

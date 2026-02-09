import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import { useStore } from '../../store/store'
import { positionToScene } from '../../utils/sceneScaling'
import CelestialBody from './CelestialBody'
import Starfield from './Starfield'
import SunMesh from './SunMesh'
import OrbitRing from './OrbitRing'

const PLANET_IDS = new Set(['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'])

function Scene() {
  const objects = useStore((state) => state.objects)
  const fetchObjects = useStore((state) => state.fetchObjects)
  const setSelectedObject = useStore((state) => state.setSelectedObject)

  useEffect(() => {
    if (objects.length === 0) {
      fetchObjects()
    }
  }, [objects.length, fetchObjects])

  // Compute orbit ring radii + tilt from the planet's 3D scene position
  const orbitData = useMemo(() => {
    return objects
      .filter((obj) => PLANET_IDS.has(obj.id))
      .map((obj) => {
        const [sx, sy, sz] = positionToScene(obj.x ?? 0, obj.y ?? 0, obj.z ?? 0)
        const radius = Math.sqrt(sx * sx + sy * sy + sz * sz)
        const xzDist = Math.sqrt(sx * sx + sz * sz)
        // Elevation angle above the XZ plane
        const alpha = Math.atan2(sy, xzDist)
        // Azimuth angle in XZ plane
        const theta = Math.atan2(sz, sx)
        // Decompose tilt into Euler XZ rotations
        return {
          id: obj.id,
          radius,
          tiltX: -alpha * Math.sin(theta),
          tiltZ: alpha * Math.cos(theta),
        }
      })
  }, [objects])

  return (
    <>
      {/* Click empty space to deselect */}
      <mesh visible={false} onClick={() => setSelectedObject(null)}>
        <sphereGeometry args={[500, 8, 8]} />
        <meshBasicMaterial side={1} />
      </mesh>
      <ambientLight intensity={0.08} />
      <Starfield />
      <SunMesh />
      {orbitData.map((orbit) => (
        <OrbitRing key={orbit.id} radius={orbit.radius} tiltX={orbit.tiltX} tiltZ={orbit.tiltZ} />
      ))}
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={3}
        maxDistance={200}
        enablePan
        panSpeed={0.5}
        rotateSpeed={0.5}
      />
      {objects.map((obj) => (
        <CelestialBody key={obj.id} object={obj} />
      ))}
    </>
  )
}

const deepSpaceBg = `radial-gradient(ellipse at 30% 40%, #0a0e1a 0%, #050810 40%, #020408 100%)`

export default function SolarSystemScene() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      position: 'absolute',
      top: 0,
      left: 0,
      background: deepSpaceBg,
    }}>
      <Canvas
        camera={{ position: [0, 40, 60], fov: 50 }}
        gl={{ alpha: true }}
      >
        <Scene />
      </Canvas>
    </div>
  )
}

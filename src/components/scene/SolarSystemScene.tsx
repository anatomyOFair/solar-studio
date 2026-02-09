import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useEffect } from 'react'
import { useStore } from '../../store/store'
import CelestialBody from './CelestialBody'
import Starfield from './Starfield'

function Scene() {
  const objects = useStore((state) => state.objects)
  const fetchObjects = useStore((state) => state.fetchObjects)
  const setSelectedObject = useStore((state) => state.setSelectedObject)

  useEffect(() => {
    if (objects.length === 0) {
      fetchObjects()
    }
  }, [objects.length, fetchObjects])

  return (
    <>
      {/* Click empty space to deselect */}
      <mesh visible={false} onClick={() => setSelectedObject(null)}>
        <sphereGeometry args={[500, 8, 8]} />
        <meshBasicMaterial side={1} />
      </mesh>
      <ambientLight intensity={0.15} />
      <pointLight position={[0, 0, 0]} intensity={2} distance={500} />
      <Starfield />
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

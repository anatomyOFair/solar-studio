import { Canvas, useFrame } from '@react-three/fiber'
import { CameraControls } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { Suspense, useCallback, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useStore } from '../../store/store'
import { positionToScene, radiusToScene, moonOffsetToScene, sceneToAu } from '../../utils/sceneScaling'
import { extrapolatePosition } from '../../utils/extrapolatePosition'
import CelestialBody from './CelestialBody'
import Starfield from './Starfield'
import SunMesh from './SunMesh'
import OrbitRing from './OrbitRing'
import AsteroidBelt from './AsteroidBelt'
import TourOverlay from './TourOverlay'
import CameraDistanceHUD from './CameraDistanceHUD'
import MissionTrajectory from './MissionTrajectory'
import CameraControlsImpl from 'camera-controls'

const PLANET_IDS = new Set(['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'])

const OVERVIEW_POS: [number, number, number] = [0, 40, 60]
const BOUNDS_MIN = new THREE.Vector3(-40, -20, -40)
const BOUNDS_MAX = new THREE.Vector3(40, 20, 40)
const MAX_DIST = 80

function Scene() {
  const objects = useStore((state) => state.objects)
  const objectsUpdatedAt = useStore((state) => state.objectsUpdatedAt)
  const simulatedTime = useStore((state) => state.simulatedTime)
  const fetchObjects = useStore((state) => state.fetchObjects)
  const selectedObject = useStore((state) => state.selectedObject)
  const controlsRef = useRef<CameraControlsImpl>(null)
  const setSceneReady = useStore((state) => state.setSceneReady)
  const setCameraDistAu = useStore((state) => state.setCameraDistAu)
  const activeMission = useStore((state) => state.activeMission)
  const showOrbits = useStore((state) => state.showOrbits)
  const missions = useStore((state) => state.missions)
  const fetchMissions = useStore((state) => state.fetchMissions)
  const frameCount = useRef(0)
  const lastCamAu = useRef(0)

  useEffect(() => {
    if (objects.length === 0) fetchObjects()
    if (missions.length === 0) fetchMissions()
  }, [objects.length, fetchObjects, missions.length, fetchMissions])

  // Reset sceneReady on mount, signal ready after a few frames
  useEffect(() => {
    frameCount.current = 0
    useStore.getState().setSceneReady(false)
    return () => { useStore.getState().setSceneReady(false) }
  }, [])

  // Configure mouse buttons: middle-drag = pan, Shift+left-drag = pan
  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return

    controls.mouseButtons.middle = CameraControlsImpl.ACTION.TRUCK
    controls.mouseButtons.right = CameraControlsImpl.ACTION.NONE

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift' && controlsRef.current) {
        controlsRef.current.mouseButtons.left = CameraControlsImpl.ACTION.TRUCK
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift' && controlsRef.current) {
        controlsRef.current.mouseButtons.left = CameraControlsImpl.ACTION.ROTATE
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  // Focus camera on selected object, or return to overview.
  // Only runs on actual selection change — not on time slider / data refresh.
  useEffect(() => {
    if (!controlsRef.current) return

    const { simulatedTime, objectsUpdatedAt } = useStore.getState()

    if (selectedObject) {
      const effectiveTime = simulatedTime ?? new Date()
      const { x, y, z } = extrapolatePosition(selectedObject, effectiveTime, objectsUpdatedAt)
      const isMoon = selectedObject.type === 'moon'

      let tx: number, ty: number, tz: number
      if (isMoon && selectedObject.parent_body) {
        // Moon x/y/z are parent-relative offsets — position relative to parent
        const parent = objects.find(o => o.id === selectedObject.parent_body)
        if (parent) {
          const p = extrapolatePosition(parent, effectiveTime, objectsUpdatedAt)
          const parentScene = positionToScene(p.x, p.y, p.z)
          const offset = moonOffsetToScene(x, y, z, parent.radius_km ?? 6371, parent.id)
          tx = parentScene[0] + offset[0]
          ty = parentScene[1] + offset[1]
          tz = parentScene[2] + offset[2]
        } else {
          ;[tx, ty, tz] = positionToScene(x, y, z)
        }
      } else {
        ;[tx, ty, tz] = positionToScene(x, y, z)
      }

      const radius = radiusToScene(selectedObject.radius_km ?? 1000, selectedObject.id) * (isMoon ? 0.5 : 1)

      const dist = Math.max(radius * 6, 3)

      // Approach from the camera's current direction to avoid spinning
      const cam = controlsRef.current.camera.position
      const dirX = cam.x - tx
      const dirY = cam.y - ty
      const dirZ = cam.z - tz
      const dirLen = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ) || 1
      controlsRef.current.setLookAt(
        tx + (dirX / dirLen) * dist,
        ty + (dirY / dirLen) * dist,
        tz + (dirZ / dirLen) * dist,
        tx, ty, tz,
        true
      )
    } else {
      // Pull back gently — setTarget + dolly, clamped
      controlsRef.current.setTarget(0, 0, 0, true)
      controlsRef.current.dollyTo(30, true)
    }
  }, [selectedObject])

  // Clamp camera-controls + signal scene readiness after textures are GPU-bound
  useFrame(() => {
    if (!controlsRef.current) return
    const c = controlsRef.current as any // eslint-disable-line @typescript-eslint/no-explicit-any
    ;(c._targetEnd as THREE.Vector3).clamp(BOUNDS_MIN, BOUNDS_MAX)
    ;(c._target as THREE.Vector3).clamp(BOUNDS_MIN, BOUNDS_MAX)

    // Wait a few frames for textures to upload to GPU before revealing
    if (frameCount.current < 10) {
      frameCount.current++
      if (frameCount.current === 10) setSceneReady(true)
    }

    // Camera distance from Sun (throttled — only update when value shifts meaningfully)
    const camAu = sceneToAu(controlsRef.current.camera.position.length())
    if (Math.abs(camAu - lastCamAu.current) > 0.01) {
      lastCamAu.current = camAu
      setCameraDistAu(camAu)
    }
  })

  const orbitData = useMemo(() => {
    const effectiveTime = simulatedTime ?? new Date()
    return objects
      .filter((obj) => PLANET_IDS.has(obj.id))
      .map((obj) => {
        const { x, y, z } = extrapolatePosition(obj, effectiveTime, objectsUpdatedAt)
        const [sx, sy, sz] = positionToScene(x, y, z)
        const radius = Math.sqrt(sx * sx + sy * sy + sz * sz)
        const xzDist = Math.sqrt(sx * sx + sz * sz)
        const alpha = Math.atan2(sy, xzDist)
        const theta = Math.atan2(sz, sx)
        return {
          id: obj.id,
          name: obj.name,
          radius,
          distanceAu: sceneToAu(radius),
          tiltX: -alpha * Math.sin(theta),
          tiltZ: alpha * Math.cos(theta),
        }
      })
  }, [objects, simulatedTime, objectsUpdatedAt])

  return (
    <>
      <ambientLight intensity={0.08} />
      <Starfield />
      <SunMesh />
      <AsteroidBelt />
      {showOrbits && orbitData.map((orbit) => (
        <OrbitRing key={orbit.id} radius={orbit.radius} tiltX={orbit.tiltX} tiltZ={orbit.tiltZ} distanceAu={orbit.distanceAu} />
      ))}
      <CameraControls
        ref={controlsRef}
        minDistance={0.5}
        maxDistance={MAX_DIST}
        smoothTime={0.2}
        draggingSmoothTime={0.1}
        truckSpeed={5}
        restThreshold={0.005}
      />
      {objects.map((obj) => (
        <CelestialBody key={obj.id} object={obj} />
      ))}
      {activeMission && (
        <MissionTrajectory key={activeMission.id} mission={activeMission} />
      )}
      <EffectComposer>
        <Bloom
          mipmapBlur
          luminanceThreshold={0.9}
          luminanceSmoothing={0.1}
          intensity={2.0}
          radius={0.85}
        />
      </EffectComposer>
    </>
  )
}

const deepSpaceBg = `radial-gradient(ellipse at 30% 40%, #0a0e1a 0%, #050810 40%, #020408 100%)`

export default function SolarSystemScene() {
  // Escape key to deselect (× button in ScenePanel also works)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        useStore.getState().setSelectedObject(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Click on empty canvas = deselect, but not on drag
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null)
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerDownPos.current = { x: e.clientX, y: e.clientY }
  }, [])
  const handlePointerMissed = useCallback((e: MouseEvent) => {
    if (pointerDownPos.current) {
      const dx = e.clientX - pointerDownPos.current.x
      const dy = e.clientY - pointerDownPos.current.y
      if (dx * dx + dy * dy > 36) return // drag, not click
    }
    useStore.getState().setSelectedObject(null)
  }, [])

  return (
    <div
      data-hint="scene-3d"
      onPointerDown={handlePointerDown}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        background: deepSpaceBg,
      }}
    >
      <Canvas
        camera={{ position: OVERVIEW_POS, fov: 50 }}
        gl={{ alpha: true }}
        onPointerMissed={handlePointerMissed}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      <CameraDistanceHUD />
      <TourOverlay />
    </div>
  )
}

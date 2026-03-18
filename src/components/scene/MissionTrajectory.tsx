import { useMemo } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { positionToScene } from '../../utils/sceneScaling'
import { useStore } from '../../store/store'
import type { MissionDef } from '../../data/missions'

interface Props {
  mission: MissionDef
}

export default function MissionTrajectory({ mission }: Props) {
  const missionTime = useStore((state) => state.missionTime)
  const activeMission = useStore((state) => state.activeMission)
  const showMissionLabels = useStore((state) => state.showMissionLabels)
  const isActive = activeMission?.id === mission.id

  const { curve, flybyPoints } = useMemo(() => {
    const pts = mission.waypoints.map((w) => {
      const [sx, sy, sz] = positionToScene(w.x, w.y, w.z)
      return new THREE.Vector3(sx, sy, sz)
    })

    const curve = pts.length >= 2
      ? new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5)
      : null

    const flybyPoints = mission.waypoints
      .filter((w) => w.label)
      .map((w) => {
        const [sx, sy, sz] = positionToScene(w.x, w.y, w.z)
        return { label: w.label!, position: new THREE.Vector3(sx, sy, sz) }
      })

    return { curve, flybyPoints }
  }, [mission.waypoints])

  const lineGeometry = useMemo(() => {
    if (!curve) return null
    const points = curve.getPoints(200)
    return new THREE.BufferGeometry().setFromPoints(points)
  }, [curve])

  // Interpolate marker position along curve
  const markerPosition = useMemo(() => {
    if (!curve || mission.waypoints.length < 2) return null
    const effectiveTime = missionTime ?? new Date()
    const timeMs = effectiveTime.getTime()
    const firstEpoch = new Date(mission.waypoints[0].epoch).getTime()
    const lastEpoch = new Date(mission.waypoints[mission.waypoints.length - 1].epoch).getTime()
    const span = lastEpoch - firstEpoch
    if (span <= 0) return curve.getPoint(0)
    const t = Math.max(0, Math.min(1, (timeMs - firstEpoch) / span))
    return curve.getPoint(t)
  }, [missionTime, mission.waypoints, curve])

  if (!lineGeometry || !curve) return null

  return (
    <group>
      {/* Trajectory line */}
      <line>
        <bufferGeometry attach="geometry" {...lineGeometry} />
        <lineBasicMaterial
          attach="material"
          color={mission.color}
          transparent
          opacity={isActive ? 0.7 : 0.2}
        />
      </line>

      {/* Spacecraft marker */}
      {markerPosition && (
        <>
          <mesh position={markerPosition}>
            <sphereGeometry args={[isActive ? 0.15 : 0.08, 12, 12]} />
            <meshBasicMaterial color={mission.color} />
          </mesh>
          {showMissionLabels && (
            <Html position={markerPosition} center zIndexRange={[1, 0]} style={{ pointerEvents: 'none' }}>
              <div style={{
                color: mission.color,
                fontSize: 9,
                whiteSpace: 'nowrap',
                userSelect: 'none',
                opacity: isActive ? 1 : 0.5,
                fontFamily: 'system-ui, -apple-system, sans-serif',
                textShadow: '0 0 4px rgba(0,0,0,0.8)',
              }}>
                {mission.name}
              </div>
            </Html>
          )}
        </>
      )}

      {/* Flyby labels (only when active) */}
      {isActive && showMissionLabels && flybyPoints.map((fp, i) => (
        <Html key={i} position={fp.position} center zIndexRange={[1, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(10, 15, 26, 0.7)',
            border: `1px solid ${mission.color}44`,
            borderRadius: 4,
            padding: '2px 6px',
            color: 'rgba(255,255,255,0.7)',
            fontSize: 9,
            whiteSpace: 'nowrap',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}>
            {fp.label}
          </div>
        </Html>
      ))}
    </group>
  )
}

import type { CelestialObject } from '../types'

const MS_PER_DAY = 86_400_000

/**
 * Linear extrapolation of heliocentric position using velocity.
 * position(t) = position_ref + velocity * dt
 *
 * Accurate enough over the 5-day slider range since orbital
 * curvature is negligible at that timescale.
 */
export function extrapolatePosition(
  obj: CelestialObject,
  effectiveTime: Date,
  referenceTime: Date
): { x: number; y: number; z: number } {
  const x = obj.x ?? 0
  const y = obj.y ?? 0
  const z = obj.z ?? 0

  if (obj.vx == null || obj.vy == null || obj.vz == null) {
    return { x, y, z }
  }

  const dt = (effectiveTime.getTime() - referenceTime.getTime()) / MS_PER_DAY

  return {
    x: x + obj.vx * dt,
    y: y + obj.vy * dt,
    z: z + obj.vz * dt,
  }
}

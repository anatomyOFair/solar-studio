/**
 * Scaling utilities for converting real astronomical units
 * to Three.js scene coordinates.
 *
 * Uses power-law compression so all planets fit in one view,
 * with exaggerated body sizes for visibility.
 */

const AU_SCALE = 20
const POSITION_EXPONENT = 0.55

/** Convert a distance (AU) to scene units */
export function auToScene(au: number): number {
  return Math.pow(Math.abs(au) * AU_SCALE, POSITION_EXPONENT)
}

/** Convert scene units back to AU (inverse of auToScene) */
export function sceneToAu(scene: number): number {
  return Math.pow(scene, 1 / POSITION_EXPONENT) / AU_SCALE
}

/**
 * Convert heliocentric x,y,z (AU) to scene position [x, y, z].
 * Compresses distance while preserving direction,
 * swaps axes: astronomical y → scene -z, z → scene y
 */
export function positionToScene(x: number, y: number, z: number): [number, number, number] {
  const dist = Math.sqrt(x * x + y * y + z * z)
  if (dist === 0) return [0, 0, 0]
  const sceneDist = auToScene(dist)
  return [
    (x / dist) * sceneDist,
    (z / dist) * sceneDist,
    (-y / dist) * sceneDist,
  ]
}

/** Convert real radius (km) to display radius — power-law scaling */
const SUN_RADIUS = 1.4
const SIZE_BASE = 0.08      // Earth-sized planet = 0.08 scene units
const SIZE_EXPONENT = 0.65  // between linear (1.0) and sqrt (0.5)
const MIN_PLANET_SIZE = 0.025

export function radiusToScene(radiusKm: number, id: string): number {
  if (id === 'sun') return SUN_RADIUS
  return Math.max(MIN_PLANET_SIZE, Math.pow(radiusKm / 6371, SIZE_EXPONENT) * SIZE_BASE)
}

/** Planet colors by object ID */
export const PLANET_COLORS: Record<string, string> = {
  sun: '#ffcc33',
  mercury: '#b0b0b0',
  venus: '#e8cda0',
  earth: '#4477cc',
  mars: '#c1440e',
  jupiter: '#c88b3a',
  saturn: '#e8d191',
  uranus: '#7ec8e3',
  neptune: '#3f54ba',
  moon: '#cccccc',
  titan: '#d4a017',
  ganymede: '#a89070',
  europa: '#c8bfa0',
}

/** Default color for unknown objects */
export const DEFAULT_COLOR = '#888888'

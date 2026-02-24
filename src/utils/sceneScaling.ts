/**
 * Scaling utilities for converting real astronomical units
 * to Three.js scene coordinates.
 *
 * The solar system spans ~30 AU (Neptune) but inner planets are < 2 AU.
 * We use power-law compression so everything is visible in one scene.
 */

const AU_SCALE = 20
const POSITION_EXPONENT = 0.55

/** Compress a distance (AU) to scene units */
export function auToScene(au: number): number {
  return Math.pow(Math.abs(au) * AU_SCALE, POSITION_EXPONENT)
}

/**
 * Convert heliocentric x,y,z (AU) to scene position [x, y, z].
 * Compresses the total distance while preserving direction,
 * then swaps axes: astronomical y → scene -z, astronomical z → scene y
 * to put the ecliptic plane on the XZ plane in Three.js.
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

/**
 * Convert real radius (km) to display radius using square-root scaling.
 * Sqrt is the standard for interactive orreries because humans judge
 * size by area (area ∝ r²), so sqrt makes visual areas proportional
 * to real radii. Sun is capped to avoid engulfing inner planets.
 */
const BASE_PLANET_SIZE = 0.3   // Earth = 0.3 scene units
const MIN_PLANET_SIZE = 0.12   // minimum clickable size

export function radiusToScene(radiusKm: number, id: string): number {
  if (id === 'sun') return 2.0
  return Math.max(MIN_PLANET_SIZE, Math.sqrt(radiusKm / 6371) * BASE_PLANET_SIZE)
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

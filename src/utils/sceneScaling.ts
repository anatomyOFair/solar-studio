/**
 * Scaling utilities for converting real astronomical units
 * to Three.js scene coordinates.
 *
 * The solar system spans ~30 AU (Neptune) but inner planets are < 2 AU.
 * We use power-law compression so everything is visible in one scene.
 */

const AU_SCALE = 15
const POSITION_EXPONENT = 0.55

/** Convert a single AU value to compressed scene units */
export function auToScene(au: number): number {
  return Math.sign(au) * Math.pow(Math.abs(au) * AU_SCALE, POSITION_EXPONENT)
}

/** Convert heliocentric x,y,z (AU) to scene position [x, y, z] */
export function positionToScene(x: number, y: number, z: number): [number, number, number] {
  return [auToScene(x), auToScene(z), auToScene(-y)]
  // Swap y/z: astronomical y → scene -z, astronomical z → scene y
  // This puts the ecliptic plane on the XZ plane in Three.js
}

/** Convert real radius (km) to display radius. Exaggerated so planets are clickable. */
export function radiusToScene(radiusKm: number, id: string): number {
  if (id === 'sun') return 2.0
  return Math.max(0.3, Math.log10(radiusKm / 1000) * 0.6)
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

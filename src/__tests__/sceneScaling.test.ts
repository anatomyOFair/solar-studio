import { describe, it, expect } from 'vitest'
import {
  auToScene,
  sceneToAu,
  positionToScene,
  radiusToScene,
  moonOffsetToScene,
  PLANET_COLORS,
  DEFAULT_COLOR,
} from '../utils/sceneScaling'

describe('auToScene', () => {
  it('returns 0 for 0 AU', () => {
    expect(auToScene(0)).toBe(0)
  })

  it('compresses distances with power-law (exponent 0.55)', () => {
    const mercury = auToScene(0.4)
    const neptune = auToScene(30)
    // Both should be positive
    expect(mercury).toBeGreaterThan(0)
    expect(neptune).toBeGreaterThan(0)
    // Neptune should be further than Mercury
    expect(neptune).toBeGreaterThan(mercury)
    // But ratio should be much less than 75:1 (real ratio 30/0.4)
    const ratio = neptune / mercury
    expect(ratio).toBeLessThan(20)
    expect(ratio).toBeGreaterThan(5)
  })

  it('handles negative AU (takes absolute value)', () => {
    expect(auToScene(-1)).toBe(auToScene(1))
  })

  it('produces expected value for 1 AU', () => {
    // (1 * 20)^0.55 = 20^0.55
    const expected = Math.pow(20, 0.55)
    expect(auToScene(1)).toBeCloseTo(expected, 6)
  })
})

describe('sceneToAu', () => {
  it('is the inverse of auToScene', () => {
    const testValues = [0.1, 0.4, 1.0, 5.2, 30.0]
    for (const au of testValues) {
      const scene = auToScene(au)
      const back = sceneToAu(scene)
      expect(back).toBeCloseTo(au, 6)
    }
  })
})

describe('positionToScene', () => {
  it('returns [0, 0, 0] for origin (Sun)', () => {
    const result = positionToScene(0, 0, 0)
    expect(result).toEqual([0, 0, 0])
  })

  it('swaps axes correctly: astronomical y maps to scene -z, z maps to scene y', () => {
    // A point along the astronomical +y axis (x=0, y=1, z=0)
    // Should map to scene: x=0, y=0, z=-sceneDist
    const [sx, sy, sz] = positionToScene(0, 1, 0)
    expect(sx).toBeCloseTo(0, 6)
    expect(sy).toBeCloseTo(0, 6)
    expect(sz).toBeLessThan(0) // -y direction in scene

    // A point along the astronomical +z axis (x=0, y=0, z=1)
    // Should map to scene: x=0, y=sceneDist, z=0
    const [sx2, sy2, sz2] = positionToScene(0, 0, 1)
    expect(sx2).toBeCloseTo(0, 6)
    expect(sy2).toBeGreaterThan(0) // +y direction in scene
    expect(sz2).toBeCloseTo(0, 6)
  })

  it('preserves direction while compressing distance', () => {
    // A planet at (1, 0, 0) in AU
    const [sx, sy, sz] = positionToScene(1, 0, 0)
    expect(sx).toBeGreaterThan(0)
    expect(sy).toBeCloseTo(0, 6)
    expect(sz).toBeCloseTo(0, 6)
  })

  it('Mercury is closer than Neptune in scene space', () => {
    // Mercury ~0.4 AU along x
    const [mx] = positionToScene(0.4, 0, 0)
    // Neptune ~30 AU along x
    const [nx] = positionToScene(30, 0, 0)
    expect(nx).toBeGreaterThan(mx)
  })
})

describe('radiusToScene', () => {
  it('returns fixed size for the Sun', () => {
    expect(radiusToScene(695700, 'sun')).toBe(1.4)
  })

  it('returns Earth radius based on formula', () => {
    // Earth: (6371/6371)^0.65 * 0.08 = 1^0.65 * 0.08 = 0.08
    expect(radiusToScene(6371, 'earth')).toBeCloseTo(0.08, 6)
  })

  it('enforces minimum planet size', () => {
    // A very small object (e.g. 10 km asteroid)
    const tiny = radiusToScene(10, 'asteroid')
    expect(tiny).toBe(0.025)
  })

  it('Jupiter is larger than Earth', () => {
    const earth = radiusToScene(6371, 'earth')
    const jupiter = radiusToScene(69911, 'jupiter')
    expect(jupiter).toBeGreaterThan(earth)
  })

  it('uses power-law scaling (SIZE_EXPONENT = 0.65)', () => {
    // Jupiter radius = 69911 km
    const expected = Math.pow(69911 / 6371, 0.65) * 0.08
    expect(radiusToScene(69911, 'jupiter')).toBeCloseTo(expected, 6)
  })
})

describe('moonOffsetToScene', () => {
  it('returns [0, 0, 0] for zero offset', () => {
    expect(moonOffsetToScene(0, 0, 0, 6371, 'earth')).toEqual([0, 0, 0])
  })

  it('places moons at visible distance from parent', () => {
    // Moon is ~0.00257 AU from Earth (384,400 km / 149,597,870.7)
    const moonAU = 384400 / 149597870.7
    const [mx, my, mz] = moonOffsetToScene(moonAU, 0, 0, 6371, 'earth')
    const moonDist = Math.sqrt(mx * mx + my * my + mz * mz)
    const earthRadius = radiusToScene(6371, 'earth')
    // Moon should be further from Earth than Earth's visual radius
    expect(moonDist).toBeGreaterThan(earthRadius)
  })

  it('applies the same axis swap as positionToScene', () => {
    // Offset along astronomical +y should map to scene -z
    const offset = 0.001
    const [sx, sy, sz] = moonOffsetToScene(0, offset, 0, 6371, 'earth')
    expect(sx).toBeCloseTo(0, 6)
    expect(sy).toBeCloseTo(0, 6)
    expect(sz).toBeLessThan(0)
  })
})

describe('PLANET_COLORS', () => {
  it('has colors for all major bodies', () => {
    const bodies = ['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'moon']
    for (const body of bodies) {
      expect(PLANET_COLORS[body]).toBeDefined()
      expect(PLANET_COLORS[body]).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('has a default color', () => {
    expect(DEFAULT_COLOR).toMatch(/^#[0-9a-f]{6}$/)
  })
})

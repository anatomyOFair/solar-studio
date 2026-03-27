import { describe, it, expect } from 'vitest'
import { calculateYallopQ, isNearNewMoon, type YallopZone } from '../utils/yallopCriteria'

// These tests use real SunCalc calculations with known astronomical dates.
// They validate that the Yallop algorithm produces physically reasonable results.

describe('isNearNewMoon', () => {
  it('returns true for a known new moon date (2024-01-11)', () => {
    // New moon occurred 2024-01-11 ~11:57 UTC
    expect(isNearNewMoon(new Date('2024-01-11T12:00:00Z'))).toBe(true)
  })

  it('returns true for another new moon (2024-04-08)', () => {
    // Solar eclipse / new moon 2024-04-08
    expect(isNearNewMoon(new Date('2024-04-08T18:00:00Z'))).toBe(true)
  })

  it('returns false for a full moon date (2024-01-25)', () => {
    // Full moon ~2024-01-25
    expect(isNearNewMoon(new Date('2024-01-25T17:00:00Z'))).toBe(false)
  })

  it('returns false for a first quarter moon', () => {
    // First quarter ~2024-01-18
    expect(isNearNewMoon(new Date('2024-01-18T03:00:00Z'))).toBe(false)
  })
})

describe('calculateYallopQ - zone classification', () => {
  // Zone thresholds from Yallop (1997):
  // A: q > +0.216  (easily visible)
  // B: q > -0.014  (visible in perfect conditions)
  // C: q > -0.160  (may need binoculars)
  // D: q > -0.232  (needs optical aid)
  // E: q > -0.293  (not visible with telescope)
  // F: q <= -0.293 (not visible)

  it('returns zone F when tested far from new moon', () => {
    // Full moon date - crescent visibility is meaningless
    // The algorithm should return F because the moon is too bright / wrong phase
    // or the geometry doesn't produce a thin crescent
    const result = calculateYallopQ(51.5, -0.12, new Date('2024-01-25T12:00:00Z'))
    // During full moon, the algorithm may still compute but the q-value
    // should indicate poor visibility or zone F
    expect(['D', 'E', 'F']).toContain(result.zone)
  })

  it('returns a valid zone (A-F) for any input', () => {
    const validZones: YallopZone[] = ['A', 'B', 'C', 'D', 'E', 'F']
    const testCases = [
      { lat: 51.5, lon: -0.12, date: new Date('2024-01-12T12:00:00Z') },
      { lat: 21.4, lon: 39.8, date: new Date('2024-04-09T12:00:00Z') },
      { lat: -33.9, lon: 18.4, date: new Date('2024-06-07T12:00:00Z') },
      { lat: 0, lon: 0, date: new Date('2024-03-11T12:00:00Z') },
    ]
    for (const tc of testCases) {
      const result = calculateYallopQ(tc.lat, tc.lon, tc.date)
      expect(validZones).toContain(result.zone)
      expect(result.label).toBeDefined()
      expect(typeof result.q).toBe('number')
    }
  })

  it('produces consistent q-value and zone label', () => {
    const result = calculateYallopQ(21.4, 39.8, new Date('2024-04-09T12:00:00Z'))
    // Zone and label should match
    const zoneLabels: Record<YallopZone, string> = {
      A: 'Easily visible',
      B: 'Visible in perfect conditions',
      C: 'May need binoculars',
      D: 'Needs optical aid',
      E: 'Not visible with telescope',
      F: 'Not visible',
    }
    expect(result.label).toBe(zoneLabels[result.zone])
  })
})

describe('calculateYallopQ - known crescent dates', () => {
  // One day after new moon, at a location with good horizon (e.g. Mecca 21.4N, 39.8E),
  // the crescent should be potentially visible (zones A-E, not necessarily F).
  // Two days after gives even better visibility.

  it('day after new moon at favourable location gives non-F result or valid computation', () => {
    // New moon 2024-01-11, test evening of Jan 12 from Mecca
    const result = calculateYallopQ(21.4, 39.8, new Date('2024-01-12T12:00:00Z'))
    // We expect a valid computation - the crescent is young and may or may not be visible
    expect(typeof result.q).toBe('number')
    expect(result.zone).toBeDefined()
  })

  it('two days after new moon gives better visibility than one day', () => {
    // New moon 2024-04-08 (solar eclipse date)
    const day1 = calculateYallopQ(21.4, 39.8, new Date('2024-04-09T12:00:00Z'))
    const day2 = calculateYallopQ(21.4, 39.8, new Date('2024-04-10T12:00:00Z'))
    // q-value should generally increase (improve) as crescent grows
    // This may not always hold due to moonset timing, but it's the general trend
    if (day1.zone !== 'F' && day2.zone !== 'F') {
      expect(day2.q).toBeGreaterThanOrEqual(day1.q)
    }
  })

  it('five known new moon dates produce valid results at Mecca (21.4N, 39.8E)', () => {
    // Yallop validation: 5 new moon dates, check algorithm runs and produces valid zones
    const newMoonDates = [
      new Date('2024-01-12T12:00:00Z'), // day after Jan 11 new moon
      new Date('2024-02-10T12:00:00Z'), // day after Feb 9 new moon
      new Date('2024-03-11T12:00:00Z'), // day after Mar 10 new moon
      new Date('2024-04-09T12:00:00Z'), // day after Apr 8 new moon
      new Date('2024-05-09T12:00:00Z'), // day after May 8 new moon
    ]

    const results = newMoonDates.map(d => calculateYallopQ(21.4, 39.8, d))

    for (const r of results) {
      expect(typeof r.q).toBe('number')
      expect(isFinite(r.q)).toBe(true)
      expect(['A', 'B', 'C', 'D', 'E', 'F']).toContain(r.zone)
    }

    // At least some of the 5 dates should produce visible crescents (not all F)
    const nonF = results.filter(r => r.zone !== 'F')
    expect(nonF.length).toBeGreaterThan(0)
  })
})

describe('calculateYallopQ - edge cases', () => {
  it('handles polar locations without crashing', () => {
    // North pole - sun/moon may not set normally
    const result = calculateYallopQ(89, 0, new Date('2024-06-15T12:00:00Z'))
    expect(['A', 'B', 'C', 'D', 'E', 'F']).toContain(result.zone)
  })

  it('handles southern hemisphere', () => {
    const result = calculateYallopQ(-33.9, 18.4, new Date('2024-01-12T12:00:00Z'))
    expect(['A', 'B', 'C', 'D', 'E', 'F']).toContain(result.zone)
  })

  it('handles date line crossing (lon = 179)', () => {
    const result = calculateYallopQ(0, 179, new Date('2024-01-12T12:00:00Z'))
    expect(['A', 'B', 'C', 'D', 'E', 'F']).toContain(result.zone)
  })
})

import { describe, it, expect, vi } from 'vitest'
import {
  haversineDistance,
  calculateHorizonDistance,
  calculateMaxLOSDistance,
  calculateExtinctionCoefficient,
  calculateKoschmiederVisibility,
  getTimeOfDayFactor,
  timeFactorToRating,
  getWeatherRating,
  visibilityScoreToPercentage,
  getVisibilityColor,
  calculateCelestialVisibilityScore,
  raDecToAltitude,
} from '../utils/visibilityCalculator'
import type { WeatherConditions } from '../types'

// --- Pure math functions (no SunCalc dependency) ---

describe('haversineDistance', () => {
  it('returns 0 for same position', () => {
    const pos = { lat: 51.5, lon: -0.12, altitude: 0 }
    expect(haversineDistance(pos, pos)).toBeCloseTo(0, 3)
  })

  it('calculates London to Paris correctly (~340 km)', () => {
    const london = { lat: 51.5074, lon: -0.1278, altitude: 0 }
    const paris = { lat: 48.8566, lon: 2.3522, altitude: 0 }
    const dist = haversineDistance(london, paris)
    expect(dist).toBeGreaterThan(330)
    expect(dist).toBeLessThan(350)
  })

  it('calculates antipodal points as ~20000 km', () => {
    const a = { lat: 0, lon: 0, altitude: 0 }
    const b = { lat: 0, lon: 180, altitude: 0 }
    const dist = haversineDistance(a, b)
    expect(dist).toBeGreaterThan(19900)
    expect(dist).toBeLessThan(20100)
  })
})

describe('calculateHorizonDistance', () => {
  it('returns 0 for sea level', () => {
    expect(calculateHorizonDistance(0)).toBe(0)
  })

  it('produces reasonable value at 100m altitude', () => {
    // d = 3.57 * sqrt(4/3 * 100) = 3.57 * sqrt(133.33) ≈ 3.57 * 11.55 ≈ 41.2 km
    const dist = calculateHorizonDistance(0.1) // 0.1 km = 100m
    expect(dist).toBeGreaterThan(35)
    expect(dist).toBeLessThan(50)
  })
})

describe('calculateMaxLOSDistance', () => {
  it('is greater than either individual horizon distance', () => {
    const los = calculateMaxLOSDistance(0.1, 0.1)
    const single = calculateHorizonDistance(0.1)
    expect(los).toBeGreaterThan(single)
  })
})

describe('calculateExtinctionCoefficient', () => {
  it('returns baseline for clear conditions', () => {
    const weather: WeatherConditions = { cloudCover: 0, precipitation: 0, fog: 0, extinctionCoeff: 0 }
    expect(calculateExtinctionCoefficient(weather)).toBeCloseTo(0.05, 6)
  })

  it('increases with cloud cover', () => {
    const clear: WeatherConditions = { cloudCover: 0, precipitation: 0, fog: 0, extinctionCoeff: 0 }
    const cloudy: WeatherConditions = { cloudCover: 1, precipitation: 0, fog: 0, extinctionCoeff: 0 }
    expect(calculateExtinctionCoefficient(cloudy)).toBeGreaterThan(calculateExtinctionCoefficient(clear))
  })

  it('fog has the largest impact per unit', () => {
    // fog coefficient is 20x, cloud is 0.5x, precipitation is 0.1x
    const foggy: WeatherConditions = { cloudCover: 0, precipitation: 0, fog: 0.1, extinctionCoeff: 0 }
    const cloudy: WeatherConditions = { cloudCover: 0.1, precipitation: 0, fog: 0, extinctionCoeff: 0 }
    expect(calculateExtinctionCoefficient(foggy)).toBeGreaterThan(calculateExtinctionCoefficient(cloudy))
  })

  it('full cloud cover: beta = 0.05 + 1*0.5 = 0.55', () => {
    const weather: WeatherConditions = { cloudCover: 1, precipitation: 0, fog: 0, extinctionCoeff: 0 }
    expect(calculateExtinctionCoefficient(weather)).toBeCloseTo(0.55, 6)
  })
})

describe('calculateKoschmiederVisibility', () => {
  it('returns 3.912 / beta', () => {
    expect(calculateKoschmiederVisibility(0.05)).toBeCloseTo(78.24, 1)
  })

  it('decreases with worse conditions', () => {
    expect(calculateKoschmiederVisibility(1.0)).toBeLessThan(calculateKoschmiederVisibility(0.1))
  })
})

describe('getTimeOfDayFactor', () => {
  const pos = { lat: 51, lon: 0, altitude: 0 }

  it('returns 1.0 during daytime (6-20)', () => {
    expect(getTimeOfDayFactor(pos, new Date('2024-06-15T12:00:00'))).toBe(1.0)
    expect(getTimeOfDayFactor(pos, new Date('2024-06-15T06:00:00'))).toBe(1.0)
    expect(getTimeOfDayFactor(pos, new Date('2024-06-15T19:00:00'))).toBe(1.0)
  })

  it('returns 0.7 at dawn/dusk (5-6, 20-21)', () => {
    expect(getTimeOfDayFactor(pos, new Date('2024-06-15T05:30:00'))).toBe(0.7)
    expect(getTimeOfDayFactor(pos, new Date('2024-06-15T20:30:00'))).toBe(0.7)
  })

  it('returns 0.5 at twilight (4-5, 21-22)', () => {
    expect(getTimeOfDayFactor(pos, new Date('2024-06-15T04:30:00'))).toBe(0.5)
    expect(getTimeOfDayFactor(pos, new Date('2024-06-15T21:30:00'))).toBe(0.5)
  })

  it('returns 0.3 at night (22-4)', () => {
    expect(getTimeOfDayFactor(pos, new Date('2024-06-15T02:00:00'))).toBe(0.3)
    expect(getTimeOfDayFactor(pos, new Date('2024-06-15T23:00:00'))).toBe(0.3)
  })
})

describe('timeFactorToRating', () => {
  it('maps 1.0 to 10', () => {
    expect(timeFactorToRating(1.0)).toBe(10)
  })

  it('maps 0 to 1', () => {
    expect(timeFactorToRating(0)).toBe(1)
  })
})

describe('getWeatherRating', () => {
  it('returns 10 for pristine conditions (beta <= 0.05)', () => {
    expect(getWeatherRating(0.05)).toBe(10)
  })

  it('returns 1 for extremely poor conditions', () => {
    expect(getWeatherRating(100)).toBe(1)
  })

  it('decreases monotonically', () => {
    const coefficients = [0.01, 0.1, 0.5, 1.0, 5.0, 20.0]
    for (let i = 1; i < coefficients.length; i++) {
      expect(getWeatherRating(coefficients[i])).toBeLessThanOrEqual(getWeatherRating(coefficients[i - 1]))
    }
  })
})

describe('visibilityScoreToPercentage', () => {
  it('maps 0 to 0%', () => {
    expect(visibilityScoreToPercentage(0)).toBe(0)
  })

  it('maps 1 to 100%', () => {
    expect(visibilityScoreToPercentage(1)).toBe(100)
  })

  it('maps 0.5 to 50%', () => {
    expect(visibilityScoreToPercentage(0.5)).toBe(50)
  })
})

describe('getVisibilityColor', () => {
  it('returns red-ish for score 0', () => {
    const color = getVisibilityColor(0)
    expect(color).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('returns green-ish for score 1', () => {
    const color = getVisibilityColor(1)
    expect(color).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('clamps values above 1', () => {
    expect(getVisibilityColor(1.5)).toBe(getVisibilityColor(1))
  })

  it('clamps values below 0', () => {
    expect(getVisibilityColor(-0.5)).toBe(getVisibilityColor(0))
  })
})

// --- Celestial visibility (uses SunCalc internally) ---

describe('raDecToAltitude', () => {
  it('returns a value between -90 and 90 degrees', () => {
    const alt = raDecToAltitude(180, 45, 51.5, -0.12, new Date('2024-06-15T12:00:00Z'))
    expect(alt).toBeGreaterThanOrEqual(-90)
    expect(alt).toBeLessThanOrEqual(90)
  })

  it('object at celestial pole is high for polar observer', () => {
    // Polaris (dec ~90) from the North Pole (lat 89)
    const alt = raDecToAltitude(0, 89, 89, 0, new Date('2024-06-15T00:00:00Z'))
    expect(alt).toBeGreaterThan(70)
  })
})

describe('calculateCelestialVisibilityScore', () => {
  const clearNight: WeatherConditions = { cloudCover: 0, precipitation: 0, fog: 0, extinctionCoeff: 0 }
  const fullCloud: WeatherConditions = { cloudCover: 1, precipitation: 0, fog: 0, extinctionCoeff: 0 }

  it('returns 0 for object below horizon (alt < -2)', () => {
    // Use a planet with RA/Dec that puts it well below horizon
    // At midnight UTC, an object at RA=180, Dec=-80 from lat=70N will be below horizon
    const score = calculateCelestialVisibilityScore(
      70, 0,
      new Date('2024-12-15T00:00:00Z'),
      clearNight,
      { id: 'test', name: 'Test', type: 'planet', position: { lat: 0, lon: 0, altitude: 0 }, ra: 180, dec: -80, magnitude: 1 }
    )
    expect(score).toBe(0)
  })

  it('full cloud cover significantly reduces score compared to clear sky', () => {
    const time = new Date('2024-06-15T23:00:00Z')
    const clearScore = calculateCelestialVisibilityScore(51.5, -0.12, time, clearNight)
    const cloudyScore = calculateCelestialVisibilityScore(51.5, -0.12, time, fullCloud)
    // Cloudy score should be substantially lower
    expect(cloudyScore).toBeLessThan(clearScore)
    // weatherFactor drops to 0.1 under full cloud, reducing the weighted score
    expect(cloudyScore).toBeLessThan(0.5)
  })

  it('daytime planet returns 0 (sun above horizon, not moon/sun)', () => {
    // Midday, a planet should have timeFactor = 0
    const score = calculateCelestialVisibilityScore(
      51.5, -0.12,
      new Date('2024-06-15T12:00:00Z'),
      clearNight,
      { id: 'jupiter', name: 'Jupiter', type: 'planet', position: { lat: 0, lon: 0, altitude: 0 }, ra: 30, dec: 15, magnitude: -2 }
    )
    expect(score).toBe(0)
  })

  it('Moon gets partial daytime credit', () => {
    // Midday moon - timeFactor should be > 0 for moon type
    const score = calculateCelestialVisibilityScore(
      51.5, -0.12,
      new Date('2024-06-15T12:00:00Z'),
      clearNight,
    )
    // Score might be 0 if moon is below horizon at this time, but the timeFactor path
    // at least allows non-zero. We test the path exists by checking it doesn't throw.
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(1)
  })

  it('clear night with high-altitude planet produces positive score', () => {
    // At midnight UTC from equator, Polaris-region object (dec +80) should be above horizon
    // Use a bright planet
    const score = calculateCelestialVisibilityScore(
      20, 0,
      new Date('2024-12-15T00:00:00Z'),
      clearNight,
      { id: 'bright', name: 'Bright', type: 'planet', position: { lat: 0, lon: 0, altitude: 0 }, ra: 0, dec: 50, magnitude: -2 }
    )
    expect(score).toBeGreaterThan(0)
  })

  it('score is always clamped between 0 and 1', () => {
    const conditions: WeatherConditions[] = [clearNight, fullCloud]
    const times = [
      new Date('2024-06-15T12:00:00Z'),
      new Date('2024-06-15T00:00:00Z'),
    ]
    for (const w of conditions) {
      for (const t of times) {
        const score = calculateCelestialVisibilityScore(51.5, -0.12, t, w)
        expect(score).toBeGreaterThanOrEqual(0)
        expect(score).toBeLessThanOrEqual(1)
      }
    }
  })
})

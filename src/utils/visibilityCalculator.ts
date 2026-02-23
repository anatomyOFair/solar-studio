import type { Position, WeatherConditions, CelestialObject } from '../types'
import SunCalc from 'suncalc'

const EARTH_RADIUS_KM = 6371
const REFRACTION_COEFFICIENT = 4 / 3

/**
 * Calculate the great circle distance between two points on Earth's surface using Haversine formula
 * @param pos1 First position
 * @param pos2 Second position
 * @returns Distance in kilometers
 */
export function haversineDistance(pos1: Position, pos2: Position): number {
  const lat1 = pos1.lat * (Math.PI / 180)
  const lat2 = pos2.lat * (Math.PI / 180)
  const deltaLat = (pos2.lat - pos1.lat) * (Math.PI / 180)
  const deltaLon = (pos2.lon - pos1.lon) * (Math.PI / 180)

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = EARTH_RADIUS_KM * c

  return distance
}

/**
 * Calculate the distance to the horizon from a given altitude
 * Formula: d = 3.57 × √(K × h)
 * @param altitude Height in kilometers
 * @returns Horizon distance in kilometers
 */
export function calculateHorizonDistance(altitude: number): number {
  const altitudeMeters = altitude * 1000
  return 3.57 * Math.sqrt(REFRACTION_COEFFICIENT * altitudeMeters)
}

/**
 * Calculate maximum line-of-sight distance between two points with different altitudes
 * Formula: D_max = 3.57 × (√h₁ + √h₂)
 * @param altitude1 First altitude in kilometers
 * @param altitude2 Second altitude in kilometers
 * @returns Maximum LOS distance in kilometers
 */
export function calculateMaxLOSDistance(altitude1: number, altitude2: number): number {
  const h1 = altitude1 * 1000 // Convert to meters
  const h2 = altitude2 * 1000
  return 3.57 * (Math.sqrt(REFRACTION_COEFFICIENT * h1) + Math.sqrt(REFRACTION_COEFFICIENT * h2))
}

/**
 * Calculate atmospheric extinction coefficient from weather conditions
 * Simplified model: β = β_base + (cloudCover × 0.5) + (precipitation × 0.1) + (fog × 20)
 * @param weather Weather conditions
 * @returns Extinction coefficient
 */
export function calculateExtinctionCoefficient(weather: WeatherConditions): number {
  const betaBase = 0.05 // Clear air baseline
  const betaCloud = weather.cloudCover * 0.5
  const betaPrecipitation = weather.precipitation * 0.1
  const betaFog = weather.fog * 20

  return betaBase + betaCloud + betaPrecipitation + betaFog
}

/**
 * Calculate Koschmieder's law visibility distance
 * Formula: V = 3.912 / β
 * @param extinctionCoeff Extinction coefficient
 * @returns Visibility distance in kilometers
 */
export function calculateKoschmiederVisibility(extinctionCoeff: number): number {
  return 3.912 / extinctionCoeff
}

/**
 * Calculate time of day factor based on solar position
 * Returns a factor between 0 and 1 representing visibility quality
 * @param position Observer position (not currently used, but kept for future solar calculations)
 * @param currentTime Current time
 * @returns Time factor (0-1)
 */
export function getTimeOfDayFactor(_position: Position, currentTime: Date): number {
  const hour = currentTime.getHours()

  // Simplified model:
  // 6 AM - 8 PM: Full daylight (1.0)
  // 5-6 AM, 8-9 PM: Dawn/Dusk (0.7)
  // 4-5 AM, 9-10 PM: Twilight (0.5)
  // 10 PM - 4 AM: Night (0.3)

  if (hour >= 6 && hour < 20) {
    return 1.0
  } else if ((hour >= 5 && hour < 6) || (hour >= 20 && hour < 21)) {
    return 0.7
  } else if ((hour >= 4 && hour < 5) || (hour >= 21 && hour < 22)) {
    return 0.5
  } else {
    return 0.3
  }
}

/**
 * Convert time factor to 1-10 rating
 * @param timeFactor Time factor (0-1)
 * @returns Time rating (1-10)
 */
export function timeFactorToRating(timeFactor: number): number {
  return Math.round(timeFactor * 9 + 1)
}

/**
 * Calculate weather impact rating based on extinction coefficient
 * @param extinctionCoeff Extinction coefficient
 * @returns Weather rating (1-10, where 10 is best conditions)
 */
export function getWeatherRating(extinctionCoeff: number): number {
  // Map extinction coefficient to 1-10 rating
  // Lower extinction = better visibility = higher rating
  if (extinctionCoeff <= 0.05) return 10
  if (extinctionCoeff <= 0.1) return 9
  if (extinctionCoeff <= 0.2) return 8
  if (extinctionCoeff <= 0.5) return 7
  if (extinctionCoeff <= 1.0) return 6
  if (extinctionCoeff <= 2.0) return 5
  if (extinctionCoeff <= 5.0) return 4
  if (extinctionCoeff <= 10.0) return 3
  if (extinctionCoeff <= 20.0) return 2
  return 1
}

/**
 * Calculate overall visibility score combining all factors
 * @param observerPos Observer position
 * @param targetPos Target position
 * @param weather Weather conditions
 * @param currentTime Current time
 * @returns Visibility score (0-1)
 */
export function calculateVisibilityScore(
  observerPos: Position,
  targetPos: Position,
  weather: WeatherConditions,
  currentTime: Date
): number {
  // 1. Calculate great circle distance
  const distance = haversineDistance(observerPos, targetPos)

  // 2. Check geometric visibility (with refraction)
  const observerHorizon = calculateHorizonDistance(observerPos.altitude)
  const targetHorizon = calculateHorizonDistance(targetPos.altitude)
  const maxLOS = observerHorizon + targetHorizon

  // 3. Calculate weather-based visibility limit
  const extinctionCoeff = calculateExtinctionCoefficient(weather)
  const weatherLimit = calculateKoschmiederVisibility(extinctionCoeff)

  // 4. Effective visibility is minimum of geometric and weather limits
  const effectiveLimit = Math.min(maxLOS, weatherLimit)

  // 5. Check if target is within LOS
  if (distance > effectiveLimit) {
    return 0
  }

  // 6. Apply Koschmieder contrast reduction
  const contrast = Math.exp(-extinctionCoeff * distance)

  // 7. Apply time-of-day factor
  const timeFactor = getTimeOfDayFactor(observerPos, currentTime)

  return Math.max(0, Math.min(1, contrast * timeFactor))
}

/**
 * Calculate visibility percentage from visibility score
 * @param visibilityScore Visibility score (0-1)
 * @returns Visibility percentage (0-100)
 */
export function visibilityScoreToPercentage(visibilityScore: number): number {
  return Math.round(visibilityScore * 100)
}

// ============================================================================
// CELESTIAL OBJECT VISIBILITY (Moon, planets, etc.)
// ============================================================================

/**
 * Convert RA/Dec (equatorial coordinates) to altitude at observer location.
 * Used for planets and other objects not covered by SunCalc.
 */
function raDecToAltitude(raDeg: number, decDeg: number, observerLat: number, observerLon: number, time: Date): number {
  const DEG = Math.PI / 180

  // Julian Date
  const JD = time.getTime() / 86400000 + 2440587.5

  // Greenwich Mean Sidereal Time (degrees)
  const T = (JD - 2451545.0) / 36525
  let GMST = 280.46061837 + 360.98564736629 * (JD - 2451545.0) + 0.000387933 * T * T - T * T * T / 38710000
  GMST = ((GMST % 360) + 360) % 360

  // Local Sidereal Time
  const LST = ((GMST + observerLon) % 360 + 360) % 360

  // Hour Angle
  const HA = (LST - raDeg) * DEG

  const lat = observerLat * DEG
  const dec = decDeg * DEG

  // sin(altitude) = sin(dec)*sin(lat) + cos(dec)*cos(lat)*cos(HA)
  const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(HA)

  return Math.asin(Math.max(-1, Math.min(1, sinAlt))) / DEG
}

/**
 * Calculate visibility score for celestial objects (Moon, planets, Sun, etc.)
 * Supports all object types via optional CelestialObject parameter.
 * When no object is provided, defaults to Moon behavior for backward compat.
 */
export function calculateCelestialVisibilityScore(
  observerLat: number,
  observerLon: number,
  currentTime: Date,
  weather: WeatherConditions,
  object?: CelestialObject | null
): number {
  const type = object?.type ?? 'moon'
  const id = object?.id ?? 'moon'

  // 1. Determine object altitude and brightness
  let objectAltitudeDeg: number
  let brightnessFactor: number

  if (id === 'moon' || (type === 'moon' && !object?.ra)) {
    // Earth's Moon — use SunCalc for precise position
    const moonPos = SunCalc.getMoonPosition(currentTime, observerLat, observerLon)
    objectAltitudeDeg = moonPos.altitude * (180 / Math.PI)
    const moonIllum = SunCalc.getMoonIllumination(currentTime)
    brightnessFactor = 0.1 + 0.9 * moonIllum.fraction
  } else if (id === 'sun') {
    // Sun — use SunCalc
    const sunPos = SunCalc.getPosition(currentTime, observerLat, observerLon)
    objectAltitudeDeg = sunPos.altitude * (180 / Math.PI)
    brightnessFactor = 1.0
  } else if (object?.ra != null && object?.dec != null) {
    // Planet, distant moon, or other — use RA/Dec
    objectAltitudeDeg = raDecToAltitude(object.ra, object.dec, observerLat, observerLon, currentTime)
    // Magnitude → brightness: lower magnitude = brighter (Venus -4, Jupiter -2, Saturn +0.5)
    const mag = object.magnitude ?? 2
    brightnessFactor = Math.max(0.05, Math.min(1, (6 - mag) / 10))
  } else {
    // Fallback: treat as Moon
    const moonPos = SunCalc.getMoonPosition(currentTime, observerLat, observerLon)
    objectAltitudeDeg = moonPos.altitude * (180 / Math.PI)
    const moonIllum = SunCalc.getMoonIllumination(currentTime)
    brightnessFactor = 0.1 + 0.9 * moonIllum.fraction
  }

  // 2. Hard gate: well below horizon → 0 (accounting for refraction)
  if (objectAltitudeDeg < -2) return 0

  // 3. Altitude factor — higher = less atmosphere, gentle curve
  const altitudeFactor = Math.min(1, Math.max(0, objectAltitudeDeg / 60))

  // 4. Horizon ramp — smooth transition from -2° to 10° instead of hard cut
  //    Prevents jarring green/red boundaries on the grid overlay
  const horizonRamp = objectAltitudeDeg < 10
    ? Math.max(0, (objectAltitudeDeg + 2) / 12)
    : 1

  // 5. Weather factor — clouds and fog reduce visibility
  const weatherFactor = Math.max(0, 1 - weather.cloudCover * 0.9 - weather.fog * 0.5)

  // 6. Time-of-day factor (sun position)
  const sunPos = SunCalc.getPosition(currentTime, observerLat, observerLon)
  const sunAltitudeDeg = sunPos.altitude * (180 / Math.PI)

  let timeFactor: number
  if (id === 'sun') {
    timeFactor = sunAltitudeDeg > 0 ? 1.0 : 0
  } else if (sunAltitudeDeg < -18) {
    timeFactor = 1.0 // Astronomical night
  } else if (sunAltitudeDeg < -12) {
    timeFactor = 0.9 // Nautical twilight
  } else if (sunAltitudeDeg < -6) {
    timeFactor = 0.75 // Civil twilight
  } else if (sunAltitudeDeg < 0) {
    timeFactor = 0.5 // Sun just below horizon
  } else if (id === 'moon' || type === 'moon') {
    timeFactor = Math.max(0.2, 0.5 - sunAltitudeDeg / 180)
  } else {
    // Planets not visible during day — hard gate
    timeFactor = 0
  }

  // Hard gate: daytime for non-sun/non-moon → 0
  if (timeFactor <= 0) return 0

  // 7. Weighted average, then apply horizon ramp as multiplier
  //    Weather and time are the most critical, altitude and brightness secondary
  const rawScore = (
    0.30 * weatherFactor +
    0.30 * timeFactor +
    0.25 * altitudeFactor +
    0.15 * brightnessFactor
  )

  return Math.max(0, Math.min(1, rawScore * horizonRamp))
}

/**
 * Get detailed visibility breakdown for UI display.
 * Supports any celestial object via optional parameter.
 */
export function getCelestialVisibilityBreakdown(
  observerLat: number,
  observerLon: number,
  currentTime: Date,
  weather: WeatherConditions,
  object?: CelestialObject | null
): {
  score: number
  objectAltitude: number
  illumination: number | null
  isAboveHorizon: boolean
  weatherRating: number
  timeRating: number
} {
  const id = object?.id ?? 'moon'

  // Get object altitude
  let objectAltitudeDeg: number
  let illumination: number | null = null

  if (id === 'moon' || (object?.type === 'moon' && !object?.ra)) {
    const moonPos = SunCalc.getMoonPosition(currentTime, observerLat, observerLon)
    objectAltitudeDeg = moonPos.altitude * (180 / Math.PI)
    illumination = SunCalc.getMoonIllumination(currentTime).fraction * 100
  } else if (id === 'sun') {
    const sunPos = SunCalc.getPosition(currentTime, observerLat, observerLon)
    objectAltitudeDeg = sunPos.altitude * (180 / Math.PI)
  } else if (object?.ra != null && object?.dec != null) {
    objectAltitudeDeg = raDecToAltitude(object.ra, object.dec, observerLat, observerLon, currentTime)
  } else {
    const moonPos = SunCalc.getMoonPosition(currentTime, observerLat, observerLon)
    objectAltitudeDeg = moonPos.altitude * (180 / Math.PI)
    illumination = SunCalc.getMoonIllumination(currentTime).fraction * 100
  }

  const isAboveHorizon = objectAltitudeDeg > 0
  const score = calculateCelestialVisibilityScore(observerLat, observerLon, currentTime, weather, object)

  const weatherRating = Math.round((1 - weather.cloudCover) * 9 + 1)

  const sunPos = SunCalc.getPosition(currentTime, observerLat, observerLon)
  const sunAltitudeDeg = sunPos.altitude * (180 / Math.PI)

  let timeRating: number
  if (id === 'sun') {
    timeRating = sunAltitudeDeg > 0 ? 10 : 1
  } else if (sunAltitudeDeg < -18) timeRating = 10
  else if (sunAltitudeDeg < -12) timeRating = 9
  else if (sunAltitudeDeg < -6) timeRating = 7
  else if (sunAltitudeDeg < 0) timeRating = 5
  else timeRating = Math.max(2, Math.round(5 - sunAltitudeDeg / 18))

  return {
    score,
    objectAltitude: objectAltitudeDeg,
    illumination,
    isAboveHorizon,
    weatherRating,
    timeRating,
  }
}

// ============================================================================
// COLOR GRADIENT FOR VISIBILITY
// ============================================================================

/**
 * Convert HSL to Hex color
 */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100

  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2

  let r = 0,
    g = 0,
    b = 0

  if (h >= 0 && h < 60) {
    r = c
    g = x
    b = 0
  } else if (h >= 60 && h < 120) {
    r = x
    g = c
    b = 0
  } else if (h >= 120 && h < 180) {
    r = 0
    g = c
    b = x
  }

  r = Math.round((r + m) * 255)
  g = Math.round((g + m) * 255)
  b = Math.round((b + m) * 255)

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * Interpolate between red (0% visibility) and green (100% visibility)
 * Uses HSL color space for smooth perceptual gradient
 *
 * @param score Visibility score (0-1)
 * @returns Hex color string
 */
export function getVisibilityColor(score: number): string {
  // Clamp score to 0-1
  const s = Math.max(0, Math.min(1, score))

  // HSL interpolation: Red (0) -> Yellow (60) -> Green (120)
  // Hue: 0 (red) at score=0, 120 (green) at score=1
  const hue = s * 120

  // Saturation: Keep high for vivid colors
  const saturation = 70

  // Lightness: Slightly brighter in the middle (yellow), darker at extremes
  const lightness = 45 + Math.sin(s * Math.PI) * 10

  return hslToHex(hue, saturation, lightness)
}


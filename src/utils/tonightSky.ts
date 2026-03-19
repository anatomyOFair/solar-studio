import SunCalc from 'suncalc'
import type { CelestialObject, WeatherConditions } from '../types'
import { calculateCelestialVisibilityScore, raDecToAltitude } from './visibilityCalculator'

// ── Types ──────────────────────────────────────────────────────────────

export interface RiseSet {
  rise: Date | null
  set: Date | null
  alwaysUp?: boolean
  alwaysDown?: boolean
}

export interface NightWindow {
  sunset: Date
  sunrise: Date
  isValidNight: boolean // false for polar day (sun never sets)
  isPolarNight: boolean // true for polar night (sun never rises)
}

export interface TonightObject {
  object: CelestialObject
  riseSet: RiseSet
  transitTime: Date | null
  transitAltitude: number
  peakVisibilityScore: number
  currentAltitude: number
  isCurrentlyUp: boolean
}

// ── Rise/Set Calculations (extracted from RiseSetTimes.tsx) ────────────

export function getMoonRiseSet(date: Date, lat: number, lon: number): RiseSet {
  const times = SunCalc.getMoonTimes(date, lat, lon)
  return {
    rise: times.rise ?? null,
    set: times.set ?? null,
    alwaysUp: times.alwaysUp,
    alwaysDown: times.alwaysDown,
  }
}

export function getSunRiseSet(date: Date, lat: number, lon: number): RiseSet {
  const times = SunCalc.getTimes(date, lat, lon)
  return {
    rise: times.sunrise,
    set: times.sunset,
  }
}

/**
 * Calculate rise/set times for an object with known RA/Dec.
 * Uses the hour angle formula: cos(H0) = (sin(h0) - sin(lat)*sin(dec)) / (cos(lat)*cos(dec))
 * where h0 = -0.833° (standard refraction correction).
 */
export function getRaDecRiseSet(ra: number, dec: number, lat: number, lon: number, date: Date): RiseSet {
  const RAD = Math.PI / 180
  const h0 = -0.833 * RAD

  const latRad = lat * RAD
  const decRad = dec * RAD

  const cosH0 = (Math.sin(h0) - Math.sin(latRad) * Math.sin(decRad)) / (Math.cos(latRad) * Math.cos(decRad))

  if (cosH0 < -1) return { rise: null, set: null, alwaysUp: true }
  if (cosH0 > 1) return { rise: null, set: null, alwaysDown: true }

  const H0 = Math.acos(cosH0) / RAD
  const H0_hours = H0 / 15

  const midnight = new Date(date)
  midnight.setUTCHours(0, 0, 0, 0)
  const JD0 = midnight.getTime() / 86400000 + 2440587.5
  const T0 = (JD0 - 2451545.0) / 36525
  let GMST0 = 280.46061837 + 360.98564736629 * (JD0 - 2451545.0) + 0.000387933 * T0 * T0
  GMST0 = ((GMST0 % 360) + 360) % 360

  let transitHours = ((ra - lon - GMST0) / 360.98564736629) * 24
  transitHours = ((transitHours % 24) + 24) % 24

  const riseHours = transitHours - H0_hours
  const setHours = transitHours + H0_hours

  const rise = new Date(midnight)
  rise.setUTCMinutes(Math.round(riseHours * 60))

  const set = new Date(midnight)
  set.setUTCMinutes(Math.round(setHours * 60))

  return { rise, set }
}

export function getRiseSetForObject(object: CelestialObject, date: Date, lat: number, lon: number): RiseSet {
  if (object.id === 'moon') return getMoonRiseSet(date, lat, lon)
  if (object.id === 'sun') return getSunRiseSet(date, lat, lon)
  if (object.ra != null && object.dec != null) {
    return getRaDecRiseSet(object.ra, object.dec, lat, lon, date)
  }
  return { rise: null, set: null }
}

// ── Night Window ───────────────────────────────────────────────────────

export function getNightWindow(lat: number, lon: number, effectiveTime: Date): NightWindow {
  const todaySun = SunCalc.getTimes(effectiveTime, lat, lon)

  // Check polar day / polar night
  if (isNaN(todaySun.sunset.getTime()) || isNaN(todaySun.sunrise.getTime())) {
    const sunPos = SunCalc.getPosition(effectiveTime, lat, lon)
    if (sunPos.altitude > 0) {
      // Sun is up and never sets - polar day
      return { sunset: todaySun.sunset, sunrise: todaySun.sunrise, isValidNight: false, isPolarNight: false }
    } else {
      // Sun is down and never rises - polar night (great for observing!)
      const windowStart = new Date(effectiveTime)
      windowStart.setUTCHours(0, 0, 0, 0)
      const windowEnd = new Date(windowStart)
      windowEnd.setDate(windowEnd.getDate() + 1)
      return { sunset: windowStart, sunrise: windowEnd, isValidNight: true, isPolarNight: true }
    }
  }

  // Normal case: compute tonight's window
  const tomorrow = new Date(effectiveTime)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowSun = SunCalc.getTimes(tomorrow, lat, lon)

  return {
    sunset: todaySun.sunset,
    sunrise: tomorrowSun.sunrise,
    isValidNight: true,
    isPolarNight: false,
  }
}

// ── Transit Time ───────────────────────────────────────────────────────

function getTransitForObject(
  object: CelestialObject,
  lat: number,
  lon: number,
  date: Date
): { time: Date | null; altitude: number } {
  if (object.id === 'moon') {
    // For Moon, find the time of max altitude by sampling hourly
    return sampleMaxAltitude(object, lat, lon, date, (t) => {
      const pos = SunCalc.getMoonPosition(t, lat, lon)
      return pos.altitude * (180 / Math.PI)
    })
  }

  if (object.ra == null || object.dec == null) {
    return { time: null, altitude: 0 }
  }

  const midnight = new Date(date)
  midnight.setUTCHours(0, 0, 0, 0)
  const JD0 = midnight.getTime() / 86400000 + 2440587.5
  const T0 = (JD0 - 2451545.0) / 36525
  let GMST0 = 280.46061837 + 360.98564736629 * (JD0 - 2451545.0) + 0.000387933 * T0 * T0
  GMST0 = ((GMST0 % 360) + 360) % 360

  let transitHours = ((object.ra - lon - GMST0) / 360.98564736629) * 24
  transitHours = ((transitHours % 24) + 24) % 24

  const transitTime = new Date(midnight)
  transitTime.setUTCMinutes(Math.round(transitHours * 60))

  // Transit altitude = 90 - |lat - dec|
  const transitAlt = 90 - Math.abs(lat - object.dec)

  return { time: transitTime, altitude: Math.max(0, transitAlt) }
}

function sampleMaxAltitude(
  _object: CelestialObject,
  _lat: number,
  _lon: number,
  date: Date,
  altitudeFn: (time: Date) => number
): { time: Date | null; altitude: number } {
  let maxAlt = -90
  let maxTime: Date | null = null
  const start = new Date(date)
  start.setUTCHours(0, 0, 0, 0)

  for (let h = 0; h < 24; h++) {
    const t = new Date(start.getTime() + h * 3600000)
    const alt = altitudeFn(t)
    if (alt > maxAlt) {
      maxAlt = alt
      maxTime = t
    }
  }

  return { time: maxTime, altitude: maxAlt }
}

// ── Current Altitude ───────────────────────────────────────────────────

export function getCurrentAltitude(object: CelestialObject, lat: number, lon: number, time: Date): number {
  if (object.id === 'moon') {
    const pos = SunCalc.getMoonPosition(time, lat, lon)
    return pos.altitude * (180 / Math.PI)
  }
  if (object.id === 'sun') {
    const pos = SunCalc.getPosition(time, lat, lon)
    return pos.altitude * (180 / Math.PI)
  }
  if (object.ra != null && object.dec != null) {
    return raDecToAltitude(object.ra, object.dec, lat, lon, time)
  }
  return -90
}

// ── Main Orchestrator ──────────────────────────────────────────────────

export function computeTonightObjects(
  objects: CelestialObject[],
  lat: number,
  lon: number,
  effectiveTime: Date,
  weather: WeatherConditions
): TonightObject[] {
  const nightWindow = getNightWindow(lat, lon, effectiveTime)
  if (!nightWindow.isValidNight) return []

  const results: TonightObject[] = []

  for (const obj of objects) {
    // Skip Earth and Sun
    if (obj.id === 'earth' || obj.id === 'sun') continue

    const riseSet = getRiseSetForObject(obj, effectiveTime, lat, lon)

    const transit = getTransitForObject(obj, lat, lon, effectiveTime)
    const currentAlt = getCurrentAltitude(obj, lat, lon, effectiveTime)

    // Compute peak visibility at transit time (or current time if no transit)
    const scoreTime = transit.time ?? effectiveTime
    const peakScore = calculateCelestialVisibilityScore(lat, lon, scoreTime, weather, obj)

    results.push({
      object: obj,
      riseSet,
      transitTime: transit.time,
      transitAltitude: transit.altitude,
      peakVisibilityScore: peakScore,
      currentAltitude: currentAlt,
      isCurrentlyUp: currentAlt > 0,
    })
  }

  // Sort by peak visibility descending
  results.sort((a, b) => b.peakVisibilityScore - a.peakVisibilityScore)

  return results
}

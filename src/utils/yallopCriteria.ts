import SunCalc from 'suncalc'

const DEG = 180 / Math.PI
const RAD = Math.PI / 180

export type YallopZone = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'

export interface YallopResult {
  q: number
  zone: YallopZone
  label: string
}

const ZONE_THRESHOLDS: { zone: YallopZone; minQ: number; label: string }[] = [
  { zone: 'A', minQ: 0.216, label: 'Easily visible' },
  { zone: 'B', minQ: -0.014, label: 'Visible in perfect conditions' },
  { zone: 'C', minQ: -0.160, label: 'May need binoculars' },
  { zone: 'D', minQ: -0.232, label: 'Needs optical aid' },
  { zone: 'E', minQ: -0.293, label: 'Not visible with telescope' },
]

const ZONE_F: YallopResult = { q: -1, zone: 'F', label: 'Not visible' }

/**
 * Check if the Moon is near new moon (illumination < 10%).
 */
export function isNearNewMoon(date: Date): boolean {
  const illum = SunCalc.getMoonIllumination(date)
  return illum.fraction < 0.10
}

/**
 * Calculate the Yallop q-value and visibility zone for a crescent moon
 * observation at a given location and date.
 *
 * Based on Yallop (1997) NAO Technical Note No. 69.
 *
 * The q-value is computed from:
 *   ARCV — geocentric altitude difference between moon and sun
 *   W'   — topocentric crescent width (arcminutes)
 *
 * Evaluated at the "best time" for observation:
 *   bestTime = sunset + 4/9 * (moonset - sunset)
 */
export function calculateYallopQ(lat: number, lon: number, date: Date): YallopResult {
  // 1. Get sunset and moonset times for this date
  const sunTimes = SunCalc.getTimes(date, lat, lon)
  const sunset = sunTimes.sunset

  if (!sunset || isNaN(sunset.getTime())) return ZONE_F

  const moonTimes = SunCalc.getMoonTimes(date, lat, lon)
  const moonset = moonTimes.set

  // If moon never rises or sets before sun, crescent not visible
  if (!moonset || isNaN(moonset.getTime())) {
    // Moon might be always up — check if it's above horizon at sunset
    if (moonTimes.alwaysUp) {
      // Use sunset + 30 min as best time approximation
      return computeQ(lat, lon, new Date(sunset.getTime() + 30 * 60000))
    }
    return ZONE_F
  }

  // Moon sets before sunset — crescent not visible
  if (moonset.getTime() <= sunset.getTime()) return ZONE_F

  // 2. Best time = sunset + 4/9 * lag
  const lag = moonset.getTime() - sunset.getTime()
  const bestTime = new Date(sunset.getTime() + (4 / 9) * lag)

  return computeQ(lat, lon, bestTime)
}

function computeQ(lat: number, lon: number, bestTime: Date): YallopResult {
  // Moon position at best time
  const moonPos = SunCalc.getMoonPosition(bestTime, lat, lon)
  const moonAltDeg = moonPos.altitude * DEG
  const moonAzDeg = moonPos.azimuth * DEG
  const moonDistKm = moonPos.distance // km

  // Sun position at best time
  const sunPos = SunCalc.getPosition(bestTime, lat, lon)
  const sunAltDeg = sunPos.altitude * DEG
  const sunAzDeg = sunPos.azimuth * DEG

  // ARCV — arc of vision (altitude difference)
  const ARCV = moonAltDeg - sunAltDeg

  // DAZ — difference in azimuth
  const DAZ = moonAzDeg - sunAzDeg

  // ARCL — angular separation between sun and moon centres
  const ARCVrad = ARCV * RAD
  const DAZrad = DAZ * RAD
  const cosARCL = Math.cos(ARCVrad) * Math.cos(DAZrad)
  const ARCL = Math.acos(Math.max(-1, Math.min(1, cosARCL))) * DEG

  // SD' — topocentric semi-diameter of the moon (arcminutes)
  // Moon mean radius = 1737.4 km
  const SDprime = Math.atan(1737.4 / moonDistKm) * DEG * 60

  // W' — topocentric crescent width (arcminutes)
  const Wprime = SDprime * (1 - Math.cos(ARCL * RAD))

  // q — Yallop test value
  // Cubic polynomial fit of ARCV on W', residuals scaled by 10
  const q = (ARCV - (11.8371 - 6.3226 * Wprime + 0.7319 * Wprime * Wprime - 0.1018 * Wprime * Wprime * Wprime)) / 10

  // Classify zone
  for (const { zone, minQ, label } of ZONE_THRESHOLDS) {
    if (q > minQ) return { q, zone, label }
  }

  return { q, zone: 'F', label: 'Not visible' }
}

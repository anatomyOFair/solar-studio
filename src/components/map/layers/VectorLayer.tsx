import { useEffect, useState } from 'react'
import { Polygon } from 'react-leaflet'

const RAD = Math.PI / 180
const DEG = 180 / Math.PI

/**
 * Calculate solar declination, right ascension, and GMST for a given time.
 */
function getSolarParams(time: Date) {
  const JD = time.getTime() / 86400000 + 2440587.5
  const T = (JD - 2451545.0) / 36525

  // Sun's mean longitude and mean anomaly
  const L0 = (280.46646 + 36000.76983 * T) % 360
  const M = ((357.52911 + 35999.05029 * T) % 360) * RAD

  // Equation of center
  const C =
    (1.914602 - 0.004817 * T) * Math.sin(M) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * M) +
    0.000289 * Math.sin(3 * M)

  // Sun's true ecliptic longitude
  const sunLon = ((L0 + C) % 360) * RAD

  // Obliquity of ecliptic
  const obliquity = (23.439291 - 0.0130042 * T) * RAD

  // Declination
  const dec = Math.asin(Math.sin(obliquity) * Math.sin(sunLon)) * DEG

  // Right ascension
  const ra = Math.atan2(Math.cos(obliquity) * Math.sin(sunLon), Math.cos(sunLon)) * DEG

  // Greenwich Mean Sidereal Time (degrees)
  let GMST = 280.46061837 + 360.98564736629 * (JD - 2451545.0) + 0.000387933 * T * T
  GMST = ((GMST % 360) + 360) % 360

  return { dec, ra, GMST }
}

/**
 * Build a polygon covering the night side of Earth.
 * Uses analytical terminator: for each longitude, calculates the latitude
 * where sun altitude = 0 from the solar declination and hour angle.
 */
function getNightPolygon(time: Date): [number, number][] {
  const { dec, ra, GMST } = getSolarParams(time)
  const decRad = dec * RAD

  const terminator: [number, number][] = []

  for (let lng = -180; lng <= 180; lng += 1) {
    const HA = (GMST + lng - ra) * RAD

    let lat: number
    if (Math.abs(dec) < 0.01) {
      // Near equinox: terminator is nearly a meridian
      const cosHA = Math.cos(HA)
      lat = Math.abs(cosHA) < 0.001 ? 0 : -Math.sign(cosHA) * 89.99
    } else {
      lat = Math.atan(-Math.cos(HA) / Math.tan(decRad)) * DEG
    }

    terminator.push([lat, lng])
  }

  // Night extends toward the pole opposite the sun's declination
  const nightPole = dec >= 0 ? -90 : 90

  return [
    [nightPole, -180],
    ...terminator,
    [nightPole, 180],
  ]
}

export default function VectorLayer() {
  const [nightPoly, setNightPoly] = useState<[number, number][]>([])

  useEffect(() => {
    const update = () => setNightPoly(getNightPolygon(new Date()))
    update()
    const interval = setInterval(update, 60_000)
    return () => clearInterval(interval)
  }, [])

  if (nightPoly.length === 0) return null

  return (
    <Polygon
      positions={nightPoly}
      pathOptions={{
        color: 'rgba(255,255,255,0.15)',
        weight: 1,
        fillColor: '#000',
        fillOpacity: 0.25,
      }}
    />
  )
}

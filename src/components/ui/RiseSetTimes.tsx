import { useEffect, useState, useCallback } from 'react'
import SunCalc from 'suncalc'
import { useStore } from '../../store/store'
import { colors } from '../../constants'
import type { CelestialObject } from '../../types'

interface RiseSet {
  rise: Date | null
  set: Date | null
  alwaysUp?: boolean
  alwaysDown?: boolean
}

function getMoonRiseSet(date: Date, lat: number, lon: number): RiseSet {
  const times = SunCalc.getMoonTimes(date, lat, lon)
  return {
    rise: times.rise ?? null,
    set: times.set ?? null,
    alwaysUp: times.alwaysUp,
    alwaysDown: times.alwaysDown,
  }
}

function getSunRiseSet(date: Date, lat: number, lon: number): RiseSet {
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
function getRaDecRiseSet(ra: number, dec: number, lat: number, lon: number, date: Date): RiseSet {
  const RAD = Math.PI / 180
  const h0 = -0.833 * RAD // Standard altitude for rise/set (atmospheric refraction)

  const latRad = lat * RAD
  const decRad = dec * RAD

  const cosH0 = (Math.sin(h0) - Math.sin(latRad) * Math.sin(decRad)) / (Math.cos(latRad) * Math.cos(decRad))

  if (cosH0 < -1) return { rise: null, set: null, alwaysUp: true }
  if (cosH0 > 1) return { rise: null, set: null, alwaysDown: true }

  const H0 = Math.acos(cosH0) / RAD // degrees
  const H0_hours = H0 / 15

  // GMST at midnight UTC
  const midnight = new Date(date)
  midnight.setUTCHours(0, 0, 0, 0)
  const JD0 = midnight.getTime() / 86400000 + 2440587.5
  const T0 = (JD0 - 2451545.0) / 36525
  let GMST0 = 280.46061837 + 360.98564736629 * (JD0 - 2451545.0) + 0.000387933 * T0 * T0
  GMST0 = ((GMST0 % 360) + 360) % 360

  // Transit time in hours since midnight UTC
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

function getRiseSetForObject(object: CelestialObject, date: Date, lat: number, lon: number): RiseSet {
  if (object.id === 'moon') return getMoonRiseSet(date, lat, lon)
  if (object.id === 'sun') return getSunRiseSet(date, lat, lon)
  if (object.ra != null && object.dec != null) {
    return getRaDecRiseSet(object.ra, object.dec, lat, lon, date)
  }
  return { rise: null, set: null }
}

function formatTime(date: Date | null, isLocalTime: boolean): string {
  if (!date) return '—'
  if (isLocalTime) {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }) + ' UTC'
}

export default function RiseSetTimes() {
  const selectedObject = useStore((state) => state.selectedObject)
  const map = useStore((state) => state.map)
  const isLocalTime = useStore((state) => state.isLocalTime)
  const [riseSet, setRiseSet] = useState<RiseSet | null>(null)
  const [center, setCenter] = useState<{ lat: number; lon: number } | null>(null)

  const updateCenter = useCallback(() => {
    if (!map) return
    const c = map.getCenter()
    setCenter({ lat: c.lat, lon: c.lng })
  }, [map])

  // Update on map move (debounced)
  useEffect(() => {
    if (!map) return
    updateCenter()

    let timeout: ReturnType<typeof setTimeout>
    const onMove = () => {
      clearTimeout(timeout)
      timeout = setTimeout(updateCenter, 500)
    }
    map.on('moveend', onMove)
    return () => {
      map.off('moveend', onMove)
      clearTimeout(timeout)
    }
  }, [map, updateCenter])

  // Compute rise/set
  useEffect(() => {
    if (!selectedObject || !center) {
      setRiseSet(null)
      return
    }
    setRiseSet(getRiseSetForObject(selectedObject, new Date(), center.lat, center.lon))
  }, [selectedObject, center])

  if (!riseSet || !selectedObject) return null

  return (
    <div style={{ marginTop: '6px' }}>
      <div className="flex" style={{ gap: '12px', fontSize: '11px', color: colors.text.muted }}>
        {riseSet.alwaysUp ? (
          <span>Always above horizon</span>
        ) : riseSet.alwaysDown ? (
          <span>Never rises</span>
        ) : (
          <>
            <span>
              <span style={{ color: colors.text.primary }}>Rises</span> {formatTime(riseSet.rise, isLocalTime)}
            </span>
            <span>
              <span style={{ color: colors.text.primary }}>Sets</span> {formatTime(riseSet.set, isLocalTime)}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

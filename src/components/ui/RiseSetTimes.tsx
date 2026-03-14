import { useEffect, useState, useCallback } from 'react'
import { useStore } from '../../store/store'
import { colors } from '../../constants'
import { getRiseSetForObject, type RiseSet } from '../../utils/tonightSky'

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
  const simulatedTime = useStore((state) => state.simulatedTime)
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
    const effectiveTime = simulatedTime ?? new Date()
    setRiseSet(getRiseSetForObject(selectedObject, effectiveTime, center.lat, center.lon))
  }, [selectedObject, center, simulatedTime])

  if (!riseSet || !selectedObject) return null

  return (
    <div style={{ marginTop: '6px' }}>
      <div className="flex" style={{ gap: '12px', fontSize: '11px', color: colors.text.muted, whiteSpace: 'nowrap' }}>
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

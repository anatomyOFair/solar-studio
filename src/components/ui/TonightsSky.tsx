import { useEffect, useState, useCallback } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons'
import { useStore } from '../../store/store'
import { getVisibilityColor } from '../../utils/visibilityCalculator'
import { computeTonightObjects, getNightWindow, type TonightObject, type NightWindow } from '../../utils/tonightSky'
import { getWeatherForUserLocation } from '../../utils/weatherService'
import { colors, spacing, sizes, shadows } from '../../constants'

const TYPE_COLORS: Record<string, string> = {
  planet: '#38bdf8',
  moon: '#e2e8f0',
  star: '#facc15',
  dwarf_planet: '#a78bfa',
  asteroid: '#6b7280',
  comet: '#34d399',
}

function formatTime(date: Date | null, isLocalTime: boolean): string {
  if (!date || isNaN(date.getTime())) return '--:--'
  if (isLocalTime) {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }) + ' UTC'
}

function formatAltitude(alt: number): string {
  if (alt < -0.5) return 'Below horizon'
  return `${alt.toFixed(1)}\u00B0`
}

export default function TonightsSky() {
  const isOpen = useStore((state) => state.isTonightSkyOpen)
  const closeTonightSky = useStore((state) => state.closeTonightSky)
  const setSelectedObject = useStore((state) => state.setSelectedObject)
  const selectedObject = useStore((state) => state.selectedObject)
  const isLocalTime = useStore((state) => state.isLocalTime)
  const objects = useStore((state) => state.objects)
  const map = useStore((state) => state.map)
  const simulatedTime = useStore((state) => state.simulatedTime)

  const [tonightObjects, setTonightObjects] = useState<TonightObject[]>([])
  const [nightWindow, setNightWindow] = useState<NightWindow | null>(null)
  const [loading, setLoading] = useState(false)
  const [center, setCenter] = useState<{ lat: number; lon: number } | null>(null)

  // Track map center (debounced)
  const updateCenter = useCallback(() => {
    if (!map) return
    const c = map.getCenter()
    setCenter({ lat: c.lat, lon: c.lng })
  }, [map])

  useEffect(() => {
    if (!map || !isOpen) return
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
  }, [map, isOpen, updateCenter])

  // Compute tonight's objects
  useEffect(() => {
    if (!center || !isOpen || objects.length === 0) return

    let cancelled = false
    setLoading(true)
    const effectiveTime = simulatedTime ?? new Date()

    getWeatherForUserLocation(center.lat, center.lon).then((weather) => {
      if (cancelled) return
      const window = getNightWindow(center.lat, center.lon, effectiveTime)
      const results = computeTonightObjects(objects, center.lat, center.lon, effectiveTime, weather)
      setNightWindow(window)
      setTonightObjects(results)
      setLoading(false)
    }).catch(() => {
      if (cancelled) return
      // Compute without weather data (fallback)
      const window = getNightWindow(center.lat, center.lon, effectiveTime)
      const fallbackWeather = { cloudCover: 0.3, precipitation: 0, fog: 0, extinctionCoeff: 0.2 }
      const results = computeTonightObjects(objects, center.lat, center.lon, effectiveTime, fallbackWeather)
      setNightWindow(window)
      setTonightObjects(results)
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [center, objects, simulatedTime, isOpen])

  return (
    <div
      className="fixed flex flex-col"
      style={{
        top: `calc(${spacing.md} + 48px + ${spacing.sm})`,
        left: `calc(${spacing.md} + 48px + ${spacing.sm})`,
        zIndex: sizes.zIndex.fixed,
        width: sizes.panel.width,
        maxHeight: `calc(100vh - 120px - ${spacing.xl})`,
        borderRadius: sizes.borderRadius.xl,
        border: `${sizes.panel.borderWidth} solid ${colors.navbar.border}`,
        backgroundColor: colors.navbar.background,
        backdropFilter: `blur(${sizes.blur.default})`,
        WebkitBackdropFilter: `blur(${sizes.blur.default})`,
        boxShadow: shadows.lg,
        padding: spacing.md,
        transform: isOpen ? 'translateX(0)' : `translateX(calc(-100% - ${spacing.lg}))`,
        transition: 'transform 250ms ease, opacity 200ms ease',
        overflow: 'hidden',
        pointerEvents: isOpen ? 'auto' : 'none',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: spacing.sm }}>
        <h3
          className="text-lg font-semibold tracking-wide uppercase"
          style={{ color: colors.text.primary, letterSpacing: '0.08em', margin: 0 }}
        >
          Tonight's Sky
        </h3>
        <button
          type="button"
          onClick={closeTonightSky}
          className="transition-colors hover:text-white"
          style={{
            color: colors.text.muted,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: spacing.sm,
          }}
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
      </div>

      {/* Night window summary */}
      {nightWindow && nightWindow.isValidNight && !nightWindow.isPolarNight && (
        <div style={{ fontSize: sizes.fonts.xs, color: colors.text.muted, marginBottom: spacing.sm }}>
          Sunset {formatTime(nightWindow.sunset, isLocalTime)} &rarr; Sunrise {formatTime(nightWindow.sunrise, isLocalTime)}
        </div>
      )}
      {nightWindow && !nightWindow.isValidNight && (
        <div style={{ fontSize: sizes.fonts.xs, color: colors.text.muted, marginBottom: spacing.sm }}>
          24-hour daylight &mdash; no night viewing
        </div>
      )}
      {nightWindow && nightWindow.isPolarNight && (
        <div style={{ fontSize: sizes.fonts.xs, color: colors.status.success, marginBottom: spacing.sm }}>
          Polar night &mdash; extended viewing window
        </div>
      )}

      {/* Object list */}
      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0, marginRight: `-${spacing.sm}`, paddingRight: spacing.sm }}>
        {loading ? (
          <div
            className="flex items-center justify-center"
            style={{ color: colors.text.muted, padding: spacing.xl, fontSize: sizes.fonts.sm }}
          >
            Calculating...
          </div>
        ) : tonightObjects.length === 0 ? (
          <div
            className="flex items-center justify-center text-center"
            style={{ color: colors.text.muted, padding: spacing.xl, fontSize: sizes.fonts.sm }}
          >
            No celestial objects visible tonight from this location.
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: spacing.sm }}>
            {tonightObjects.map((item) => {
              const isSelected = selectedObject?.id === item.object.id
              const scorePercent = Math.round(item.peakVisibilityScore * 100)
              const typeColor = TYPE_COLORS[item.object.type] || '#94a3b8'

              return (
                <button
                  key={item.object.id}
                  type="button"
                  onClick={() => setSelectedObject(item.object)}
                  style={{
                    backgroundColor: isSelected ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isSelected ? 'rgba(255,255,255,0.2)' : 'transparent'}`,
                    borderRadius: sizes.borderRadius.lg,
                    padding: `${spacing.sm} ${spacing.sm}`,
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    transition: 'background-color 150ms ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'
                  }}
                >
                  {/* Row 1: Type dot + Name + Magnitude */}
                  <div className="flex items-center justify-between" style={{ marginBottom: '4px' }}>
                    <div className="flex items-center" style={{ gap: '8px' }}>
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: typeColor,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ color: colors.text.primary, fontSize: sizes.fonts.sm, fontWeight: 500 }}>
                        {item.object.name}
                      </span>
                    </div>
                    {item.object.magnitude != null && (
                      <span style={{ color: colors.text.muted, fontSize: sizes.fonts.xs }}>
                        mag {item.object.magnitude.toFixed(1)}
                      </span>
                    )}
                  </div>

                  {/* Row 2: Current altitude + Best viewing time */}
                  <div className="flex items-center justify-between" style={{ marginBottom: '4px' }}>
                    <span style={{
                      color: item.isCurrentlyUp ? colors.text.secondary : colors.text.muted,
                      fontSize: sizes.fonts.xs,
                    }}>
                      Alt: {formatAltitude(item.currentAltitude)}
                    </span>
                    {item.transitTime && (
                      <span style={{ color: colors.text.muted, fontSize: sizes.fonts.xs }}>
                        Best: {formatTime(item.transitTime, isLocalTime)}
                      </span>
                    )}
                  </div>

                  {/* Row 3: Rise/Set */}
                  <div style={{ fontSize: sizes.fonts.xs, color: colors.text.muted, marginBottom: '6px' }}>
                    {item.riseSet.alwaysUp ? (
                      'Always above horizon'
                    ) : item.riseSet.alwaysDown ? (
                      'Never rises'
                    ) : (
                      <>
                        <span style={{ color: colors.text.secondary }}>Rises</span>{' '}
                        {formatTime(item.riseSet.rise, isLocalTime)}
                        {'  '}
                        <span style={{ color: colors.text.secondary }}>Sets</span>{' '}
                        {formatTime(item.riseSet.set, isLocalTime)}
                      </>
                    )}
                  </div>

                  {/* Visibility bar */}
                  <div className="flex items-center" style={{ gap: '8px' }}>
                    <div
                      style={{
                        flex: 1,
                        height: '4px',
                        borderRadius: '2px',
                        backgroundColor: colors.navbar.border,
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${scorePercent}%`,
                          borderRadius: '2px',
                          backgroundColor: getVisibilityColor(item.peakVisibilityScore),
                          transition: 'width 200ms ease',
                        }}
                      />
                    </div>
                    <span style={{ color: colors.text.muted, fontSize: '11px', minWidth: '28px', textAlign: 'right' }}>
                      {scorePercent}%
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSliders } from '@fortawesome/free-solid-svg-icons'
import { useStore } from '../../store/store'
import { getVisibilityColor } from '../../utils/visibilityCalculator'
import { computeTonightObjects, getNightWindow, type TonightObject, type NightWindow } from '../../utils/tonightSky'
import { getWeatherForUserLocation } from '../../utils/weatherService'
import { colors, spacing, sizes } from '../../constants'

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

interface TonightsSkyProps {
  location: { lat: number; lon: number }
}

export default function TonightsSky({ location }: TonightsSkyProps) {
  const setSelectedObject = useStore((state) => state.setSelectedObject)
  const selectedObject = useStore((state) => state.selectedObject)
  const isLocalTime = useStore((state) => state.isLocalTime)
  const objects = useStore((state) => state.objects)
  const simulatedTime = useStore((state) => state.simulatedTime)

  const [tonightObjects, setTonightObjects] = useState<TonightObject[]>([])
  const [nightWindow, setNightWindow] = useState<NightWindow | null>(null)
  const [loading, setLoading] = useState(false)
  const [sortBy, setSortBy] = useState<'visibility' | 'name' | 'altitude'>('visibility')
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  // Close popover on outside click
  useEffect(() => {
    if (!filterOpen) return
    const handleClick = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [filterOpen])

  // Compute tonight's objects
  useEffect(() => {
    if (objects.length === 0) return

    let cancelled = false
    setLoading(true)
    const effectiveTime = simulatedTime ?? new Date()

    getWeatherForUserLocation(location.lat, location.lon).then((weather) => {
      if (cancelled) return
      const window = getNightWindow(location.lat, location.lon, effectiveTime)
      const results = computeTonightObjects(objects, location.lat, location.lon, effectiveTime, weather)
      setNightWindow(window)
      setTonightObjects(results)
      setLoading(false)
    }).catch(() => {
      if (cancelled) return
      const window = getNightWindow(location.lat, location.lon, effectiveTime)
      const fallbackWeather = { cloudCover: 0.3, precipitation: 0, fog: 0, extinctionCoeff: 0.2 }
      const results = computeTonightObjects(objects, location.lat, location.lon, effectiveTime, fallbackWeather)
      setNightWindow(window)
      setTonightObjects(results)
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [location.lat, location.lon, objects, simulatedTime])

  const availableTypes = useMemo(() => {
    const types = new Set(tonightObjects.map((o) => o.object.type))
    return Array.from(types).sort()
  }, [tonightObjects])

  const displayObjects = useMemo(() => {
    let list = typeFilter
      ? tonightObjects.filter((o) => o.object.type === typeFilter)
      : tonightObjects
    if (sortBy === 'name') {
      list = [...list].sort((a, b) => a.object.name.localeCompare(b.object.name))
    } else if (sortBy === 'altitude') {
      list = [...list].sort((a, b) => b.currentAltitude - a.currentAltitude)
    }
    // 'visibility' is the default sort from computeTonightObjects
    return list
  }, [tonightObjects, sortBy, typeFilter])

  const chipStyle = (active: boolean) => ({
    padding: '3px 10px',
    fontSize: '11px',
    fontWeight: 500 as const,
    borderRadius: sizes.borderRadius.full,
    border: `1px solid ${active ? 'rgba(255,255,255,0.25)' : 'transparent'}`,
    backgroundColor: active ? 'rgba(255,255,255,0.1)' : 'transparent',
    color: active ? colors.text.primary : colors.text.muted,
    cursor: 'pointer',
    transition: 'all 150ms ease',
  })

  return (
    <div className="flex flex-col" style={{ width: '100%' }}>
      {/* Night window + Filter row */}
      <div className="flex items-center justify-between" style={{ marginBottom: spacing.sm }}>
        {/* Night window summary */}
        <div style={{ fontSize: sizes.fonts.xs, color: nightWindow?.isPolarNight ? colors.status.success : colors.text.muted }}>
          {nightWindow && nightWindow.isValidNight && !nightWindow.isPolarNight && (
            <>Sunset {formatTime(nightWindow.sunset, isLocalTime)} &rarr; Sunrise {formatTime(nightWindow.sunrise, isLocalTime)}</>
          )}
          {nightWindow && !nightWindow.isValidNight && (
            <>24-hour daylight &mdash; no night viewing</>
          )}
          {nightWindow && nightWindow.isPolarNight && (
            <>Polar night &mdash; extended viewing window</>
          )}
        </div>

        {/* Filter button */}
        {tonightObjects.length > 0 && (
          <div ref={filterRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setFilterOpen((v) => !v)}
              style={{
                ...chipStyle(filterOpen || sortBy !== 'visibility' || typeFilter !== null),
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <FontAwesomeIcon icon={faSliders} style={{ fontSize: '10px' }} />
              <span>Filter</span>
            </button>

            {filterOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                minWidth: '180px',
                backgroundColor: colors.navbar.base,
                border: `1px solid ${colors.navbar.border}`,
                borderRadius: sizes.borderRadius.lg,
                padding: spacing.sm,
                zIndex: sizes.zIndex.dropdown,
                display: 'flex',
                flexDirection: 'column',
                gap: spacing.sm,
              }}
            >
              {/* Sort */}
              <div>
                <span style={{ fontSize: '11px', color: colors.text.muted, display: 'block', marginBottom: '4px' }}>Sort by</span>
                <div className="flex flex-wrap" style={{ gap: '4px' }}>
                  {(['visibility', 'name', 'altitude'] as const).map((s) => (
                    <button key={s} onClick={() => setSortBy(s)} style={chipStyle(sortBy === s)}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              {/* Type */}
              <div>
                <span style={{ fontSize: '11px', color: colors.text.muted, display: 'block', marginBottom: '4px' }}>Type</span>
                <div className="flex flex-wrap" style={{ gap: '4px' }}>
                  <button onClick={() => setTypeFilter(null)} style={chipStyle(typeFilter === null)}>
                    All
                  </button>
                  {availableTypes.map((t) => (
                    <button key={t} onClick={() => setTypeFilter(t)} style={chipStyle(typeFilter === t)}>
                      <span style={{
                        display: 'inline-block',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: TYPE_COLORS[t] || '#94a3b8',
                        marginRight: '4px',
                      }} />
                      {t.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            )}
          </div>
        )}
      </div>

      {/* Object list */}
      <div className="flex-1" style={{ minHeight: 0 }}>
        {loading ? (
          <div
            className="flex items-center justify-center"
            style={{ color: colors.text.muted, padding: spacing.xl, fontSize: sizes.fonts.sm }}
          >
            Calculating...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            {displayObjects.map((item) => {
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

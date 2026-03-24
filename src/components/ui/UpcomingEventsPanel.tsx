import { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMeteor, faMoon, faCircle, faEyeSlash, faBolt, faStar } from '@fortawesome/free-solid-svg-icons'
import { useStore } from '../../store/store'
import { colors, spacing, sizes } from '../../constants'
import {
  getUpcomingEvents,
  groupEventsByDay,
  type CelestialEvent,
  type EventDay,
} from '../../utils/celestialEvents'

const EVENT_STYLES: Record<CelestialEvent['type'], { color: string; icon: any }> = {
  conjunction:    { color: '#38bdf8', icon: faCircle },
  meteor_shower:  { color: '#34d399', icon: faMeteor },
  lunar_phase:    { color: '#e2e8f0', icon: faMoon },
  eclipse:        { color: '#f59e0b', icon: faEyeSlash },
  aurora:         { color: '#a78bfa', icon: faBolt },
  special:        { color: '#c084fc', icon: faStar },
}

export default function UpcomingEventsPanel({ hideHeader }: { hideHeader?: boolean } = {}) {
  const objects = useStore((state) => state.objects)
  const simulatedTime = useStore((state) => state.simulatedTime)
  const now = simulatedTime ?? new Date()

  const [days, setDays] = useState<EventDay[]>([])
  const [loading, setLoading] = useState(true)

  // Load events from Supabase cache (populated by backend refresh script)
  useEffect(() => {
    if (objects.length === 0) return

    let cancelled = false
    setLoading(true)

    const load = async () => {
      const events = await getUpcomingEvents(objects, now)
      if (!cancelled) {
        setDays(groupEventsByDay(events, now))
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objects, now.toDateString()])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {!hideHeader && (
        <h3
          style={{
            color: colors.text.secondary,
            fontSize: '13px',
            fontWeight: 500,
            margin: 0,
            marginBottom: spacing.sm,
            flexShrink: 0,
          }}
        >
          Upcoming Events
        </h3>
      )}

      <div style={{ flex: 1, minHeight: 0, ...(hideHeader ? {} : { overflowY: 'auto' as const }) }}>
        {loading ? (
          <div
            className="flex items-center justify-center"
            style={{ color: colors.text.muted, padding: spacing.xl, fontSize: sizes.fonts.sm }}
          >
            Loading...
          </div>
        ) : days.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.sm,
              height: '100%',
              color: colors.text.muted,
            }}
          >
            <FontAwesomeIcon icon={faMoon} style={{ fontSize: '20px', opacity: 0.4 }} />
            <span style={{ fontSize: '12px' }}>No upcoming events</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {days.map((day, i) => (
              <div key={day.dateKey}>
                {/* Day header */}
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: day.label === 'Today' ? colors.text.primary : colors.text.muted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: `${i === 0 ? '0' : spacing.sm} 0 6px 0`,
                  }}
                >
                  {day.label}
                </div>

                {/* Events for this day */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {day.events.map((event) => {
                    const style = EVENT_STYLES[event.type] ?? EVENT_STYLES.special

                    return (
                      <div
                        key={event.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          padding: '6px 8px',
                          borderRadius: sizes.borderRadius.lg,
                          transition: 'background-color 150ms ease',
                          cursor: 'default',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }}
                      >
                        <FontAwesomeIcon
                          icon={style.icon}
                          style={{
                            color: style.color,
                            fontSize: '10px',
                            marginTop: '3px',
                            flexShrink: 0,
                          }}
                        />

                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              color: colors.text.primary,
                              fontSize: sizes.fonts.sm,
                              fontWeight: 500,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {event.name}
                          </div>
                          <div
                            style={{
                              color: colors.text.muted,
                              fontSize: '11px',
                              marginTop: '1px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {event.description}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

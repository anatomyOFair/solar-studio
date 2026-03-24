import { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faLocationDot,
  faRotateRight,
} from '@fortawesome/free-solid-svg-icons'
import { useStore } from '../../store/store'
import { colors, spacing, sizes } from '../../constants'
import TonightsSky from './TonightsSky'
import AltitudeChart from './AltitudeChart'
import ObservationLogCard from './ObservationLogCard'
import UpcomingEventsPanel from './UpcomingEventsPanel'

const DEFAULT_LOCATION = { lat: 40.7, lon: -74.0, label: 'New York' }

const glassCard = {
  backgroundColor: colors.navbar.background,
  backdropFilter: `blur(${sizes.blur.default})`,
  WebkitBackdropFilter: `blur(${sizes.blur.default})`,
  border: `1px solid ${colors.navbar.border}`,
  borderRadius: sizes.borderRadius.xl,
} as const

export default function HomeView() {
  const userLocation = useStore((state) => state.userLocation)
  const fetchUserLocation = useStore((state) => state.fetchUserLocation)
  const objects = useStore((state) => state.objects)
  const fetchObjects = useStore((state) => state.fetchObjects)

  // Location is now opt-in via Settings toggle - no auto-fetch

  useEffect(() => {
    if (objects.length === 0) fetchObjects()
  }, [objects.length, fetchObjects])

  const location = userLocation ?? DEFAULT_LOCATION
  const [chartObjectId, setChartObjectId] = useState('moon')

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        paddingTop: `calc(${spacing.md} + 48px + ${spacing.md})`,
        paddingLeft: spacing.md,
        paddingRight: spacing.md,
        paddingBottom: spacing.md,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gap: spacing.md,
        boxSizing: 'border-box',
      }}
    >
      {/* Tonight's Sky - spans both rows */}
      <div
        style={{
          ...glassCard,
          gridRow: '1 / 3',
          padding: spacing.md,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: spacing.md, flexShrink: 0 }}>
          <h2
            style={{
              color: colors.text.primary,
              fontSize: '18px',
              fontWeight: 600,
              margin: 0,
              marginBottom: spacing.xs,
            }}
          >
            Tonight's Sky
          </h2>
          <div className="flex items-center" style={{ gap: spacing.sm }}>
            <FontAwesomeIcon icon={faLocationDot} style={{ color: colors.text.muted, fontSize: '12px' }} />
            <span style={{ color: colors.text.muted, fontSize: '13px' }}>
              {location.label}
            </span>
            <button
              onClick={fetchUserLocation}
              className="btn-press hover:opacity-80 transition-opacity"
              style={{
                background: 'transparent',
                border: 'none',
                color: colors.text.muted,
                cursor: 'pointer',
                padding: '2px 4px',
                fontSize: '11px',
              }}
              title="Refresh location"
            >
              <FontAwesomeIcon icon={faRotateRight} />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <TonightsSky location={location} />
        </div>
      </div>

      {/* Altitude Chart */}
      <div
        style={{
          ...glassCard,
          padding: spacing.md,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm, flexShrink: 0 }}>
          <h3
            style={{
              color: colors.text.secondary,
              fontSize: '13px',
              fontWeight: 500,
              margin: 0,
            }}
          >
            Altitude
          </h3>
          <select
            value={chartObjectId}
            onChange={(e) => setChartObjectId(e.target.value)}
            style={{
              background: 'transparent',
              border: `1px solid ${colors.navbar.border}`,
              borderRadius: '6px',
              color: colors.text.secondary,
              fontSize: '11px',
              padding: '1px 6px',
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            {objects.map((obj) => (
              <option key={obj.id} value={obj.id} style={{ backgroundColor: colors.navbar.base }}>
                {obj.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <AltitudeChart location={location} objectId={chartObjectId} />
        </div>
      </div>

      {/* Upcoming Events */}
      <div
        style={{
          ...glassCard,
          padding: spacing.md,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <UpcomingEventsPanel />
      </div>

      {/* Observation Log - spans 2 columns */}
      <div
        style={{
          ...glassCard,
          gridColumn: '2 / 4',
          padding: spacing.md,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <ObservationLogCard />
      </div>
    </div>
  )
}

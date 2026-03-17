import { useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faLocationDot,
  faRotateRight,
  faCalendarDays,
} from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { useStore } from '../../store/store'
import { colors, spacing, sizes } from '../../constants'
import TonightsSky from './TonightsSky'
import AltitudeChart from './AltitudeChart'
import ObservationLogCard from './ObservationLogCard'

const DEFAULT_LOCATION = { lat: 40.7, lon: -74.0, label: 'New York' }

const glassCard = {
  backgroundColor: colors.navbar.background,
  backdropFilter: `blur(${sizes.blur.default})`,
  WebkitBackdropFilter: `blur(${sizes.blur.default})`,
  border: `1px solid ${colors.navbar.border}`,
  borderRadius: sizes.borderRadius.xl,
} as const

function PlaceholderCard({ icon, title, description, style }: {
  icon: IconDefinition
  title: string
  description: string
  style?: React.CSSProperties
}) {
  return (
    <div
      style={{
        ...glassCard,
        padding: spacing.lg,
        ...style,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
      }}
    >
      <FontAwesomeIcon
        icon={icon}
        style={{ color: colors.text.muted, fontSize: '24px', opacity: 0.5 }}
      />
      <span style={{ color: colors.text.secondary, fontSize: '14px', fontWeight: 500 }}>
        {title}
      </span>
      <span style={{ color: colors.text.muted, fontSize: '12px' }}>
        {description}
      </span>
    </div>
  )
}

export default function HomeView() {
  const userLocation = useStore((state) => state.userLocation)
  const fetchUserLocation = useStore((state) => state.fetchUserLocation)
  const objects = useStore((state) => state.objects)
  const fetchObjects = useStore((state) => state.fetchObjects)

  useEffect(() => {
    if (!userLocation) fetchUserLocation()
  }, [userLocation, fetchUserLocation])

  useEffect(() => {
    if (objects.length === 0) fetchObjects()
  }, [objects.length, fetchObjects])

  const location = userLocation ?? DEFAULT_LOCATION

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        paddingTop: `calc(${spacing.md} + 48px + ${spacing.md})`,
        paddingLeft: `calc(${spacing.md} + 48px + ${spacing.md})`,
        paddingRight: spacing.md,
        paddingBottom: spacing.md,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gap: spacing.md,
        boxSizing: 'border-box',
      }}
    >
      {/* Tonight's Sky — spans both rows */}
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
              className="hover:opacity-80 transition-opacity"
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

      {/* Upcoming Events */}
      <PlaceholderCard
        icon={faCalendarDays}
        title="Upcoming Events"
        description="Conjunctions, eclipses, meteor showers"
      />

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
          Altitude Chart
        </h3>
        <div style={{ flex: 1, minHeight: 0 }}>
          <AltitudeChart location={location} />
        </div>
      </div>

      {/* Observation Log — spans 2 columns */}
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

import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../../store/store'
import { DESCRIPTIONS } from '../../utils/descriptions'
import { PLANET_COLORS, DEFAULT_COLOR } from '../../utils/sceneScaling'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons'
import { colors } from '../../constants'

type Tab = 'info' | 'missions' | 'tours'

const GLASS = {
  background: colors.navbar.background,
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: `1px solid ${colors.navbar.border}`,
  fontFamily: 'system-ui, -apple-system, sans-serif',
} as const

const SOLAR_SYSTEM_STATS: { label: string; value: string }[] = [
  { label: 'Age', value: '4.6 billion years' },
  { label: 'Star', value: 'G2V main-sequence' },
  { label: 'Planets', value: '8' },
  { label: 'Known Moons', value: '290+' },
  { label: 'Dwarf Planets', value: '5 recognized' },
  { label: 'Diameter', value: '~9.09 billion km' },
  { label: 'Nearest Star', value: 'Proxima Centauri' },
  { label: 'Distance', value: '4.24 light-years' },
]

// ── Info Tab ──────────────────────────────────────────────────────────────

function InfoTab() {
  const selectedObject = useStore((state) => state.selectedObject)
  const setSelectedObject = useStore((state) => state.setSelectedObject)
  const objects = useStore((state) => state.objects)
  const factoids = useStore((state) => state.factoids)
  const fetchFactoids = useStore((state) => state.fetchFactoids)
  const missions = useStore((state) => state.missions)
  const activeMission = useStore((state) => state.activeMission)
  const setActiveMission = useStore((state) => state.setActiveMission)

  const facts = selectedObject ? factoids[selectedObject.id] ?? [] : []
  const [factIdx, setFactIdx] = useState(0)

  useEffect(() => {
    if (Object.keys(factoids).length === 0) fetchFactoids()
  }, [factoids, fetchFactoids])

  useEffect(() => {
    if (facts.length > 0) {
      setFactIdx(Math.floor(Math.random() * facts.length))
    }
  }, [selectedObject?.id, facts.length])

  const relatedMissions = useMemo(() => {
    if (!selectedObject) return []
    return missions.filter((m) =>
      m.waypoints.some((w) => w.objectId === selectedObject.id)
    )
  }, [missions, selectedObject])

  // Active mission details view
  if (!selectedObject && activeMission) {
    const keyEvents = activeMission.waypoints.filter((w) => w.label)
    return (
      <>
        {/* Header */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: activeMission.color,
            boxShadow: `0 0 12px ${activeMission.color}66`,
            flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}>
            {/* Satellite icon via unicode */}
            <span style={{ filter: 'brightness(2)' }}>🛰</span>
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, lineHeight: 1.2 }}>{activeMission.name}</h2>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {activeMission.agency ?? 'Mission'}
            </span>
          </div>
          <button
            className="btn-press"
            onClick={() => setActiveMission(null)}
            style={{
              background: 'rgba(255,255,255,0.1)', border: 'none',
              borderRadius: '50%', width: 24, height: 24,
              color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
              fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        {/* Stats */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Launch</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{activeMission.launchDate}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Status</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{activeMission.status === 'active' ? 'Active' : `Ended ${activeMission.endDate}`}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Agency</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{activeMission.agency ?? '-'}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Key Events</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{keyEvents.length}</div>
            </div>
          </div>
        </div>

        {/* Description */}
        {activeMission.description && (
          <div style={{ padding: '14px 20px', borderBottom: keyEvents.length > 0 ? '1px solid rgba(255, 255, 255, 0.08)' : undefined }}>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.7)' }}>
              {activeMission.description}
            </p>
          </div>
        )}

        {/* Key Events timeline */}
        {keyEvents.length > 0 && (
          <div style={{ padding: '14px 20px' }}>
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Timeline
              </span>
            </div>
            {keyEvents.map((w, i) => (
              <div key={i} style={{
                display: 'flex', gap: 10, marginBottom: 8,
                paddingLeft: 4,
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: activeMission.color, flexShrink: 0,
                  marginTop: 4,
                }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{w.label}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                    {new Date(w.epoch).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    )
  }

  // Solar System overview
  if (!selectedObject) {
    return (
      <>
        {/* Header */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            boxShadow: '0 0 12px rgba(245, 158, 11, 0.4)',
            flexShrink: 0,
          }} />
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, lineHeight: 1.2 }}>Solar System</h2>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overview</span>
          </div>
        </div>

        {/* Stats */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
            {SOLAR_SYSTEM_STATS.map((s) => (
              <div key={s.label}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Description */}
        <div style={{ padding: '16px 20px' }}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.7)' }}>
            Our solar system formed about 4.6 billion years ago from a collapsing cloud of gas and dust. It consists of the Sun, eight planets, five recognized dwarf planets, hundreds of moons, and countless asteroids, comets, and other small bodies.
          </p>
          <p style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.5)' }}>
            Click any planet, moon, or asteroid to see its details. Use the <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Missions</strong> tab to trace spacecraft trajectories, or start a <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Guided Tour</strong>.
          </p>
        </div>
      </>
    )
  }

  const color = PLANET_COLORS[selectedObject.id] ?? DEFAULT_COLOR
  const description = selectedObject.description || DESCRIPTIONS[selectedObject.id] || ''

  // For moons, x/y/z are parent-relative offsets - add parent's heliocentric position
  let x = selectedObject.x ?? 0
  let y = selectedObject.y ?? 0
  let z = selectedObject.z ?? 0
  if (selectedObject.parent_body) {
    const parent = objects.find((o) => o.id === selectedObject.parent_body)
    if (parent) {
      x += parent.x ?? 0
      y += parent.y ?? 0
      z += parent.z ?? 0
    }
  }
  const sunDistAu = Math.sqrt(x * x + y * y + z * z)
  const sunDistKm = sunDistAu * 149_597_870.7
  const sunLightMin = sunDistAu * 8.317

  const formatDistance = (km: number) => {
    if (km >= 1_000_000) return `${(km / 1_000_000).toFixed(1)}M km`
    return `${Math.round(km).toLocaleString()} km`
  }

  const formatLightTime = (lightMin: number) => {
    if (lightMin >= 60) return `${(lightMin / 60).toFixed(1)} light-hr`
    return `${lightMin.toFixed(1)} light-min`
  }

  const stats: { label: string; value: string }[] = [
    { label: 'Type', value: selectedObject.type.charAt(0).toUpperCase() + selectedObject.type.slice(1) },
    { label: 'Radius', value: selectedObject.radius_km ? `${selectedObject.radius_km.toLocaleString()} km` : '-' },
    { label: 'From Sun (AU)', value: sunDistAu > 0 ? `${sunDistAu.toFixed(4)} AU` : '-' },
    { label: 'From Sun', value: sunDistAu > 0 ? formatDistance(sunDistKm) : '-' },
    { label: 'Light time', value: sunDistAu > 0 ? formatLightTime(sunLightMin) : '-' },
    { label: 'Magnitude', value: selectedObject.magnitude != null ? selectedObject.magnitude.toFixed(1) : '-' },
  ]

  if (selectedObject.parent_body) {
    stats.splice(1, 0, { label: 'Parent', value: selectedObject.parent_body.charAt(0).toUpperCase() + selectedObject.parent_body.slice(1) })
  }

  return (
    <>
      {/* Header */}
      <div style={{
        padding: '20px 20px 16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: color,
          boxShadow: `0 0 12px ${color}66`,
          flexShrink: 0,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, lineHeight: 1.2 }}>
            {selectedObject.name}
          </h2>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {selectedObject.type}
          </span>
        </div>
        <button
          className="btn-press"
          onClick={() => setSelectedObject(null)}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: 'none', borderRadius: 6,
            width: 28, height: 28,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'rgba(255,255,255,0.6)',
            fontSize: 16, lineHeight: 1, flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
        >
          ×
        </button>
      </div>

      {/* Stats */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
          {stats.map((s) => (
            <div key={s.label}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                {s.label}
              </div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Description */}
      {description && (
        <div style={{ padding: '16px 20px', borderBottom: facts.length > 0 ? '1px solid rgba(255, 255, 255, 0.08)' : undefined }}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.7)' }}>
            {description}
          </p>
        </div>
      )}

      {/* Did You Know */}
      {facts.length > 0 && (
        <div style={{ padding: '14px 20px', borderBottom: relatedMissions.length > 0 ? '1px solid rgba(255, 255, 255, 0.08)' : undefined }}>
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Did you know?
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>
            {facts[factIdx]}
          </p>
        </div>
      )}

      {/* Related Missions */}
      {relatedMissions.length > 0 && (
        <div style={{ padding: '14px 20px' }}>
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Missions
            </span>
          </div>
          {relatedMissions.map((m) => {
            const encounter = m.waypoints.find((w) => w.objectId === selectedObject.id)
            return (
              <button
                key={m.id}
                onClick={() => setActiveMission(m)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  background: 'rgba(255,255,255,0.04)', border: 'none',
                  borderLeft: `2px solid ${m.color}`, borderRadius: 4,
                  padding: '6px 10px', marginBottom: 4,
                  cursor: 'pointer', color: 'white', fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
              >
                <div style={{ fontSize: 13 }}>{m.name}</div>
                {encounter?.label && (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{encounter.label}</div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}

// ── Missions Tab ──────────────────────────────────────────────────────────

function MissionsTab({ onSelect }: { onSelect: () => void }) {
  const missions = useStore((state) => state.missions)
  const fetchMissions = useStore((state) => state.fetchMissions)
  const activeMission = useStore((state) => state.activeMission)
  const setActiveMission = useStore((state) => state.setActiveMission)

  useEffect(() => {
    if (missions.length === 0) fetchMissions()
  }, [missions.length, fetchMissions])

  if (missions.length === 0) {
    return (
      <div style={{ padding: 20, color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center' }}>
        Loading missions...
      </div>
    )
  }

  return (
    <div style={{ padding: '14px 16px' }}>
      {missions.map((mission) => {
        const isActive = activeMission?.id === mission.id
        const eventCount = mission.waypoints.filter((w) => w.label).length
        return (
          <button
            key={mission.id}
            onClick={() => {
              setActiveMission(isActive ? null : mission)
              if (!isActive) onSelect()
            }}
            style={{
              width: '100%', textAlign: 'left',
              background: isActive ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderLeft: `3px solid ${mission.color}`,
              borderRadius: 8, padding: '10px 12px', marginBottom: 6,
              cursor: 'pointer', color: 'white', fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = isActive ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)' }}
          >
            <div style={{ fontSize: 14, fontWeight: 500 }}>{mission.name}</div>
            {mission.description && (
              <div style={{
                fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 3, lineHeight: 1.4,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {mission.description}
              </div>
            )}
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
              {mission.agency && <>{mission.agency} · </>}
              {mission.status === 'active' ? 'Active' : `Ended ${mission.endDate}`}
              {' · '}{eventCount} key event{eventCount !== 1 ? 's' : ''}
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ── Tours Tab ─────────────────────────────────────────────────────────────

function ToursTab() {
  const tours = useStore((state) => state.tours)
  const fetchTours = useStore((state) => state.fetchTours)
  const startTour = useStore((state) => state.startTour)

  useEffect(() => {
    if (tours.length === 0) fetchTours()
  }, [tours.length, fetchTours])

  if (tours.length === 0) {
    return (
      <div style={{ padding: 20, color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center' }}>
        Loading tours...
      </div>
    )
  }

  return (
    <div style={{ padding: '14px 16px' }}>
      {tours.map((tour) => (
        <button
          key={tour.id}
          onClick={() => startTour(tour)}
          style={{
            width: '100%', textAlign: 'left',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8, padding: '10px 12px', marginBottom: 6,
            cursor: 'pointer', color: 'white', fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
        >
          <div style={{ fontSize: 14, fontWeight: 500 }}>{tour.title}</div>
          {tour.description && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 3, lineHeight: 1.4 }}>
              {tour.description}
            </div>
          )}
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
            {tour.stops.length} stops
          </div>
        </button>
      ))}
    </div>
  )
}

// ── Main Panel ────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string }[] = [
  { key: 'info', label: 'Info' },
  { key: 'missions', label: 'Missions' },
  { key: 'tours', label: 'Tours' },
]

export default function ScenePanel() {
  const activeTour = useStore((state) => state.activeTour)
  const selectedObject = useStore((state) => state.selectedObject)
  const [activeTab, setActiveTab] = useState<Tab>('info')
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Auto-switch to Info tab when an object is selected
  useEffect(() => {
    if (selectedObject) setActiveTab('info')
  }, [selectedObject?.id])

  if (activeTour) return null

  return (
    <>
      {/* Panel */}
      <div
        data-hint="scene-panel"
        style={{
          position: 'fixed',
          top: 80,
          right: 16,
          width: 'clamp(260px, 25vw, 360px)',
          maxHeight: 'calc(100vh - 96px)',
          display: 'flex',
          flexDirection: 'column',
          ...GLASS,
          borderRadius: 12,
          padding: 0,
          zIndex: 50,
          color: 'white',
          transform: isCollapsed ? 'translateX(calc(100% + 32px))' : 'translateX(0)',
          transition: 'transform 250ms ease',
        }}
      >
        {/* Tab bar - sticky */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', flexShrink: 0 }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                padding: '10px 0',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.key ? `2px solid ${colors.accent}` : '2px solid transparent',
                color: activeTab === tab.key ? 'white' : 'rgba(255,255,255,0.4)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}

          {/* Collapse button */}
          <button
            className="btn-press"
            onClick={() => setIsCollapsed(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
              padding: '0 12px',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <FontAwesomeIcon icon={faChevronLeft} style={{ transform: 'rotate(180deg)' }} />
          </button>
        </div>

        {/* Tab content - scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {activeTab === 'info' && <InfoTab />}
          {activeTab === 'missions' && <MissionsTab onSelect={() => setActiveTab('info')} />}
          {activeTab === 'tours' && <ToursTab />}
        </div>
      </div>

      {/* Collapsed toggle button */}
      {isCollapsed && (
        <button
          className="btn-press"
          onClick={() => setIsCollapsed(false)}
          style={{
            position: 'fixed',
            top: '50%',
            right: 16,
            transform: 'translateY(-50%)',
            zIndex: 51,
            width: 36,
            height: 36,
            borderRadius: '50%',
            ...GLASS,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'white',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          }}
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
      )}
    </>
  )
}

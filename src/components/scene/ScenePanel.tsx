import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../../store/store'
import { DESCRIPTIONS } from '../../utils/descriptions'
import { PLANET_COLORS, DEFAULT_COLOR } from '../../utils/sceneScaling'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChevronLeft,
  faChevronRight,
  faSearch,
  faXmark,
  faCircleInfo,
  faRocket,
  faRoute,
} from '@fortawesome/free-solid-svg-icons'
import { colors, spacing, sizes, shadows } from '../../constants'
import type { CelestialObject, CelestialObjectType } from '../../types'
import { pushEvent } from '../../services/interactionLogger'

// ── Constants ────────────────────────────────────────────────────────────────

type FeatureType = 'info' | 'missions' | 'tours'

const PANEL_WIDTH = 'clamp(322px, 25vw, 391px)'
const NAV_HEIGHT = '88px'

const glassPanel: React.CSSProperties = {
  backgroundColor: colors.navbar.background,
  backdropFilter: `blur(${sizes.blur.default})`,
  WebkitBackdropFilter: `blur(${sizes.blur.default})`,
  border: `1px solid ${colors.navbar.border}`,
}

const FEATURE_TITLES: Record<FeatureType, string> = {
  info: 'Info',
  missions: 'Missions',
  tours: 'Tours',
}

const TYPE_ORDER: CelestialObjectType[] = ['moon', 'planet', 'star', 'dwarf_planet', 'asteroid', 'comet']
const TYPE_LABELS: Record<string, string> = {
  moon: 'Moons', planet: 'Planets', star: 'Stars',
  dwarf_planet: 'Dwarf Planets', asteroid: 'Asteroids', comet: 'Comets',
}

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
            <span style={{ filter: 'brightness(2)' }}>🛰</span>
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, lineHeight: 1.2 }}>{activeMission.name}</h2>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {activeMission.agency ?? 'Mission'}
            </span>
          </div>
          <button
            className="btn-press"
            onClick={() => setActiveMission(null)}
            style={{
              background: 'rgba(255,255,255,0.1)', border: 'none',
              borderRadius: '50%', width: 24, height: 24,
              color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
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
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Launch</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{activeMission.launchDate}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Status</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{activeMission.status === 'active' ? 'Active' : `Ended ${activeMission.endDate}`}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Agency</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{activeMission.agency ?? '-'}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Key Events</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{keyEvents.length}</div>
            </div>
          </div>
        </div>

        {/* Description */}
        {activeMission.description && (
          <div style={{ padding: '14px 20px', borderBottom: keyEvents.length > 0 ? '1px solid rgba(255, 255, 255, 0.08)' : undefined }}>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.8)' }}>
              {activeMission.description}
            </p>
          </div>
        )}

        {/* Key Events timeline */}
        {keyEvents.length > 0 && (
          <div style={{ padding: '14px 20px' }}>
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
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
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overview</span>
          </div>
        </div>

        {/* Stats */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
            {SOLAR_SYSTEM_STATS.map((s) => (
              <div key={s.label}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Description */}
        <div style={{ padding: '16px 20px' }}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.8)' }}>
            Our solar system formed about 4.6 billion years ago from a collapsing cloud of gas and dust. It consists of the Sun, eight planets, five recognized dwarf planets, hundreds of moons, and countless asteroids, comets, and other small bodies.
          </p>
          <p style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.6)' }}>
            Click any planet, moon, or asteroid to see its details. Use the <strong style={{ color: 'rgba(255,255,255,0.8)' }}>Missions</strong> button to trace spacecraft trajectories, or start a <strong style={{ color: 'rgba(255,255,255,0.8)' }}>Guided Tour</strong>.
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
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
            cursor: 'pointer', color: 'rgba(255,255,255,0.75)',
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
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
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
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.8)' }}>
            {description}
          </p>
        </div>
      )}

      {/* Did You Know */}
      {facts.length > 0 && (
        <div style={{ padding: '14px 20px', borderBottom: relatedMissions.length > 0 ? '1px solid rgba(255, 255, 255, 0.08)' : undefined }}>
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Did you know?
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.75)', fontStyle: 'italic' }}>
            {facts[factIdx]}
          </p>
        </div>
      )}

      {/* Related Missions */}
      {relatedMissions.length > 0 && (
        <div style={{ padding: '14px 20px' }}>
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{encounter.label}</div>
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
      <div style={{ padding: 20, color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center' }}>
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
                fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 3, lineHeight: 1.4,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {mission.description}
              </div>
            )}
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
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
      <div style={{ padding: 20, color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center' }}>
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
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 3, lineHeight: 1.4 }}>
              {tour.description}
            </div>
          )}
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
            {tour.stops.length} stops
          </div>
        </button>
      ))}
    </div>
  )
}

// ── Object Selector Modal ───────────────────────────────────────────────────

function ObjectSelectorModal({ onClose }: { onClose: () => void }) {
  const [searchQuery, setSearchQuery] = useState('')
  const objects = useStore((state) => state.objects)
  const selectedObject = useStore((state) => state.selectedObject)
  const setSelectedObject = useStore((state) => state.setSelectedObject)

  const filteredObjects = objects
    .filter((obj) => obj.id !== 'earth')
    .filter((obj) => obj.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const groupedObjects = useMemo(() => {
    const groups: { type: CelestialObjectType; label: string; objects: CelestialObject[] }[] = []
    for (const type of TYPE_ORDER) {
      const objs = filteredObjects.filter((o) => o.type === type)
      if (objs.length > 0) groups.push({ type, label: TYPE_LABELS[type] ?? type, objects: objs })
    }
    return groups
  }, [filteredObjects])

  const handleSelect = (obj: CelestialObject) => {
    pushEvent('scene_object_select', { objectId: obj.id, objectName: obj.name })
    setSelectedObject(obj)
    onClose()
  }

  return (
    <>
      <div
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          zIndex: sizes.zIndex.modalBackdrop,
          backgroundColor: colors.navbar.background,
          backdropFilter: `blur(${sizes.blur.default})`,
          WebkitBackdropFilter: `blur(${sizes.blur.default})`,
          animation: 'modalBackdropIn 200ms ease-out both',
        }}
        onClick={onClose}
      />
      <div
        className="fixed"
        style={{
          top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: sizes.modal.widthNarrow, maxHeight: sizes.modal.maxHeight,
          zIndex: sizes.zIndex.modal,
          ...glassPanel,
          borderRadius: sizes.borderRadius['2xl'],
          display: 'flex', flexDirection: 'column',
          boxShadow: shadows.lg,
          overflow: 'hidden', padding: 0,
          animation: 'modalContentIn 200ms ease-out both',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="btn-press"
          onClick={onClose}
          style={{
            position: 'absolute', top: '16px', right: '16px', zIndex: 1,
            background: 'transparent', border: 'none',
            color: colors.text.muted, cursor: 'pointer',
            padding: '4px', fontSize: '16px', lineHeight: 1,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = colors.white)}
          onMouseLeave={(e) => (e.currentTarget.style.color = colors.text.muted)}
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>

        <div style={{
          paddingTop: sizes.modal.headerPaddingTop,
          paddingBottom: sizes.modal.headerPaddingBottom,
          paddingLeft: sizes.modal.paddingContent,
          paddingRight: sizes.modal.paddingContent,
          textAlign: 'center',
          borderBottom: `1px solid ${colors.navbar.border}`,
        }}>
          <h2 className="text-xl font-bold" style={{ color: colors.white }}>Select Object</h2>
          <p className="text-sm mt-1" style={{ color: colors.text.muted }}>to explore in 3D</p>
        </div>

        <div style={{
          padding: sizes.modal.paddingContent,
          display: 'flex', flexDirection: 'column',
          flex: 1, overflow: 'hidden', gap: '16px',
        }}>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            className="w-full transition-all focus:outline-none focus:ring-0"
            style={{
              paddingTop: '10px', paddingBottom: '10px',
              paddingLeft: sizes.inputs.paddingHorizontal,
              paddingRight: sizes.inputs.paddingHorizontal,
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              border: `1px solid ${colors.navbar.border}`,
              borderRadius: sizes.inputs.borderRadius,
              color: colors.white, fontSize: sizes.fonts.sm,
            }}
            onFocus={(e) => (e.currentTarget.style.boxShadow = `0 0 0 1px ${colors.accent}`)}
            onBlur={(e) => (e.currentTarget.style.boxShadow = 'none')}
          />

          <div className="flex-1 overflow-y-auto" style={{ marginRight: '-8px', paddingRight: '8px' }}>
            {groupedObjects.length === 0 ? (
              <div className="text-center py-8 text-sm" style={{ color: colors.text.muted }}>No objects found</div>
            ) : (
              groupedObjects.map((group) => (
                <div key={group.type} style={{ marginBottom: '16px' }}>
                  <div
                    className="text-xs font-semibold uppercase"
                    style={{
                      color: colors.text.muted, marginBottom: '6px',
                      letterSpacing: '0.06em', paddingLeft: '10px',
                      borderLeft: `2px solid ${colors.accent}`,
                    }}
                  >
                    {group.label}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {group.objects.map((object) => {
                      const isSelected = selectedObject?.id === object.id
                      return (
                        <button
                          key={object.id}
                          onClick={() => handleSelect(object)}
                          className="w-full text-left transition-all flex items-center justify-between"
                          style={{
                            padding: '8px 12px', borderRadius: '6px',
                            backgroundColor: isSelected ? 'rgba(201, 165, 92, 0.1)' : 'transparent',
                            border: `1px solid ${isSelected ? colors.accent : 'transparent'}`,
                            color: isSelected ? colors.accent : colors.white,
                            cursor: 'pointer', fontFamily: 'inherit',
                          }}
                          onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)' }}
                          onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent' }}
                        >
                          <span className="font-medium text-sm">{object.name}</span>
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.accent, boxShadow: '0 0 8px rgba(201, 165, 92, 0.5)' }} />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          <button
            onClick={onClose}
            className="transition-all active:scale-[0.98]"
            style={{
              width: '100%', paddingTop: sizes.inputs.paddingVertical,
              paddingBottom: sizes.inputs.paddingVertical,
              backgroundColor: 'transparent', border: 'none',
              color: colors.text.muted, fontSize: sizes.fonts.sm,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  )
}

// ── Select Object Button ────────────────────────────────────────────────

function SelectObjectButton({ onClick, onCollapse, hidden }: { onClick: () => void; onCollapse: () => void; hidden: boolean }) {
  return (
    <div
      className="fixed flex items-center"
      style={{
        top: `calc(${spacing.md} + ${NAV_HEIGHT} + ${spacing.sm})`,
        left: spacing.md,
        width: PANEL_WIDTH,
        height: '40px',
        zIndex: sizes.zIndex.fixed - 1,
        gap: 0,
        transform: hidden ? 'translateX(calc(-100% - 48px))' : 'translateX(0)',
        pointerEvents: hidden ? 'none' : 'auto',
        transition: 'transform 250ms ease',
      }}
    >
      <button
        onClick={onClick}
        className="btn-press flex items-center"
        style={{
          flex: 1,
          height: '100%',
          ...glassPanel,
          borderRadius: `${sizes.borderRadius.xl} 0 0 ${sizes.borderRadius.xl}`,
          padding: `0 ${spacing.md}`,
          gap: spacing.sm,
          boxShadow: shadows.lg,
          cursor: 'pointer',
          color: colors.text.muted,
          fontSize: '14px',
          fontFamily: 'inherit',
        }}
      >
        <FontAwesomeIcon icon={faSearch} style={{ fontSize: '13px', flexShrink: 0 }} />
        Search objects...
      </button>
      <button
        onClick={onCollapse}
        className="btn-press flex items-center justify-center"
        style={{
          width: 32,
          height: '100%',
          ...glassPanel,
          borderRadius: `0 ${sizes.borderRadius.xl} ${sizes.borderRadius.xl} 0`,
          borderLeft: 'none',
          cursor: 'pointer',
          color: 'rgba(255,255,255,0.5)',
          fontSize: '11px',
          flexShrink: 0,
        }}
      >
        <FontAwesomeIcon icon={faChevronLeft} />
      </button>
    </div>
  )
}

// ── Main Panel ────────────────────────────────────────────────────────────

export default function ScenePanel() {
  const activeTour = useStore((state) => state.activeTour)
  const selectedObject = useStore((state) => state.selectedObject)
  const [activeFeature, setActiveFeature] = useState<FeatureType | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isSelectorOpen, setIsSelectorOpen] = useState(false)

  // Auto-open Info when object selected
  useEffect(() => {
    if (selectedObject) setActiveFeature('info')
  }, [selectedObject?.id])

  if (activeTour) return null

  return (
    <>
      {/* Select object button */}
      <SelectObjectButton
        onClick={() => setIsSelectorOpen(true)}
        onCollapse={() => setIsCollapsed(true)}
        hidden={!!activeFeature || isCollapsed}
      />

      {/* Quick access buttons */}
      <div
        className="fixed flex"
        style={{
          top: `calc(${spacing.md} + ${NAV_HEIGHT} + ${spacing.sm} + 40px + ${spacing.sm})`,
          left: spacing.md,
          width: PANEL_WIDTH,
          zIndex: sizes.zIndex.fixed - 1,
          gap: spacing.sm,
          transform: !!activeFeature || isCollapsed ? 'translateX(calc(-100% - 48px))' : 'translateX(0)',
          pointerEvents: !!activeFeature || isCollapsed ? 'none' : 'auto',
          transition: 'transform 250ms ease',
        }}
      >
        {([
          { key: 'info' as const, icon: faCircleInfo, label: 'Info' },
          { key: 'missions' as const, icon: faRocket, label: 'Missions' },
          { key: 'tours' as const, icon: faRoute, label: 'Tours' },
        ]).map(({ key, icon, label }) => (
          <button
            key={key}
            onClick={() => setActiveFeature(key)}
            className="btn-press flex items-center justify-center"
            style={{
              flex: 1,
              height: '36px',
              ...glassPanel,
              borderRadius: sizes.borderRadius.lg,
              boxShadow: shadows.lg,
              cursor: 'pointer',
              color: colors.text.muted,
              fontSize: '12px',
              fontFamily: 'inherit',
              gap: '6px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = colors.white)}
            onMouseLeave={(e) => (e.currentTarget.style.color = colors.text.muted)}
          >
            <FontAwesomeIcon icon={icon} style={{ fontSize: '11px' }} />
            {label}
          </button>
        ))}
      </div>

      {/* Feature panel — content-fitting height, scrolls only when exceeding screen */}
      <div
        className="fixed flex flex-col"
        data-hint="scene-panel"
        style={{
          top: `calc(${spacing.md} + ${NAV_HEIGHT} + ${spacing.sm})`,
          left: spacing.md,
          maxHeight: `calc(100vh - ${spacing.md} - ${NAV_HEIGHT} - ${spacing.sm} - ${spacing.md})`,
          width: PANEL_WIDTH,
          zIndex: sizes.zIndex.fixed,
          ...glassPanel,
          borderRadius: sizes.borderRadius.xl,
          boxShadow: shadows.lg,
          transform: activeFeature && !isCollapsed ? 'translateX(0)' : `translateX(calc(-100% - ${spacing.lg}))`,
          transition: 'transform 250ms ease',
          overflow: 'hidden',
          color: 'white',
        }}
      >
        {activeFeature && (
          <>
            {/* Header */}
            <div style={{ padding: `${spacing.md} ${spacing.md} 0`, flexShrink: 0 }}>
              <div className="flex items-center justify-between">
                <h2 style={{ color: colors.text.primary, fontSize: '18px', fontWeight: 600, margin: 0 }}>
                  {FEATURE_TITLES[activeFeature]}
                </h2>
                <div className="flex items-center" style={{ gap: '4px' }}>
                  <button
                    className="btn-press flex items-center justify-center"
                    onClick={() => setActiveFeature(null)}
                    style={{
                      background: 'none', border: 'none',
                      color: colors.text.muted, cursor: 'pointer',
                      width: 30, height: 30, fontSize: '14px',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = colors.white)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = colors.text.muted)}
                    title="Close"
                  >
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                  <button
                    className="btn-press flex items-center justify-center"
                    onClick={() => setIsCollapsed(true)}
                    style={{
                      background: 'transparent', border: 'none',
                      color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
                      padding: '0 4px', fontSize: 11, height: 30,
                    }}
                    title="Hide panel"
                  >
                    <FontAwesomeIcon icon={faChevronLeft} />
                  </button>
                </div>
              </div>
              <div style={{ height: 1, background: colors.navbar.border, margin: '12px 0 0' }} />
            </div>

            {/* Scrollable content — shrinks when exceeding maxHeight */}
            <div style={{ overflowY: 'auto', minHeight: 0 }}>
              {activeFeature === 'info' && <InfoTab />}
              {activeFeature === 'missions' && <MissionsTab onSelect={() => setActiveFeature('info')} />}
              {activeFeature === 'tours' && <ToursTab />}
            </div>
          </>
        )}
      </div>

      {/* Collapsed expand button */}
      {isCollapsed && (
        <button
          className="fixed btn-press flex items-center justify-center"
          onClick={() => setIsCollapsed(false)}
          style={{
            top: '50%',
            left: 16,
            transform: 'translateY(-50%)',
            zIndex: sizes.zIndex.fixed + 1,
            width: 36,
            height: 36,
            borderRadius: '50%',
            ...glassPanel,
            cursor: 'pointer',
            color: 'white',
            boxShadow: shadows.lg,
          }}
        >
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      )}

      {/* Object selector modal */}
      {isSelectorOpen && <ObjectSelectorModal onClose={() => setIsSelectorOpen(false)} />}
    </>
  )
}

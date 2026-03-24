import { useEffect, useMemo, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faXmark,
  faChevronDown,
  faChevronUp,
  faChevronLeft,
  faChevronRight,
  faCube,
  faSearch,
  faArrowsRotate,
  faLocationDot,
  faCircleQuestion,
  faMoon,
  faCalendarDays,
  faBookOpen,
} from '@fortawesome/free-solid-svg-icons'
import { useStore } from '../../store/store'
import type { CelestialObject, CelestialObjectType } from '../../types'
import { colors, spacing, sizes, shadows } from '../../constants'
import MoonPhaseIcon from '../ui/MoonPhaseIcon'
import RiseSetTimes from '../ui/RiseSetTimes'
import AltitudeChart from '../ui/AltitudeChart'
import TonightsSky from '../ui/TonightsSky'
import UpcomingEventsPanel from '../ui/UpcomingEventsPanel'
import ObservationLogCard from '../ui/ObservationLogCard'
import { isNearNewMoon, calculateYallopQ, type YallopZone, type YallopResult } from '../../utils/yallopCriteria'
import { getVisibilityColor, calculateCelestialVisibilityScore } from '../../utils/visibilityCalculator'
import { getWeatherForUserLocation } from '../../utils/weatherService'
import { pushEvent } from '../../services/interactionLogger'

// ── Constants ───────────────────────────────────────────────────────────────

const PANEL_WIDTH = 'clamp(322px, 25vw, 391px)'
const NAV_HEIGHT = '88px' // Two-row TopNav: 30+1+12+28 content + 16px pad + 2px border
const DEFAULT_LOCATION = { lat: 40.7, lon: -74.0 }

const CRESCENT_ZONES: YallopZone[] = ['A', 'B', 'C', 'D', 'E', 'F']
const ZONE_COLORS: Record<YallopZone, string> = {
  A: '#22c55e', B: '#86efac', C: '#facc15',
  D: '#f97316', E: '#ef4444', F: '#6b7280',
}
const ZONE_DESCS: Record<YallopZone, string> = {
  A: 'Easily visible', B: 'Perfect conditions', C: 'May need binoculars',
  D: 'Needs optical aid', E: 'Not visible with telescope', F: 'Not visible',
}

const TYPE_ORDER: CelestialObjectType[] = ['moon', 'planet', 'star', 'dwarf_planet', 'asteroid', 'comet']
const TYPE_LABELS: Record<string, string> = {
  moon: 'Moons', planet: 'Planets', star: 'Stars',
  dwarf_planet: 'Dwarf Planets', asteroid: 'Asteroids', comet: 'Comets',
}

const glassPanel: React.CSSProperties = {
  backgroundColor: colors.navbar.background,
  backdropFilter: `blur(${sizes.blur.default})`,
  WebkitBackdropFilter: `blur(${sizes.blur.default})`,
  border: `1px solid ${colors.navbar.border}`,
}

// ── Section Header ──────────────────────────────────────────────────────────

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div style={{
      borderTop: `1px solid ${colors.navbar.border}`,
      padding: '16px 0 10px',
      marginTop: '4px',
      color: colors.text.primary,
      fontSize: '13px',
      fontWeight: 600,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
    }}>
      {title}
      {count != null && <span style={{ color: colors.text.muted, fontWeight: 400 }}> ({count})</span>}
    </div>
  )
}

// ── Hint Button ─────────────────────────────────────────────────────────────

function HintButton({ icon, hint, onClick, style }: {
  icon: typeof faXmark
  hint: string
  onClick: () => void
  style?: React.CSSProperties
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={onClick}
        className="btn-press"
        style={{
          background: 'rgba(255,255,255,0.06)', border: `1px solid ${colors.navbar.border}`,
          borderRadius: sizes.borderRadius.md, cursor: 'pointer',
          color: hovered ? colors.white : colors.text.muted,
          width: '30px', height: '30px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px',
          transition: 'color 150ms ease',
          ...style,
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <FontAwesomeIcon icon={icon} />
      </button>
      {hovered && (
        <div style={{
          position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
          marginTop: '4px', padding: '3px 8px',
          backgroundColor: 'rgba(0,0,0,0.85)', borderRadius: '4px',
          fontSize: '10px', color: 'rgba(255,255,255,0.85)',
          whiteSpace: 'nowrap', pointerEvents: 'none',
          zIndex: 10,
        }}>
          {hint}
        </div>
      )}
    </div>
  )
}

// ── Toggle Row ──────────────────────────────────────────────────────────────

function ToggleRow({ label, checked, onChange, disabled, disabledHint }: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  disabledHint?: string
}) {
  const [hintVisible, setHintVisible] = useState(false)

  return (
    <div
      onClick={() => !disabled && onChange(!checked)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '5px 0', cursor: disabled ? 'default' : 'pointer', userSelect: 'none',
        opacity: disabled ? 0.35 : 1,
        position: 'relative',
      }}
    >
      <span style={{ fontSize: 13, color: colors.text.secondary }}>
        {label}
        {disabled && disabledHint && (
          <span
            style={{ marginLeft: 6, display: 'inline-flex', position: 'relative' }}
            onMouseEnter={() => setHintVisible(true)}
            onMouseLeave={() => setHintVisible(false)}
          >
            <FontAwesomeIcon icon={faCircleQuestion} style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', cursor: 'help' }} />
            {hintVisible && (
              <span style={{
                position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                marginBottom: 6, padding: '4px 8px',
                backgroundColor: 'rgba(0,0,0,0.9)', borderRadius: 4,
                fontSize: 10, color: 'rgba(255,255,255,0.85)',
                whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 10,
              }}>
                {disabledHint}
              </span>
            )}
          </span>
        )}
      </span>
      <div style={{
        width: 32, height: 18, borderRadius: 9,
        background: checked && !disabled ? colors.primary[500] : 'rgba(255,255,255,0.15)',
        position: 'relative', transition: 'background 200ms ease',
        flexShrink: 0, marginLeft: 12,
      }}>
        <div style={{
          width: 14, height: 14, borderRadius: '50%',
          background: 'white',
          position: 'absolute', top: 2,
          left: checked && !disabled ? 16 : 2,
          transition: 'left 200ms ease',
        }} />
      </div>
    </div>
  )
}

// ── Reports Section ─────────────────────────────────────────────────────────

type ReportUser = { name: string; timeAgo: string }
type CountryReport = { country: string; count: number; users: ReportUser[] }

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function ReportsContent() {
  const reports = useStore((state) => state.reports) || []
  const [expandedCountries, setExpandedCountries] = useState<Record<string, boolean>>({})

  const { visible, notVisible } = useMemo(() => {
    const visibleMap = new Map<string, ReportUser[]>()
    const notVisibleMap = new Map<string, ReportUser[]>()

    reports.forEach((report) => {
      const ru: ReportUser = { name: 'Stargazer', timeAgo: formatTimeAgo(report.created_at) }
      const target = report.is_visible ? visibleMap : notVisibleMap
      const users = target.get(report.country) || []
      users.push(ru)
      target.set(report.country, users)
    })

    const toArr = (m: Map<string, ReportUser[]>): CountryReport[] =>
      Array.from(m.entries()).map(([country, users]) => ({ country, count: users.length, users }))

    return { visible: toArr(visibleMap), notVisible: toArr(notVisibleMap) }
  }, [reports])

  const toggleCountry = (country: string) =>
    setExpandedCountries((prev) => ({ ...prev, [country]: !prev[country] }))

  if (reports.length === 0) {
    return (
      <div style={{ fontSize: '12px', color: colors.text.muted, padding: '4px 0' }}>
        No reports yet
      </div>
    )
  }

  const renderCategory = (label: string, dotColor: string, entries: CountryReport[]) => {
    if (entries.length === 0) return null
    return (
      <div key={label} style={{ marginBottom: '10px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: colors.text.secondary, marginBottom: '6px' }}>
          {label}
        </div>
        {entries.map((entry) => {
          const isExpanded = expandedCountries[entry.country]
          return (
            <div key={`${label}-${entry.country}`}>
              <button
                onClick={() => toggleCountry(entry.country)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '4px 0', background: 'none', border: 'none', cursor: 'pointer',
                  color: colors.text.primary, fontSize: '12px', fontFamily: 'inherit',
                }}
              >
                <div className="flex items-center" style={{ gap: '6px' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: dotColor, flexShrink: 0 }} />
                  <span>{entry.country}</span>
                  <span style={{ color: colors.text.muted }}>{entry.count}</span>
                </div>
                <FontAwesomeIcon
                  icon={isExpanded ? faChevronUp : faChevronDown}
                  style={{ fontSize: '10px', color: colors.text.muted }}
                />
              </button>
              {isExpanded && (
                <div style={{ paddingLeft: '16px', paddingTop: '2px', paddingBottom: '4px' }}>
                  {entry.users.map((u, i) => (
                    <div key={i} className="flex items-center justify-between" style={{ fontSize: '12px', padding: '2px 0' }}>
                      <span style={{ color: colors.text.primary }}>{u.name}</span>
                      <span style={{ color: colors.text.muted }}>{u.timeAgo}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <>
      {renderCategory('Visible', colors.status.success, visible)}
      {renderCategory('Not Visible', colors.status.error, notVisible)}
    </>
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
    pushEvent('panel_object_select', { objectId: obj.id, objectName: obj.name })
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
          <p className="text-sm mt-1" style={{ color: colors.text.muted }}>to track visibility</p>
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

// ── Location Row ────────────────────────────────────────────────────────

function LocationRow() {
  const userLocation = useStore((state) => state.userLocation)
  const [hintVisible, setHintVisible] = useState(false)

  if (userLocation) {
    return (
      <div className="flex items-center" style={{ gap: '6px', marginTop: '8px' }}>
        <FontAwesomeIcon icon={faLocationDot} style={{ fontSize: '12px', color: colors.text.muted, flexShrink: 0 }} />
        <span style={{ fontSize: '12px', color: colors.text.secondary }}>{userLocation.label}</span>
      </div>
    )
  }

  return (
    <div
      className="flex items-center"
      style={{ gap: '6px', marginTop: '8px', position: 'relative' }}
    >
      <FontAwesomeIcon icon={faLocationDot} style={{ fontSize: '12px', color: colors.text.muted, flexShrink: 0 }} />
      <span style={{ fontSize: '12px', color: colors.text.muted }}>No location set</span>
      <div
        style={{ position: 'relative', display: 'inline-flex' }}
        onMouseEnter={() => setHintVisible(true)}
        onMouseLeave={() => setHintVisible(false)}
      >
        <FontAwesomeIcon
          icon={faCircleQuestion}
          style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', cursor: 'help' }}
        />
        {hintVisible && (
          <div style={{
            position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
            marginBottom: '6px', padding: '5px 10px',
            backgroundColor: 'rgba(0,0,0,0.9)', borderRadius: '6px',
            fontSize: '11px', color: 'rgba(255,255,255,0.85)',
            whiteSpace: 'nowrap', pointerEvents: 'none',
            zIndex: 10, lineHeight: 1.4,
          }}>
            Enable via Settings → Detect Location
          </div>
        )}
      </div>
    </div>
  )
}

// ── Select Object Button ────────────────────────────────────────────────

function SelectObjectButton({ onClick, onCollapse, hidden }: { onClick: () => void; onCollapse: () => void; hidden: boolean }) {
  return (
    <div
      className="fixed flex items-center"
      data-hint="select-object"
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
        Select object to track...
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

// ── Feature Panel (slide-in, same position as MapPanel) ─────────────────────

type FeatureType = 'tonight' | 'events' | 'log' | null

const FEATURE_TITLES: Record<string, string> = {
  tonight: "Tonight's Sky",
  events: 'Upcoming Events',
  log: 'Observation Log',
}

// ── Probed Location Section ──────────────────────────────────────────────────

function ProbedLocationSection() {
  const probedLocation = useStore((state) => state.probedLocation)
  const setProbedLocation = useStore((state) => state.setProbedLocation)
  const selectedObject = useStore((state) => state.selectedObject)

  if (!probedLocation) return null

  const hasVisibility = probedLocation.percentage != null
  const score = hasVisibility ? probedLocation.percentage! / 100 : 0

  return (
    <>
      <div style={{
        borderTop: `1px solid ${colors.navbar.border}`,
        padding: '16px 0 10px',
        marginTop: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{
          color: colors.text.primary,
          fontSize: '13px',
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}>
          Probed Location
        </span>
        <button
          onClick={() => setProbedLocation(null)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: colors.text.muted, fontSize: '12px', padding: '2px 4px',
            lineHeight: 1,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = colors.white)}
          onMouseLeave={(e) => (e.currentTarget.style.color = colors.text.muted)}
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>

      {/* Coordinates */}
      <div style={{ fontSize: '11px', color: colors.text.muted, marginBottom: '8px' }}>
        {probedLocation.lat.toFixed(2)}°, {probedLocation.lon.toFixed(2)}°
      </div>

      {hasVisibility ? (
        <>
          {/* Visibility bar */}
          <div style={{ marginBottom: '10px' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: '5px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: colors.text.primary }}>Visibility</span>
              <span style={{ fontSize: '12px', color: getVisibilityColor(score), fontWeight: 600 }}>
                {probedLocation.percentage}%
              </span>
            </div>
            <div style={{
              width: '100%', height: '6px', borderRadius: '3px',
              backgroundColor: 'rgba(255,255,255,0.08)',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${probedLocation.percentage}%`, height: '100%',
                borderRadius: '3px',
                background: `linear-gradient(to right, ${getVisibilityColor(score * 0.5)}, ${getVisibilityColor(score)})`,
                transition: 'width 300ms ease',
              }} />
            </div>
          </div>

          {!probedLocation.isAboveHorizon && (
            <div style={{ fontSize: '11px', color: colors.status.error, marginBottom: '8px' }}>
              {selectedObject?.name ?? 'Object'} below horizon
            </div>
          )}

          {/* Detail rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '4px' }}>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: '12px', color: colors.text.secondary }}>Altitude</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: colors.text.primary }}>
                {probedLocation.objectAltitude!.toFixed(1)}°
              </span>
            </div>
            {probedLocation.illumination != null && (
              <div className="flex items-center justify-between">
                <span style={{ fontSize: '12px', color: colors.text.secondary }}>Illumination</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: colors.text.primary }}>
                  {probedLocation.illumination.toFixed(0)}%
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span style={{ fontSize: '12px', color: colors.text.secondary }}>Weather</span>
              <div className="flex items-center" style={{ gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: colors.text.primary }}>
                  {probedLocation.weatherRating}/10
                </span>
                <div style={{
                  width: 40, height: 5, borderRadius: 3, overflow: 'hidden',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                }}>
                  <div style={{
                    width: `${probedLocation.weatherRating! * 10}%`, height: '100%',
                    backgroundColor: ratingColor(probedLocation.weatherRating!, 8, 5),
                  }} />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: '12px', color: colors.text.secondary }}>Time/Light</span>
              <div className="flex items-center" style={{ gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: colors.text.primary }}>
                  {probedLocation.timeRating}/10
                </span>
                <div style={{
                  width: 40, height: 5, borderRadius: 3, overflow: 'hidden',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                }}>
                  <div style={{
                    width: `${probedLocation.timeRating! * 10}%`, height: '100%',
                    backgroundColor: ratingColor(probedLocation.timeRating!, 7, 4),
                  }} />
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div style={{ fontSize: '12px', color: colors.text.muted, marginBottom: '4px' }}>
          Select an object to see visibility details
        </div>
      )}
    </>
  )
}

function ratingColor(value: number, goodThreshold: number, midThreshold: number): string {
  if (value >= goodThreshold) return colors.status.success
  if (value >= midThreshold) return colors.status.warning
  return colors.status.error
}

// ── MapPanel ────────────────────────────────────────────────────────────────

export default function MapPanel() {
  const [isSelectorOpen, setIsSelectorOpen] = useState(false)
  const [activeFeature, setActiveFeature] = useState<FeatureType>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const selectedObject = useStore((state) => state.selectedObject)
  const setSelectedObject = useStore((state) => state.setSelectedObject)
  const setViewMode = useStore((state) => state.setViewMode)
  const fetchObjects = useStore((state) => state.fetchObjects)
  const fetchReports = useStore((state) => state.fetchReports)
  const setVisualizationMode = useStore((state) => state.setVisualizationMode)
  const visualizationMode = useStore((state) => state.visualizationMode)
  const showCrescentZones = useStore((state) => state.showCrescentZones)
  const setShowCrescentZones = useStore((state) => state.setShowCrescentZones)
  const showConstellationLines = useStore((state) => state.showConstellationLines)
  const setShowConstellationLines = useStore((state) => state.setShowConstellationLines)
  const simulatedTime = useStore((state) => state.simulatedTime)
  const reports = useStore((state) => state.reports) || []
  const userLocation = useStore((state) => state.userLocation)
  const user = useStore((state) => state.user)
  const openAuthModal = useStore((state) => state.openAuthModal)
  const openReportModal = useStore((state) => state.openReportModal)
  const [visibilityScore, setVisibilityScore] = useState<number | null>(null)
  const [yallopResult, setYallopResult] = useState<YallopResult | null>(null)

  const showCrescentToggle = selectedObject?.id === 'moon' && isNearNewMoon(simulatedTime ?? new Date())
  const isOpen = !!selectedObject

  // Auto-enable hex overlay when object selected; close feature panel
  useEffect(() => {
    setVisualizationMode(selectedObject ? 'hex' : 'none')
    if (selectedObject) setActiveFeature(null)
  }, [selectedObject, setVisualizationMode])

  // Auto-disable crescent zones when not applicable
  useEffect(() => {
    if (!showCrescentToggle && showCrescentZones) {
      setShowCrescentZones(false)
    }
  }, [showCrescentToggle, showCrescentZones, setShowCrescentZones])

  // Fetch objects on mount
  useEffect(() => {
    fetchObjects()
  }, [fetchObjects])

  // Fetch reports when object changes
  useEffect(() => {
    if (selectedObject) {
      fetchReports(selectedObject.id)
    }
  }, [selectedObject?.id, fetchReports])

  // Compute visibility score at user location
  useEffect(() => {
    if (!selectedObject || !userLocation) {
      setVisibilityScore(null)
      return
    }
    let cancelled = false
    const effectiveTime = simulatedTime ?? new Date()
    getWeatherForUserLocation(userLocation.lat, userLocation.lon).then((weather) => {
      if (cancelled) return
      const score = calculateCelestialVisibilityScore(
        userLocation.lat, userLocation.lon, effectiveTime, weather, selectedObject
      )
      setVisibilityScore(score)
    })
    return () => { cancelled = true }
  }, [selectedObject, userLocation, simulatedTime])

  // Compute Yallop crescent zone at user location (Moon only, < 10% illumination)
  useEffect(() => {
    if (!showCrescentToggle || !userLocation) {
      setYallopResult(null)
      return
    }
    const effectiveTime = simulatedTime ?? new Date()
    setYallopResult(calculateYallopQ(userLocation.lat, userLocation.lon, effectiveTime))
  }, [showCrescentToggle, userLocation, simulatedTime])

  // Log panel open/close
  useEffect(() => {
    pushEvent(isOpen ? 'map_panel_open' : 'map_panel_close', {
      objectId: selectedObject?.id ?? null,
    })
  }, [isOpen])

  const handleClose = () => {
    setSelectedObject(null)
  }

  const handleViewIn3D = () => {
    pushEvent('panel_view_in_3d', { objectId: selectedObject?.id })
    setViewMode('3d')
  }

  const totalReports = reports.length

  return (
    <>
      {/* Select object button — slides independently */}
      <SelectObjectButton
        onClick={() => setIsSelectorOpen(true)}
        onCollapse={() => setIsCollapsed(true)}
        hidden={isOpen || !!activeFeature || isCollapsed}
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
          transform: isOpen || !!activeFeature || isCollapsed ? 'translateX(calc(-100% - 48px))' : 'translateX(0)',
          pointerEvents: isOpen || !!activeFeature || isCollapsed ? 'none' : 'auto',
          transition: 'transform 250ms ease',
        }}
      >
        {([
          { key: 'tonight' as const, icon: faMoon, label: "Tonight's Sky" },
          { key: 'events' as const, icon: faCalendarDays, label: 'Events' },
          { key: 'log' as const, icon: faBookOpen, label: 'Log' },
        ]).map(({ key, icon, label }) => (
          <button
            key={key}
            onClick={() => {
              pushEvent('quick_access_click', { feature: key })
              setActiveFeature(key)
            }}
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

      {/* Panel — slides in below TopNav when object selected */}
      <div
        className="fixed flex flex-col"
        style={{
          top: `calc(${spacing.md} + ${NAV_HEIGHT} + ${spacing.sm})`,
          left: spacing.md,
          maxHeight: `calc(100vh - ${spacing.md} - ${NAV_HEIGHT} - ${spacing.sm} - ${spacing.md})`,
          width: PANEL_WIDTH,
          zIndex: sizes.zIndex.fixed,
          ...glassPanel,
          borderRadius: sizes.borderRadius.xl,
          boxShadow: shadows.lg,
          transform: isOpen && !isCollapsed ? 'translateX(0)' : `translateX(calc(-100% - ${spacing.lg}))`,
          transition: 'transform 250ms ease',
          overflow: 'hidden',
        }}
      >
        {selectedObject && (
          <>
            {/* Header */}
            <div style={{ padding: `${spacing.md} ${spacing.md} 0`, flexShrink: 0 }}>
              {/* Title row */}
              <div className="flex items-start justify-between">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ color: colors.text.primary, fontSize: '18px', fontWeight: 600, margin: 0 }}>
                    {selectedObject.name}
                  </h2>
                  <div style={{ fontSize: '13px', color: colors.text.muted, marginTop: '2px', textTransform: 'capitalize' }}>
                    {selectedObject.type.replace('_', ' ')}
                    {selectedObject.magnitude != null && (
                      <span style={{ marginLeft: '8px' }}>mag {selectedObject.magnitude.toFixed(1)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center" style={{ gap: '4px', flexShrink: 0 }}>
                  <HintButton icon={faArrowsRotate} hint="Change object" onClick={() => setIsSelectorOpen(true)} />
                  <HintButton icon={faCube} hint="See in 3D" onClick={handleViewIn3D} />
                  <HintButton icon={faXmark} hint="Close" onClick={handleClose} style={{ background: 'none', border: 'none', fontSize: '14px' }} />
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

              {/* Location */}
              <LocationRow />

              {/* Divider */}
              <div style={{ height: 1, background: colors.navbar.border, margin: '12px 0' }} />

              {/* Visibility bar */}
              {userLocation && visibilityScore != null && (
                <div style={{ marginBottom: '12px' }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: '5px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: colors.text.primary }}>Visibility</span>
                    <span style={{ fontSize: '12px', color: getVisibilityColor(visibilityScore), fontWeight: 600 }}>
                      {Math.round(visibilityScore * 100)}%
                    </span>
                  </div>
                  <div style={{
                    width: '100%', height: '6px', borderRadius: '3px',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${visibilityScore * 100}%`, height: '100%',
                      borderRadius: '3px',
                      background: `linear-gradient(to right, ${getVisibilityColor(visibilityScore * 0.5)}, ${getVisibilityColor(visibilityScore)})`,
                      transition: 'width 300ms ease',
                    }} />
                  </div>
                </div>
              )}

              {/* Yallop crescent zone (Moon only, < 10% illumination) */}
              {yallopResult && userLocation && (
                <div className="flex items-center" style={{ gap: '8px', marginBottom: '12px' }}>
                  <div style={{
                    width: 20, height: 16, borderRadius: 3,
                    backgroundColor: ZONE_COLORS[yallopResult.zone],
                    opacity: yallopResult.zone === 'F' ? 0.5 : 0.85,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 700, flexShrink: 0,
                    color: yallopResult.zone === 'C' || yallopResult.zone === 'D' ? '#000' : '#fff',
                  }}>
                    {yallopResult.zone}
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: colors.text.primary }}>
                      Crescent: {yallopResult.label}
                    </div>
                    <div style={{ fontSize: '11px', color: colors.text.muted }}>
                      Yallop q = {yallopResult.q.toFixed(3)}
                    </div>
                  </div>
                </div>
              )}

              {/* Rise/Set times */}
              <RiseSetTimes />

              {/* Moon phase (if Moon) */}
              {selectedObject.id === 'moon' && <MoonPhaseIcon />}
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto" style={{ padding: `${spacing.sm} ${spacing.md} 0`, minHeight: 0 }}>
              {/* Map Overlays */}
              <SectionHeader title="Map Overlays" />
              <ToggleRow
                label="Visibility Grid"
                checked={visualizationMode === 'hex'}
                onChange={(v) => {
                  pushEvent('toggle_hex_grid', { enabled: v })
                  setVisualizationMode(v ? 'hex' : 'none')
                }}
              />
              <ToggleRow
                label="Crescent Visibility Zones"
                checked={showCrescentZones}
                onChange={(v) => {
                  pushEvent('toggle_crescent_zones', { enabled: v })
                  setShowCrescentZones(v)
                }}
                disabled={!showCrescentToggle}
                disabledHint="Moon only, < 10% illumination"
              />
              <ToggleRow
                label="Constellation Lines"
                checked={showConstellationLines}
                onChange={(v) => {
                  pushEvent('toggle_constellation_lines', { enabled: v })
                  setShowConstellationLines(v)
                }}
              />

              {/* Probed Location */}
              <ProbedLocationSection />

              {/* Altitude Chart */}
              <SectionHeader title="Altitude Tonight" />
              <div style={{ height: 180, marginLeft: `-${spacing.md}`, marginRight: `-${spacing.md}` }}>
                <AltitudeChart
                  location={userLocation ?? DEFAULT_LOCATION}
                  objectId={selectedObject?.id ?? 'moon'}
                />
              </div>

              {/* Community Reports */}
              <SectionHeader title="Community Reports" count={totalReports} />
              <div style={{ paddingBottom: spacing.sm }}>
                <ReportsContent />
              </div>
            </div>

            {/* Pinned report button at bottom */}
            <div style={{
              padding: `${spacing.sm} ${spacing.md} ${spacing.md}`,
              flexShrink: 0,
              borderTop: `1px solid ${colors.navbar.border}`,
            }}>
              <button
                onClick={() => {
                  pushEvent('report_button_click', {})
                  !user ? openAuthModal() : openReportModal()
                }}
                className="btn-press"
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  border: `1px solid ${colors.navbar.border}`,
                  borderRadius: sizes.borderRadius.md,
                  color: colors.text.primary,
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {!user ? 'Log in to Report Visibility' : 'Report Visibility'}
              </button>

            </div>
          </>
        )}
      </div>

      {/* Feature panel — slides in same position as object panel */}
      <div
        className="fixed flex flex-col"
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
        }}
      >
        {activeFeature && (
          <>
            {/* Header */}
            <div style={{
              padding: `${spacing.md} ${spacing.md} 0`, flexShrink: 0,
            }}>
              <div className="flex items-center justify-between">
                <h2 style={{ color: colors.text.primary, fontSize: '18px', fontWeight: 600, margin: 0 }}>
                  {FEATURE_TITLES[activeFeature]}
                </h2>
                <div className="flex items-center" style={{ gap: '4px' }}>
                  <HintButton icon={faXmark} hint="Close" onClick={() => setActiveFeature(null)} style={{ background: 'none', border: 'none', fontSize: '14px' }} />
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

            {/* Scrollable content */}
            <div className="overflow-y-auto" style={{ padding: spacing.md, minHeight: 0 }}>
              {activeFeature === 'tonight' && <TonightsSky location={userLocation ?? DEFAULT_LOCATION} />}
              {activeFeature === 'events' && <UpcomingEventsPanel hideHeader />}
              {activeFeature === 'log' && <ObservationLogCard hideHeader />}
            </div>
          </>
        )}
      </div>

      {/* Collapsed expand button — floating circle on left edge (ScenePanel style) */}
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

      {/* Floating legend — bottom-right, outside wrapper */}
      {(visualizationMode === 'hex' || showCrescentZones) && (
        <div
          className="fixed"
          style={{
            bottom: spacing.md,
            right: spacing.md,
            zIndex: sizes.zIndex.fixed,
            ...glassPanel,
            borderRadius: sizes.borderRadius.xl,
            padding: `${spacing.sm} ${spacing.md}`,
            boxShadow: shadows.lg,
          }}
        >
          {showCrescentZones ? (
            <>
              <div style={{ fontSize: '13px', fontWeight: 600, color: colors.text.primary, marginBottom: '8px' }}>
                Crescent Visibility (Yallop)
              </div>
              {CRESCENT_ZONES.map((zone) => (
                <div key={zone} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <div style={{
                    width: 18, height: 14, borderRadius: 2,
                    backgroundColor: ZONE_COLORS[zone],
                    opacity: zone === 'F' ? 0.5 : 0.85,
                    flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 700,
                    color: zone === 'C' || zone === 'D' ? '#000' : '#fff',
                  }}>
                    {zone}
                  </div>
                  <span style={{ fontSize: '11px', color: colors.text.muted }}>{ZONE_DESCS[zone]}</span>
                </div>
              ))}
            </>
          ) : (
            <>
              <div style={{ fontSize: '13px', fontWeight: 600, color: colors.text.primary, marginBottom: '8px' }}>
                Visibility
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <div style={{
                  width: 115, height: 12, borderRadius: 3,
                  background: `linear-gradient(to right, ${getVisibilityColor(0)}, ${getVisibilityColor(0.25)}, ${getVisibilityColor(0.5)}, ${getVisibilityColor(0.75)}, ${getVisibilityColor(1)})`,
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: 115 }}>
                <span style={{ fontSize: '10px', color: colors.text.muted }}>Poor</span>
                <span style={{ fontSize: '10px', color: colors.text.muted }}>Excellent</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '5px' }}>
                <div style={{ width: 18, height: 12, borderRadius: 2, backgroundColor: '#6B7280', opacity: 0.5, flexShrink: 0 }} />
                <span style={{ fontSize: '10px', color: colors.text.muted }}>No weather data</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Object selector modal */}
      {isSelectorOpen && <ObjectSelectorModal onClose={() => setIsSelectorOpen(false)} />}
    </>
  )
}

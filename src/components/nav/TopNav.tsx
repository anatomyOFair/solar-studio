import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../../store/store'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faClock,
  faGear,
  faGlobe,
  faCube,
  faCircleUser,
  faRightToBracket,
  faArrowUpRightFromSquare,
} from '@fortawesome/free-solid-svg-icons'
import { colors, spacing, sizes, shadows } from '../../constants'

// Must match PANEL_WIDTH in MapPanel.tsx
const NAV_WIDTH = 'clamp(322px, 25vw, 391px)'

// ── Toggle Row ───────────────────────────────────────────────────────────

function ToggleRow({ label, checked, onChange }: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 14px', cursor: 'pointer', userSelect: 'none',
      }}
    >
      <span style={{ fontSize: 13, color: colors.text.secondary }}>{label}</span>
      <div style={{
        width: 32, height: 18, borderRadius: 9,
        background: checked ? colors.primary[500] : 'rgba(255,255,255,0.15)',
        position: 'relative', transition: 'background 200ms ease',
        flexShrink: 0, marginLeft: 12,
      }}>
        <div style={{
          width: 14, height: 14, borderRadius: '50%',
          background: 'white',
          position: 'absolute', top: 2,
          left: checked ? 16 : 2,
          transition: 'left 200ms ease',
        }} />
      </div>
    </div>
  )
}

// ── Settings Dropdown ────────────────────────────────────────────────────

function SettingsDropdown({ onClose, menuRef, anchorRef }: {
  onClose: () => void
  menuRef: React.RefObject<HTMLDivElement | null>
  anchorRef: React.RefObject<HTMLButtonElement | null>
}) {
  const user = useStore((state) => state.user)
  const openAuthModal = useStore((state) => state.openAuthModal)
  const openAccountModal = useStore((state) => state.openAccountModal)
  const viewMode = useStore((state) => state.viewMode)
  const nightVision = useStore((state) => state.nightVision)
  const toggleNightVision = useStore((state) => state.toggleNightVision)
  const showLabels = useStore((state) => state.showLabels)
  const setShowLabels = useStore((state) => state.setShowLabels)
  const showMissionLabels = useStore((state) => state.showMissionLabels)
  const setShowMissionLabels = useStore((state) => state.setShowMissionLabels)
  const showOrbits = useStore((state) => state.showOrbits)
  const setShowOrbits = useStore((state) => state.setShowOrbits)
  const userLocation = useStore((state) => state.userLocation)
  const setUserLocation = useStore((state) => state.setUserLocation)
  const fetchUserLocation = useStore((state) => state.fetchUserLocation)

  const [pos, setPos] = useState({ top: 0, left: 0 })
  useLayoutEffect(() => {
    const el = anchorRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setPos({ top: r.bottom + 8, left: r.left })
  }, [anchorRef])

  const sectionHeaderStyle: React.CSSProperties = {
    fontSize: 10, color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    padding: '8px 14px 4px',
  }

  const dividerStyle: React.CSSProperties = {
    height: 1,
    background: 'rgba(255,255,255,0.08)',
    margin: '4px 0',
  }

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        minWidth: 'min(220px, 80vw)',
        backgroundColor: colors.navbar.background,
        backdropFilter: `blur(${sizes.blur.default})`,
        WebkitBackdropFilter: `blur(${sizes.blur.default})`,
        border: `1px solid ${colors.navbar.border}`,
        borderRadius: sizes.borderRadius.lg,
        boxShadow: shadows.lg,
        zIndex: sizes.zIndex.modal + 10,
        padding: '6px 0',
        color: 'white',
        animation: 'dropdownIn 150ms ease-out both',
      }}
    >
      {/* View-specific settings */}
      {viewMode === '2d' && (
        <>
          <div style={sectionHeaderStyle}>Map</div>
          <ToggleRow label="Night Vision" checked={nightVision} onChange={() => toggleNightVision()} />
        </>
      )}

      {viewMode === '3d' && (
        <>
          <div style={sectionHeaderStyle}>3D View</div>
          <ToggleRow label="Object Labels" checked={showLabels} onChange={setShowLabels} />
          <ToggleRow label="Mission Labels" checked={showMissionLabels} onChange={setShowMissionLabels} />
          <ToggleRow label="Orbit Lines" checked={showOrbits} onChange={setShowOrbits} />
        </>
      )}

      <div style={dividerStyle} />

      {/* Location */}
      <div style={sectionHeaderStyle}>Location</div>
      <ToggleRow
        label={userLocation ? userLocation.label : 'Detect Location'}
        checked={!!userLocation}
        onChange={(on) => {
          if (on) fetchUserLocation()
          else setUserLocation(null)
        }}
      />

      <div style={dividerStyle} />

      {/* Account */}
      <div style={sectionHeaderStyle}>Account</div>
      {user ? (
        <button
          className="btn-press"
          onClick={() => { onClose(); openAccountModal() }}
          style={{
            width: '100%', textAlign: 'left',
            padding: '6px 14px',
            background: 'transparent', border: 'none',
            color: colors.text.secondary, cursor: 'pointer',
            fontSize: 13, fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <FontAwesomeIcon icon={faCircleUser} style={{ fontSize: 14, color: colors.text.muted }} />
          <span style={{ flex: 1 }}>{user.user_metadata?.full_name || user.email}</span>
          <FontAwesomeIcon icon={faArrowUpRightFromSquare} style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }} />
        </button>
      ) : (
        <button
          className="btn-press"
          onClick={() => { onClose(); openAuthModal() }}
          style={{
            width: '100%', textAlign: 'left',
            padding: '6px 14px',
            background: 'transparent', border: 'none',
            color: colors.text.secondary, cursor: 'pointer',
            fontSize: 13, fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <FontAwesomeIcon icon={faRightToBracket} style={{ fontSize: 12, color: colors.text.muted }} />
          Log In
        </button>
      )}
    </div>,
    document.body,
  )
}

// ── TopNav ────────────────────────────────────────────────────────────────

export default function TopNav() {
  const isLocalTime = useStore((state) => state.isLocalTime)
  const toggleLocalTime = useStore((state) => state.toggleLocalTime)
  const viewMode = useStore((state) => state.viewMode)
  const simulatedTime = useStore((state) => state.simulatedTime)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const settingsRef = useRef<HTMLDivElement>(null)
  const settingsBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (simulatedTime) return // Don't tick when simulating
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [simulatedTime])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isSettingsOpen &&
        settingsRef.current && !settingsRef.current.contains(event.target as Node) &&
        settingsBtnRef.current && !settingsBtnRef.current.contains(event.target as Node)
      ) {
        setIsSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isSettingsOpen])

  const displayTime = simulatedTime ?? currentTime

  const formatTime = () => {
    if (isLocalTime) {
      return displayTime.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    }
    return displayTime.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }) + ' UTC'
  }

  const formatDate = () => {
    return displayTime.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  const handleTimeToggle = () => {
    toggleLocalTime()
  }

  const setViewMode = useStore((state) => state.setViewMode)

  const VIEW_PILLS: { mode: '2d' | '3d'; label: string; icon: typeof faGlobe }[] = [
    { mode: '2d', label: 'Map', icon: faGlobe },
    { mode: '3d', label: '3D', icon: faCube },
  ]

  return (
    <nav
      className="fixed"
      style={{
        top: spacing.md,
        left: spacing.md,
        width: NAV_WIDTH,
        zIndex: sizes.zIndex.fixed + 10,
        backgroundColor: colors.navbar.background,
        backdropFilter: `blur(${sizes.blur.default})`,
        WebkitBackdropFilter: `blur(${sizes.blur.default})`,
        border: `1px solid ${colors.navbar.border}`,
        borderRadius: sizes.borderRadius.xl,
        padding: `${spacing.sm} ${spacing.md}`,
      }}
    >
      {/* Row 1: Logo + Title + Settings */}
      <div className="flex items-center" style={{ color: 'white', gap: '10px', height: '30px' }}>
        <svg width="22" height="22" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
          <circle cx="32" cy="32" r="14" fill="#f59e0b" />
          <g stroke="#f59e0b" strokeWidth="3" strokeLinecap="round">
            <line x1="32" y1="4" x2="32" y2="14" />
            <line x1="32" y1="50" x2="32" y2="60" />
            <line x1="4" y1="32" x2="14" y2="32" />
            <line x1="50" y1="32" x2="60" y2="32" />
            <line x1="12.2" y1="12.2" x2="19.3" y2="19.3" />
            <line x1="44.7" y1="44.7" x2="51.8" y2="51.8" />
            <line x1="12.2" y1="51.8" x2="19.3" y2="44.7" />
            <line x1="44.7" y1="19.3" x2="51.8" y2="12.2" />
          </g>
        </svg>
        <span style={{ fontSize: '16px', fontWeight: 600, flex: 1 }}>Solar Studio</span>
        <div className="relative" data-hint="night-vision" style={{ flexShrink: 0 }}>
          <button
            ref={settingsBtnRef}
            onClick={() => setIsSettingsOpen((prev) => !prev)}
            className="btn-press flex items-center justify-center hover:opacity-80 transition-opacity bg-transparent border-none"
            style={{
              backgroundColor: 'transparent',
              color: 'white',
              cursor: 'pointer',
              width: 28,
              height: 28,
            }}
            aria-label="Settings"
            title="Settings"
          >
            <FontAwesomeIcon icon={faGear} style={{ color: 'white', fontSize: '13px' }} />
          </button>

          {isSettingsOpen && (
            <SettingsDropdown
              menuRef={settingsRef}
              anchorRef={settingsBtnRef}
              onClose={() => setIsSettingsOpen(false)}
            />
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '6px 0' }} />

      {/* Row 2: Time + View switcher */}
      <div className="flex items-center" style={{ color: 'white', gap: '8px', height: '28px' }}>
        <button
          onClick={handleTimeToggle}
          className="flex items-center hover:opacity-80 transition-opacity bg-transparent border-none"
          style={{
            backgroundColor: 'transparent',
            color: simulatedTime ? colors.primary[400] : colors.text.secondary,
            fontFamily: 'inherit',
            fontSize: '12px',
            fontWeight: 400,
            gap: '5px',
            flex: 1,
            minWidth: 0,
            justifyContent: 'flex-start',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <FontAwesomeIcon icon={faClock} style={{ fontSize: '11px', flexShrink: 0 }} />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {formatDate()} {formatTime()}
          </span>
        </button>

        <div
          className="flex items-center"
          style={{
            gap: '2px',
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderRadius: sizes.borderRadius.md,
            padding: '2px',
            flexShrink: 0,
          }}
        >
          {VIEW_PILLS.map(({ mode, label, icon }) => {
            const active = viewMode === mode
            return (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="btn-press flex items-center transition-all"
                style={{
                  justifyContent: 'center',
                  gap: '4px',
                  padding: '3px 10px',
                  borderRadius: `calc(${sizes.borderRadius.md} - 2px)`,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 500,
                  fontFamily: 'inherit',
                  backgroundColor: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                  color: active ? 'white' : colors.text.muted,
                }}
              >
                <FontAwesomeIcon icon={icon} style={{ fontSize: '10px' }} />
                {label}
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

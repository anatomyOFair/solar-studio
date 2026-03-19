import { useState, useEffect, useRef, useMemo, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../../store/store'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faClock,
  faSearch,
  faGear,
  faSignOutAlt,
  faRightToBracket,
  faGlobe,
  faCube,
  faHouse,
} from '@fortawesome/free-solid-svg-icons'
import { colors, spacing, sizes, shadows } from '../../constants'

/** Simple fuzzy match: checks if all characters of query appear in order within target */
function fuzzyMatch(query: string, target: string): { match: boolean; score: number } {
  const q = query.toLowerCase()
  const t = target.toLowerCase()
  if (q.length === 0) return { match: true, score: 0 }

  let qi = 0
  let score = 0
  let prevMatchIdx = -1
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      // Bonus for consecutive matches
      if (prevMatchIdx === ti - 1) score += 2
      // Bonus for matching at word start
      if (ti === 0 || t[ti - 1] === ' ') score += 3
      score += 1
      prevMatchIdx = ti
      qi++
    }
  }
  return { match: qi === q.length, score }
}

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
  const logout = useStore((state) => state.logout)
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

  const [pos, setPos] = useState({ top: 0, right: 0 })
  useLayoutEffect(() => {
    const el = anchorRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setPos({ top: r.bottom + 12, right: window.innerWidth - r.right })
  }, [anchorRef])

  const handleLogin = () => {
    onClose()
    openAuthModal()
  }

  const handleLogout = async () => {
    onClose()
    await logout()
  }

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
        right: pos.right,
        minWidth: 220,
        backgroundColor: colors.navbar.background,
        backdropFilter: `blur(${sizes.blur.default})`,
        WebkitBackdropFilter: `blur(${sizes.blur.default})`,
        border: `1px solid ${colors.navbar.border}`,
        borderRadius: sizes.borderRadius.lg,
        boxShadow: shadows.lg,
        zIndex: sizes.zIndex.modal + 10,
        padding: '6px 0',
        color: 'white',
      }}
    >
      {/* View-specific settings */}
      {viewMode === 'home' && (
        <>
          <div style={sectionHeaderStyle}>Home</div>
          <ToggleRow label="Night Vision" checked={nightVision} onChange={() => toggleNightVision()} />
        </>
      )}

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
        <>
          <div style={{ padding: '4px 14px 6px' }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>
              {user.user_metadata?.full_name || user.email}
            </div>
            {user.user_metadata?.full_name && user.email && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{user.email}</div>
            )}
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', textAlign: 'left',
              padding: '6px 14px',
              background: 'transparent', border: 'none',
              color: colors.status.error, cursor: 'pointer',
              fontSize: 13, fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
            className="hover:bg-white/5"
          >
            <FontAwesomeIcon icon={faSignOutAlt} style={{ fontSize: 12 }} />
            Log Out
          </button>
        </>
      ) : (
        <button
          onClick={handleLogin}
          style={{
            width: '100%', textAlign: 'left',
            padding: '6px 14px',
            background: 'transparent', border: 'none',
            color: colors.text.secondary, cursor: 'pointer',
            fontSize: 13, fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
          className="hover:bg-white/5"
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
  const objects = useStore((state) => state.objects)
  const setSelectedObject = useStore((state) => state.setSelectedObject)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const settingsRef = useRef<HTMLDivElement>(null)
  const settingsBtnRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchDropdownRef = useRef<HTMLDivElement>(null)

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
      if (
        searchRef.current && !searchRef.current.contains(event.target as Node) &&
        (!searchDropdownRef.current || !searchDropdownRef.current.contains(event.target as Node))
      ) {
        setIsSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isSettingsOpen])

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    return objects
      .filter((obj) => obj.id !== 'earth')
      .map((obj) => ({ obj, ...fuzzyMatch(searchQuery, obj.name) }))
      .filter((r) => r.match)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((r) => r.obj)
  }, [searchQuery, objects])

  // Reset highlight when results change
  useEffect(() => {
    setHighlightedIndex(-1)
  }, [searchResults])

  const showSearchDropdown = isSearchFocused && searchQuery.trim().length > 0

  const getSearchDropdownPos = useCallback(() => {
    const el = searchRef.current
    if (!el) return { top: 0, left: 0 }
    const r = el.getBoundingClientRect()
    return { top: r.bottom + 12, left: r.left - 8 }
  }, [])

  const handleSearchSelect = (obj: typeof objects[number]) => {
    setSelectedObject(obj)
    setSearchQuery('')
    setIsSearchFocused(false)
    setHighlightedIndex(-1)
  }

  const displayTime = simulatedTime ?? currentTime

  const formatTime = () => {
    const dateStr = displayTime.toLocaleDateString()
    if (isLocalTime) {
      const timeStr = displayTime.toLocaleTimeString()
      return `${dateStr} ${timeStr}`
    } else {
      const utc = displayTime.toUTCString()
      const timeStr = utc.split(' ')[4]
      return `${dateStr} ${timeStr} UTC`
    }
  }

  const handleTimeToggle = () => {
    toggleLocalTime()
  }

  const VIEW_CONFIG = {
    home: { label: 'Home', icon: faHouse },
    '2d': { label: 'Map', icon: faGlobe },
    '3d': { label: '3D', icon: faCube },
  } as const
  const currentView = VIEW_CONFIG[viewMode]

  return (
    <nav
      className="fixed"
      style={{
        top: spacing.md,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '80%',
        height: '48px',
        minHeight: '48px',
        zIndex: sizes.zIndex.fixed + 10,
        backgroundColor: colors.navbar.background,
        backdropFilter: `blur(${sizes.blur.default})`,
        WebkitBackdropFilter: `blur(${sizes.blur.default})`,
        border: `1px solid ${colors.navbar.border}`,
        borderRadius: sizes.borderRadius.xl,
        padding: `0 ${spacing.sm}`,
      }}
    >
      <div className="h-full flex flex-row items-center justify-between" style={{ color: 'white' }}>
        {/* 1. Logo and Solar Studio */}
        <div className="flex items-center gap-2">
          <svg width="22" height="22" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
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
          <span style={{ color: 'white', fontSize: '16px', fontWeight: '500', letterSpacing: '-0.01em' }}>Solar Studio</span>
        </div>

        {/* 2. Date and Time */}
        <button
          onClick={handleTimeToggle}
          className="flex items-center hover:opacity-80 transition-opacity bg-transparent border-none"
          style={{ backgroundColor: 'transparent', color: 'white', width: sizes.widget.timeButtonWidth, minWidth: sizes.widget.timeButtonWidth, maxWidth: sizes.widget.timeButtonWidth, justifyContent: 'flex-start', fontFamily: 'inherit', fontSize: '16px', fontWeight: '400', gap: spacing.sm }}
        >
          <FontAwesomeIcon icon={faClock} style={{ color: simulatedTime ? colors.primary[400] : 'white', fontSize: '18px' }} />
          <span style={{ color: simulatedTime ? colors.primary[400] : 'white', fontFamily: 'inherit', fontSize: '16px', fontWeight: '400' }}>{formatTime()}</span>
        </button>

        {/* 3. View indicator */}
        <div
          className="flex items-center"
          style={{ gap: spacing.sm, opacity: 0.7 }}
        >
          <FontAwesomeIcon icon={currentView.icon} style={{ color: 'white', fontSize: '16px' }} />
          <span style={{ color: 'white', fontFamily: 'inherit', fontSize: '14px', fontWeight: '400' }}>{currentView.label}</span>
        </div>

        {/* 5. Search Bar */}
        <div className="relative flex items-center" style={{ gap: spacing.sm }} ref={searchRef} data-hint="search">
          <FontAwesomeIcon icon={faSearch} style={{ color: 'white', fontSize: '18px' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSearchQuery('')
                setIsSearchFocused(false)
                setHighlightedIndex(-1)
                ;(e.target as HTMLInputElement).blur()
              } else if (e.key === 'ArrowDown') {
                e.preventDefault()
                setHighlightedIndex((prev) => Math.min(prev + 1, searchResults.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setHighlightedIndex((prev) => Math.max(prev - 1, 0))
              } else if (e.key === 'Enter' && searchResults.length > 0) {
                const idx = highlightedIndex >= 0 ? highlightedIndex : 0
                handleSearchSelect(searchResults[idx])
                ;(e.target as HTMLInputElement).blur()
              }
            }}
            placeholder="Search..."
            className="bg-transparent border-none outline-none text-sm search-input"
            style={{
              width: sizes.widget.searchWidth,
              color: '#ffffff',
              fontSize: '16px'
            }}
          />

          {/* Search Results Dropdown (portaled to body for backdrop-filter) */}
          {showSearchDropdown && createPortal(
            <div
              ref={searchDropdownRef}
              className="flex flex-col"
              style={{
                position: 'fixed',
                ...getSearchDropdownPos(),
                minWidth: '220px',
                backgroundColor: colors.navbar.background,
                backdropFilter: `blur(${sizes.blur.default})`,
                WebkitBackdropFilter: `blur(${sizes.blur.default})`,
                border: `1px solid ${colors.navbar.border}`,
                borderRadius: sizes.borderRadius.lg,
                padding: spacing.xs,
                boxShadow: shadows.lg,
                zIndex: sizes.zIndex.modal + 10,
              }}
            >
              {searchResults.length === 0 ? (
                <div style={{ padding: `${spacing.sm} ${spacing.md}`, color: colors.text.muted, fontSize: '13px' }}>
                  No results
                </div>
              ) : (
                searchResults.map((obj, i) => (
                  <button
                    key={obj.id}
                    onClick={() => handleSearchSelect(obj)}
                    onMouseEnter={() => setHighlightedIndex(i)}
                    className="w-full text-left transition-colors"
                    style={{
                      padding: `${spacing.sm} ${spacing.md}`,
                      backgroundColor: i === highlightedIndex ? 'rgba(255,255,255,0.08)' : 'transparent',
                      border: 'none',
                      color: colors.text.primary,
                      fontSize: '13px',
                      cursor: 'pointer',
                      borderRadius: sizes.borderRadius.md,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{obj.name}</span>
                    <span style={{ fontSize: '11px', color: colors.text.muted, textTransform: 'capitalize' }}>{obj.type.replace('_', ' ')}</span>
                  </button>
                ))
              )}
            </div>,
            document.body,
          )}
        </div>

        {/* 6. Settings Gear */}
        <div className="relative" data-hint="night-vision">
          <button
            ref={settingsBtnRef}
            onClick={() => setIsSettingsOpen((prev) => !prev)}
            className="flex items-center justify-center hover:opacity-80 transition-opacity bg-transparent border-none"
            style={{
              backgroundColor: 'transparent',
              color: 'white',
              cursor: 'pointer',
              width: 36,
              height: 36,
            }}
            aria-label="Settings"
            title="Settings"
          >
            <FontAwesomeIcon icon={faGear} style={{ color: 'white', fontSize: '18px' }} />
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
    </nav>
  )
}

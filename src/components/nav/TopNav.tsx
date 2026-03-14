import { useState, useEffect, useRef, useMemo } from 'react'
import { useStore } from '../../store/store'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faClock,
  faCamera,
  faClockRotateLeft,
  faSearch,
  faUser,
  faRightToBracket,
  faSignOutAlt
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

export default function TopNav() {
  const isLocalTime = useStore((state) => state.isLocalTime)
  const toggleLocalTime = useStore((state) => state.toggleLocalTime)
  const viewMode = useStore((state) => state.viewMode)
  const setViewMode = useStore((state) => state.setViewMode)
  const simulatedTime = useStore((state) => state.simulatedTime)
  const objects = useStore((state) => state.objects)
  const setSelectedObject = useStore((state) => state.setSelectedObject)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const user = useStore((state) => state.user)
  const openAuthModal = useStore((state) => state.openAuthModal)
  const logout = useStore((state) => state.logout)
  const menuRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (simulatedTime) return // Don't tick when simulating
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [simulatedTime])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  const handleViewToggle = () => {
    setViewMode(viewMode === '2d' ? '3d' : '2d')
  }

  const handleUserClick = () => {
    if (user) {
      setIsUserMenuOpen(!isUserMenuOpen)
    } else {
      openAuthModal()
    }
  }

  const handleLogout = async () => {
    setIsUserMenuOpen(false)
    await logout()
  }

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
        zIndex: sizes.zIndex.fixed,
        backgroundColor: colors.navbar.background,
        backdropFilter: `blur(${sizes.blur.default})`,
        WebkitBackdropFilter: `blur(${sizes.blur.default})`,
        border: `1px solid ${colors.navbar.border}`,
        borderRadius: sizes.borderRadius.xl,
        padding: `0 ${spacing.sm}`,
      }}
    >
      <div className="h-full flex flex-row items-center justify-between" style={{ color: 'white' }}>
        {/* 1. Logo and solarStudio */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-white rounded"></div>
          <span className="text-sm" style={{ color: 'white', fontSize: '16px', fontWeight: '400' }}>solarStudio</span>
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

        {/* 3. Camera and Map/3D Toggle */}
        <button
          onClick={handleViewToggle}
          className="flex items-center hover:opacity-80 transition-opacity bg-transparent border-none"
          style={{ backgroundColor: 'transparent', color: 'white', fontFamily: 'inherit', fontSize: '16px', fontWeight: '400', gap: spacing.sm }}
        >
          <FontAwesomeIcon icon={faCamera} style={{ color: 'white', fontSize: '18px' }} />
          <span style={{ color: 'white', fontFamily: 'inherit', fontSize: '16px', fontWeight: '400' }}>{viewMode === '3d' ? '3D' : 'Map'}</span>
        </button>

        {/* 4. History */}
        <div className="flex items-center opacity-50" style={{ gap: spacing.sm }}>
          <FontAwesomeIcon icon={faClockRotateLeft} style={{ color: 'white', fontSize: '18px' }} />
          <span style={{ color: 'white', fontFamily: 'inherit', fontSize: '16px', fontWeight: '400' }}>History</span>
        </div>

        {/* 5. Search Bar */}
        <div className="relative flex items-center" style={{ gap: spacing.sm }} ref={searchRef}>
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

          {/* Search Results Dropdown */}
          {showSearchDropdown && (
            <div
              className="absolute flex flex-col"
              style={{
                top: 'calc(100% + 24px)',
                left: '-8px',
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
            </div>
          )}
        </div>

        {/* User Profile / Login */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={handleUserClick}
            className="flex items-center hover:opacity-80 transition-opacity bg-transparent border-none"
            style={{ backgroundColor: 'transparent', color: 'white', gap: spacing.sm, fontFamily: 'inherit', fontSize: '16px', fontWeight: '400', cursor: 'pointer' }}
          >
            {user ? (
               <FontAwesomeIcon icon={faUser} style={{ color: 'white', fontSize: '18px' }} />
            ) : (
               <div className="flex items-center gap-2">
                   <span className="text-sm hidden sm:block">Log In</span>
                   <FontAwesomeIcon icon={faRightToBracket} style={{ color: 'white', fontSize: '18px' }} />
               </div>
            )}
          </button>

          {/* User Menu */}
          {user && isUserMenuOpen && (
            <div
                className="absolute right-0 mt-2 flex flex-col"
                style={{
                    top: '100%',
                    minWidth: '200px',
                    backgroundColor: colors.navbar.background,
                    backdropFilter: `blur(${sizes.blur.default})`,
                    WebkitBackdropFilter: `blur(${sizes.blur.default})`,
                    border: `1px solid ${colors.navbar.border}`,
                    borderRadius: sizes.borderRadius.lg,
                    padding: spacing.sm,
                    boxShadow: shadows.lg,
                    zIndex: sizes.zIndex.modal + 10 // Ensure it's on top
                }}
            >
                <div className="px-3 py-2 border-b border-gray-700/50 mb-1">
                    <span className="text-xs text-gray-400 block">Signed in as</span>
                    <span className="text-sm font-medium text-white block truncate">
                        {user.user_metadata?.full_name || user.email}
                    </span>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-white/5 rounded-md w-full text-left transition-colors"
                >
                    <FontAwesomeIcon icon={faSignOutAlt} />
                    <span>Log Out</span>
                </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

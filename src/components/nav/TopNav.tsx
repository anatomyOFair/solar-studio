import { useState, useEffect, useRef } from 'react'
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

export default function TopNav() {
  const isLocalTime = useStore((state) => state.isLocalTime)
  const toggleLocalTime = useStore((state) => state.toggleLocalTime)
  const viewMode = useStore((state) => state.viewMode)
  const setViewMode = useStore((state) => state.setViewMode)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  
  const user = useStore((state) => state.user)
  const openAuthModal = useStore((state) => state.openAuthModal)
  const logout = useStore((state) => state.logout)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      clearInterval(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const formatTime = () => {
    const dateStr = currentTime.toLocaleDateString()
    if (isLocalTime) {
      const timeStr = currentTime.toLocaleTimeString()
      return `${dateStr} ${timeStr}`
    } else {
      const utc = currentTime.toUTCString()
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
          <FontAwesomeIcon icon={faClock} style={{ color: 'white', fontSize: '18px' }} />
          <span style={{ color: 'white', fontFamily: 'inherit', fontSize: '16px', fontWeight: '400' }}>{formatTime()}</span>
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
        <div className="flex items-center opacity-50" style={{ color: 'white', gap: spacing.sm }}>
          <FontAwesomeIcon icon={faClockRotateLeft} style={{ color: 'white', fontSize: '18px' }} />
          <span className="text-sm" style={{ color: 'white', fontSize: '16px', fontWeight: '400' }}>Not Implemented</span>
        </div>

        {/* 5. Search Bar */}
        <div className="flex items-center" style={{ gap: spacing.sm }}>
          <FontAwesomeIcon icon={faSearch} style={{ color: 'white', fontSize: '18px' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="bg-transparent border-none outline-none text-sm search-input"
            style={{ 
              width: sizes.widget.searchWidth, 
              color: '#ffffff', 
              fontSize: '16px'
            }}
          />
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

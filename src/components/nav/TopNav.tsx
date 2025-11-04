import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faClock,
  faCamera,
  faClockRotateLeft,
  faSearch
} from '@fortawesome/free-solid-svg-icons'
import { colors, spacing, sizes } from '../../constants'

export default function TopNav() {
  const [isLocalTime, setIsLocalTime] = useState(false)
  const [is3DView, setIs3DView] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
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
    setIsLocalTime(!isLocalTime)
  }

  const handleViewToggle = () => {
    alert('Not implemented');
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
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
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
          style={{ backgroundColor: 'transparent', color: 'white', width: '240px', minWidth: '240px', maxWidth: '240px', justifyContent: 'flex-start', fontFamily: 'inherit', fontSize: '16px', fontWeight: '400', gap: spacing.sm }}
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
          <span style={{ color: 'white', fontFamily: 'inherit', fontSize: '16px', fontWeight: '400' }}>{is3DView ? '3D' : 'Map'}</span>
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
              width: '150px', 
              color: '#ffffff', 
              fontSize: '16px'
            }}
          />
        </div>
      </div>
    </nav>
  )
}


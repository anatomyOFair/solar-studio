import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faHome,
  faCloud,
  faGear,
  faEarth,
  faLocationArrow,
  faPlus,
  faMinus,
  faLayerGroup
} from '@fortawesome/free-solid-svg-icons'
import { colors, spacing, sizes } from '../../constants'
import { useStore } from '../../store/store'

export default function SideNav() {
  const visualizationMode = useStore((state) => state.visualizationMode)
  const setVisualizationMode = useStore((state) => state.setVisualizationMode)
  const viewMode = useStore((state) => state.viewMode)
  const setViewMode = useStore((state) => state.setViewMode)
  const map = useStore((state) => state.map)

  const handleHomeClick = () => {
    // TODO: Implement home functionality
  }

  const handleSearchClick = () => {
    // TODO: Implement search functionality
  }

  const handleViewToggle = () => {
    setViewMode(viewMode === '2d' ? '3d' : '2d')
  }

  const handleUserClick = () => {
    // TODO: Implement user functionality
  }

  const handleInfoClick = () => {
    // TODO: Implement info functionality
  }

  // Toggle between modes: none ↔ hex
  const handleLayersClick = () => {
    setVisualizationMode(visualizationMode === 'none' ? 'hex' : 'none')
  }

  // Get icon color based on current mode
  const getLayerIconColor = () => {
    return visualizationMode === 'hex' ? '#4ADE80' : 'white'
  }

  const handleZoomIn = () => {
    if (map) {
      map.zoomIn()
    }
  }

  const handleZoomOut = () => {
    if (map) {
      map.zoomOut()
    }
  }

  return (
    <nav
      className="fixed flex flex-col justify-center"
      style={{
        top: '50%',
        left: spacing.md,
        transform: 'translateY(-50%)',
        width: '48px',
        height: '40%',
        minWidth: '48px',
        zIndex: sizes.zIndex.fixed,
        backgroundColor: colors.navbar.background,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${colors.navbar.border}`,
        borderRadius: sizes.borderRadius.xl,
        padding: `${spacing.sm} 0`,
      }}
    >
      <div 
        className="flex flex-col items-center h-full"
        style={{ justifyContent: 'space-between' }}
      >
        <button
          onClick={handleHomeClick}
          className="w-12 h-12 flex items-center justify-center text-white hover:opacity-80 transition-opacity bg-transparent border-none"
          style={{ backgroundColor: 'transparent', paddingTop: spacing.sm, paddingBottom: spacing.sm }}
          aria-label="home"
        >
          <FontAwesomeIcon icon={faHome} style={{ color: 'white', fontSize: '24px' }} />
        </button>

        <button
          onClick={handleLayersClick}
          className="w-12 h-12 flex items-center justify-center text-white hover:opacity-80 transition-opacity bg-transparent border-none"
          style={{ backgroundColor: 'transparent' }}
          aria-label="toggle visibility overlay"
          title={`Overlay: ${visualizationMode === 'none' ? 'Off' : 'On'}`}
        >
          <FontAwesomeIcon icon={faLayerGroup} style={{ color: getLayerIconColor(), fontSize: '24px' }} />
        </button>

        <button
          onClick={handleSearchClick}
          className="w-12 h-12 flex items-center justify-center text-white hover:opacity-80 transition-opacity bg-transparent border-none"
          style={{ backgroundColor: 'transparent' }}
          aria-label="search"
        >
          <FontAwesomeIcon icon={faCloud} style={{ color: 'white', fontSize: '24px' }} />
        </button>

        <button
          onClick={handleViewToggle}
          className="w-12 h-12 flex items-center justify-center text-white hover:opacity-80 transition-opacity bg-transparent border-none"
          style={{ backgroundColor: 'transparent' }}
          aria-label="toggle 2D/3D view"
          title={viewMode === '2d' ? 'Switch to 3D' : 'Switch to Map'}
        >
          <FontAwesomeIcon icon={faEarth} style={{ color: viewMode === '3d' ? '#4ADE80' : 'white', fontSize: '24px' }} />
        </button>

        <button
          onClick={handleUserClick}
          className="w-12 h-12 flex items-center justify-center text-white hover:opacity-80 transition-opacity bg-transparent border-none"
          style={{ backgroundColor: 'transparent' }}
          aria-label="user"
        >
          <FontAwesomeIcon icon={faLocationArrow} style={{ color: 'white', fontSize: '24px' }} />
        </button>

        <button
          onClick={handleInfoClick}
          className="w-12 h-12 flex items-center justify-center text-white hover:opacity-80 transition-opacity bg-transparent border-none"
          style={{ backgroundColor: 'transparent' }}
          aria-label="info"
        >
          <FontAwesomeIcon icon={faGear} style={{ color: 'white', fontSize: '24px' }} />
        </button>

        <button
          onClick={handleZoomIn}
          className="w-12 h-12 flex items-center justify-center text-white bg-transparent hover:opacity-80 transition-opacity border-none"
          style={{ backgroundColor: 'transparent' }}
        >
          <FontAwesomeIcon icon={faPlus} style={{ color: 'white', fontSize: '24px' }} />
        </button>
        <button
          onClick={handleZoomOut}
          className="w-12 h-12 flex items-center justify-center text-white bg-transparent hover:opacity-80 transition-opacity border-none"
          style={{ backgroundColor: 'transparent', lineHeight: 0, marginTop: '-12px' }}
        >
          <FontAwesomeIcon icon={faMinus} style={{ color: 'white', fontSize: '24px', lineHeight: 0 }} />
        </button>
      </div>
    </nav>
  )
}

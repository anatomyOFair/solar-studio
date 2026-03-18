import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faHome,
  faMap,
  faEarth,
} from '@fortawesome/free-solid-svg-icons'
import { colors, spacing, sizes } from '../../constants'
import { useStore } from '../../store/store'

// SVG rounded rect border animation
const SVG_SIZE = 46
const RECT_W = SVG_SIZE - 2
const RECT_R = 10
const PERIMETER = 2 * (RECT_W - 2 * RECT_R) + 2 * (RECT_W - 2 * RECT_R) + 2 * Math.PI * RECT_R

function NavButton({ active, onClick, icon, label, title }: {
  active?: boolean
  onClick: () => void
  icon: any
  label: string
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center hover:opacity-80 bg-transparent border-none"
      style={{
        position: 'relative',
        cursor: 'pointer',
        width: 50,
        height: 50,
      }}
      aria-label={label}
      title={title}
    >
      {/* Animated border */}
      <svg
        width={SVG_SIZE}
        height={SVG_SIZE}
        viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }}
      >
        <rect
          x={1}
          y={1}
          width={RECT_W}
          height={RECT_W}
          rx={RECT_R}
          ry={RECT_R}
          fill="none"
          stroke="rgba(255, 255, 255, 0.5)"
          strokeWidth="1.5"
          strokeDasharray={PERIMETER}
          strokeDashoffset={active ? 0 : PERIMETER}
          style={{
            transition: 'stroke-dashoffset 400ms ease',
          }}
        />
      </svg>

      <FontAwesomeIcon
        icon={icon}
        style={{
          color: active ? colors.text.primary : colors.text.muted,
          fontSize: '20px',
          transition: 'color 300ms ease',
          position: 'relative',
        }}
      />
    </button>
  )
}

// ── SideNav ──────────────────────────────────────────────────────────────

export default function SideNav() {
  const viewMode = useStore((state) => state.viewMode)
  const setViewMode = useStore((state) => state.setViewMode)

  return (
    <nav
      className="fixed flex flex-col items-center"
      style={{
        top: '50%',
        left: spacing.md,
        transform: 'translateY(-50%)',
        width: '56px',
        minWidth: '56px',
        zIndex: sizes.zIndex.fixed + 10,
        backgroundColor: colors.navbar.background,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${colors.navbar.border}`,
        borderRadius: sizes.borderRadius.lg,
        padding: '12px 0',
        justifyContent: 'space-between',
        height: 192,
      }}
    >
      <NavButton onClick={() => setViewMode('home')} icon={faHome} label="home" title="Home" active={viewMode === 'home'} />
      <NavButton onClick={() => setViewMode('2d')} icon={faMap} label="map" title="Map" active={viewMode === '2d'} />
      <NavButton onClick={() => setViewMode('3d')} icon={faEarth} label="3D view" title="3D View" active={viewMode === '3d'} />
    </nav>
  )
}

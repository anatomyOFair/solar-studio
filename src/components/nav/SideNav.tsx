import { colors, spacing, sizes } from '../../constants'
import ZoomButtons from './ZoomButtons'

export default function SideNav() {
  return (
    <nav
      className="fixed flex flex-col"
      style={{
        top: '50%',
        left: spacing.md,
        transform: 'translateY(-50%)',
        width: '48px',
        height: '60%',
        minWidth: '48px',
        zIndex: sizes.zIndex.fixed,
        backgroundColor: colors.navbar.background,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${colors.navbar.border}`,
        borderRadius: sizes.borderRadius.xl,
      }}
    >
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
          SideNav
        </div>
      </div>
      <div className="flex justify-center">
        <ZoomButtons />
      </div>
    </nav>
  )
}


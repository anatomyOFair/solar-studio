import { colors, spacing, sizes } from '../../constants'

export default function TopNav() {
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
      }}
    >
      <div className="h-full flex items-center justify-center text-gray-400">
        TopNav
      </div>
    </nav>
  )
}


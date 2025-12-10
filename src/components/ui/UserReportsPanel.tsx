import { useEffect, useMemo, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown, faChevronUp, faChevronRight, faChevronLeft } from '@fortawesome/free-solid-svg-icons'
import { useStore } from '../../store/store'
import { colors, spacing, sizes, shadows } from '../../constants'

type ReportUser = {
  name: string
  timeAgo: string
}

type CountryReport = {
  country: string
  count: number
  users: ReportUser[]
}

type ReportCategory = {
  label: string
  statusText: string
  entries: CountryReport[]
}

const PLACEHOLDER_REPORTS: Record<'visible' | 'notVisible', CountryReport[]> = {
  visible: [],
  notVisible: [],
}

export default function UserReportsPanel() {
  const selectedObject = useStore((state) => state.selectedObject)
  const [expandedCountries, setExpandedCountries] = useState<Record<string, boolean>>({})
  const [isCollapsed, setIsCollapsed] = useState(false)

  const categories: ReportCategory[] = useMemo(() => {
    const visibleCount = PLACEHOLDER_REPORTS.visible.reduce((sum, report) => sum + report.count, 0)
    const notVisibleCount = PLACEHOLDER_REPORTS.notVisible.reduce((sum, report) => sum + report.count, 0)

    return [
      {
        label: 'Marked Visible',
        statusText: `${visibleCount} users reporting visibility`,
        entries: PLACEHOLDER_REPORTS.visible,
      },
      {
        label: 'Marked Not Visible',
        statusText: `${notVisibleCount} users reporting no visibility`,
        entries: PLACEHOLDER_REPORTS.notVisible,
      },
    ]
  }, [])

  const toggleCountry = (country: string) => {
    setExpandedCountries((prev) => ({
      ...prev,
      [country]: !prev[country],
    }))
  }

  useEffect(() => {
    if (selectedObject) {
      setIsCollapsed(false)
    }
  }, [selectedObject?.id, selectedObject?.name, selectedObject])

  const user = useStore((state) => state.user)
  const openAuthModal = useStore((state) => state.openAuthModal)

  return (
    <>
      <div
        className="fixed flex flex-col"
        style={{
          bottom: spacing.md,
          right: spacing.md,
          zIndex: sizes.zIndex.fixed,
          width: sizes.panel.width,
          height: sizes.panel.height,
          maxWidth: sizes.panel.maxWidth,
          borderRadius: sizes.borderRadius.xl,
          border: `${sizes.panel.borderWidth} solid ${colors.navbar.border}`,
          backgroundColor: colors.navbar.background,
          backdropFilter: `blur(${sizes.blur.default})`,
          WebkitBackdropFilter: `blur(${sizes.blur.default})`,
          boxShadow: shadows.lg,
          padding: spacing.md,
          transform: isCollapsed ? `translateX(calc(100% + ${spacing.lg}))` : 'translateX(0)',
          transition: 'transform 250ms ease, opacity 200ms ease',
          opacity: selectedObject || !isCollapsed ? 1 : 0.8,
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3
              className="text-lg font-semibold tracking-wide uppercase"
              style={{ color: colors.text.primary, letterSpacing: '0.08em' }}
            >
              User Reports
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="transition-colors hover:text-white"
            style={{
              color: colors.text.muted,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: spacing.sm,
            }}
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        </div>

        {!selectedObject ? (
          <div
            className="flex-1 flex items-center justify-center text-center px-4"
            style={{ color: colors.text.muted, minHeight: 0 }}
          >
            Not tracking anything right now. Select an object to start receiving visibility updates.
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 flex-1 overflow-hidden" style={{ minHeight: 0 }}>
              {categories.map((category) => (
                <div key={category.label} className="flex flex-col flex-1 min-h-0">
                  <div className="flex items-center justify-between" style={{ marginBottom: spacing.md }}>
                    <div>
                      <p className="text-xxs font-semibold uppercase" style={{ color: colors.text.primary }}>
                        {category.label}
                      </p>
                      <p className="text-[11px]" style={{ color: colors.text.muted }}>
                        {category.statusText}
                      </p>
                    </div>
                  </div>
                  <div className="overflow-y-auto pr-1 flex-1" style={{ minHeight: 0 }}>
                    {category.entries.length === 0 ? (
                       <div className="text-center py-4 italic text-xs" style={{ color: colors.text.muted }}>
                         No reports yet
                       </div>
                    ) : (
                      category.entries.map((entry, index) => {
                        const isExpanded = expandedCountries[entry.country]
                        return (
                          <div
                            key={`${category.label}-${entry.country}`}
                            style={{ paddingBottom: index < category.entries.length - 1 ? spacing.sm : 0 }}
                          >
                            <button
                              type="button"
                              className="w-full flex items-center justify-between py-2 text-left"
                              onClick={() => toggleCountry(entry.country)}
                                style={{
                                color: colors.text.primary,
                                backgroundColor: colors.transparent,
                                border: 'none',
                                outline: 'none',
                                cursor: 'pointer',
                                fontSize: sizes.fonts.sm,
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: colors.status.info }}
                                />
                                <span>{entry.country}</span>
                                <span className="text-xs" style={{ color: colors.text.muted, marginLeft: spacing.sm }}>
                                  {entry.count} people
                                </span>
                              </div>
                              <FontAwesomeIcon
                                icon={isExpanded ? faChevronUp : faChevronDown}
                                style={{
                                  fontSize: sizes.fonts.xs,
                                  color: colors.text.muted,
                                  transition: 'transform 200ms ease',
                                }}
                              />
                            </button>
                            {isExpanded && (
                              <div
                                className="pt-2 space-y-2"
                                style={{ color: colors.text.muted, paddingLeft: sizes.panel.indent, fontSize: sizes.fonts.xs }}
                              >
                                {entry.users.map((user) => (
                                  <div
                                    key={user.name}
                                    className="flex items-center justify-between"
                                  >
                                    <span style={{ color: colors.text.primary }}>{user.name}</span>
                                    <span className="text-xs">{user.timeAgo}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={() => !user ? openAuthModal() : console.log('Report visibility clicked')}
                className=""
                style={{
                  backgroundColor: colors.navbar.background,
                  border: `${sizes.inputs.borderWidth} solid ${colors.navbar.background}`,
                  color: colors.white,
                  fontSize: sizes.fonts.sm,
                  backdropFilter: `blur(${sizes.blur.default})`,
                  WebkitBackdropFilter: `blur(${sizes.blur.default})`,
                  paddingTop: sizes.inputs.paddingVertical,
                  paddingBottom: sizes.inputs.paddingVertical,
                  marginTop: spacing.md,
                  marginBottom: 0,
                  marginLeft: 'auto',
                  marginRight: 'auto',
                  display: 'block',
                  width: sizes.panel.buttonWidth,
                  borderRadius: sizes.inputs.borderRadius,
                  cursor: 'pointer'
                }}
              >
                {!user ? 'Log in to Report Visibility' : 'Report Visibility'}
              </button>
            </div>
          </>
        )}
      </div>

      {isCollapsed && (
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="fixed flex items-center justify-center rounded-full transition-all duration-200 hover:brightness-125 hover:shadow-[0_0_12px_rgba(255,255,255,0.1)]"
          style={{
            top: '50%',
            right: spacing.md,
            transform: 'translateY(-50%)',
            zIndex: sizes.zIndex.fixed + 1,
            width: sizes.panel.toggleSize,
            height: sizes.panel.toggleSize,
            backgroundColor: colors.navbar.background,
            border: `${sizes.panel.borderWidth} solid ${colors.navbar.border}`,
            color: colors.text.primary,
            boxShadow: shadows.lg,
            backdropFilter: `blur(${sizes.blur.default})`,
            WebkitBackdropFilter: `blur(${sizes.blur.default})`,
          }}
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
      )}
    </>
  )
}


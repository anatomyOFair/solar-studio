import { useEffect, useMemo, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons'
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
  visible: [
    {
      country: 'United States',
      count: 5,
      users: [
        { name: 'LunaWatcher', timeAgo: '5m ago' },
        { name: 'OrbitOps', timeAgo: '12m ago' },
      ],
    },
    {
      country: 'Spain',
      count: 3,
      users: [
        { name: 'SolTrack', timeAgo: '8m ago' },
        { name: 'NightSky', timeAgo: '43m ago' },
      ],
    },
  ],
  notVisible: [
    {
      country: 'Japan',
      count: 4,
      users: [
        { name: 'SoraClub', timeAgo: '3m ago' },
        { name: 'SkyWave', timeAgo: '25m ago' },
      ],
    },
    {
      country: 'Brazil',
      count: 2,
      users: [
        { name: 'Asteria', timeAgo: '18m ago' },
        { name: 'Zenith', timeAgo: '1h ago' },
      ],
    },
  ],
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

  return (
    <>
      <div
        className="fixed flex flex-col"
        style={{
          bottom: spacing.md,
          right: spacing.md,
          zIndex: sizes.zIndex.fixed,
          width: 'clamp(260px, 28vw, 360px)',
          height: '70vh',
          maxWidth: 'calc(100vw - 40px)',
          borderRadius: sizes.borderRadius.xl,
          border: `1px solid ${colors.navbar.border}`,
          backgroundColor: colors.navbar.background,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: shadows.lg,
          padding: spacing.md,
          transform: isCollapsed ? 'translateX(calc(100% + 24px))' : 'translateX(0)',
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
            className="text-xs px-2 py-1 rounded-full transition-opacity"
            style={{
              backgroundColor: colors.navbar.base,
              border: `1px solid ${colors.navbar.border}`,
              color: colors.text.muted,
            }}
          >
            Hide
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
          <div className="flex flex-col gap-3 flex-1" style={{ minHeight: 0 }}>
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
                  {category.entries.map((entry, index) => {
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
                            backgroundColor: 'transparent',
                            border: 'none',
                            outline: 'none',
                            cursor: 'pointer',
                            fontSize: '14px',
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
                              fontSize: '12px',
                              color: colors.text.muted,
                              transition: 'transform 200ms ease',
                            }}
                          />
                        </button>
                        {isExpanded && (
                          <div
                            className="pt-2 space-y-2"
                            style={{ color: colors.text.muted, paddingLeft: '24px', fontSize: '12px' }}
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
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isCollapsed && (
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="fixed flex items-center gap-2 px-3 py-2 rounded-full text-sm"
          style={{
            bottom: spacing.md,
            right: spacing.md,
            zIndex: sizes.zIndex.fixed + 1,
            backgroundColor: colors.navbar.base,
            border: `1px solid ${colors.navbar.border}`,
            color: colors.text.primary,
            boxShadow: shadows.md,
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '9999px', backgroundColor: colors.status.info }} />
          Show User Reports
        </button>
      )}
    </>
  )
}


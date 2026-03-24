import { useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBookOpen, faPlus, faStar, faTrash } from '@fortawesome/free-solid-svg-icons'
import { useStore } from '../../store/store'
import { colors, spacing, sizes } from '../../constants'

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return null
  return (
    <span style={{ display: 'inline-flex', gap: '1px' }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <FontAwesomeIcon
          key={s}
          icon={faStar}
          style={{
            fontSize: '10px',
            color: s <= rating ? colors.status.warning : 'rgba(255,255,255,0.15)',
          }}
        />
      ))}
    </span>
  )
}

export default function ObservationLogCard({ hideHeader }: { hideHeader?: boolean } = {}) {
  const user = useStore((state) => state.user)
  const objects = useStore((state) => state.objects)
  const entries = useStore((state) => state.observationLogEntries)
  const fetchObservationLog = useStore((state) => state.fetchObservationLog)
  const deleteEntry = useStore((state) => state.deleteObservationLogEntry)
  const openObservationModal = useStore((state) => state.openObservationModal)
  const openAuthModal = useStore((state) => state.openAuthModal)

  useEffect(() => {
    if (user) fetchObservationLog()
  }, [user, fetchObservationLog])

  const getObjectName = (objectId: string) => {
    const obj = objects.find((o) => o.id === objectId)
    return obj?.name ?? objectId
  }

  // Not logged in
  if (!user) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          width: '100%',
          height: '100%',
        }}
      >
        <FontAwesomeIcon
          icon={faBookOpen}
          style={{ color: colors.text.muted, fontSize: '24px', opacity: 0.5 }}
        />
        <span style={{ color: colors.text.secondary, fontSize: '14px', fontWeight: 500 }}>
          Observation Log
        </span>
        <span style={{ color: colors.text.muted, fontSize: '12px' }}>
          Log in to start your stargazing journal
        </span>
        <button
          className="btn-press"
          onClick={openAuthModal}
          style={{
            marginTop: spacing.xs,
            padding: `6px 16px`,
            backgroundColor: 'rgba(255,255,255,0.08)',
            border: `1px solid ${colors.navbar.border}`,
            borderRadius: sizes.borderRadius.lg,
            color: colors.text.primary,
            fontSize: '12px',
            fontWeight: 500,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'
          }}
        >
          Log In
        </button>
      </div>
    )
  }

  // Logged in
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: spacing.sm, flexShrink: 0 }}
      >
        {!hideHeader && (
          <h3
            style={{
              color: colors.text.secondary,
              fontSize: '13px',
              fontWeight: 500,
              margin: 0,
            }}
          >
            Observation Log
          </h3>
        )}
        <button
          className="btn-press"
          onClick={openObservationModal}
          style={{
            padding: '4px 10px',
            backgroundColor: 'rgba(255,255,255,0.06)',
            border: `1px solid rgba(255,255,255,0.1)`,
            borderRadius: sizes.borderRadius.full,
            color: colors.text.secondary,
            fontSize: '11px',
            fontWeight: 500,
            fontFamily: 'inherit',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'
            e.currentTarget.style.color = colors.text.primary
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'
            e.currentTarget.style.color = colors.text.secondary
          }}
        >
          <FontAwesomeIcon icon={faPlus} style={{ fontSize: '9px' }} />
          <span>Add Entry</span>
        </button>
      </div>

      {/* Entries */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {entries.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.sm,
              height: '100%',
              color: colors.text.muted,
            }}
          >
            <FontAwesomeIcon
              icon={faBookOpen}
              style={{ fontSize: '20px', opacity: 0.4 }}
            />
            <span style={{ fontSize: '12px' }}>No observations yet</span>
            <span style={{ fontSize: '11px', opacity: 0.7 }}>
              Record your first stargazing session
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            {entries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  borderRadius: sizes.borderRadius.lg,
                  padding: spacing.sm,
                  transition: 'background-color 150ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'
                }}
              >
                {/* Row 1: Object name + Stars + Date */}
                <div
                  className="flex items-center justify-between"
                  style={{ marginBottom: '3px' }}
                >
                  <div className="flex items-center" style={{ gap: '8px' }}>
                    <span
                      style={{
                        color: colors.text.primary,
                        fontSize: sizes.fonts.sm,
                        fontWeight: 500,
                      }}
                    >
                      {getObjectName(entry.object_id)}
                    </span>
                    <StarRating rating={entry.rating} />
                  </div>
                  <div className="flex items-center" style={{ gap: '8px' }}>
                    <span
                      style={{
                        color: colors.text.muted,
                        fontSize: sizes.fonts.xs,
                      }}
                    >
                      {formatTimeAgo(entry.observed_at)}
                    </span>
                    <button
                      onClick={() => {
                        if (window.confirm('Delete this observation?')) {
                          deleteEntry(entry.id).catch((err: any) => console.error('Failed to delete:', err))
                        }
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: colors.text.muted,
                        cursor: 'pointer',
                        padding: '2px 4px',
                        fontSize: '10px',
                        opacity: 0.4,
                        transition: 'opacity 150ms ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '1'
                        e.currentTarget.style.color = colors.status.error
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '0.4'
                        e.currentTarget.style.color = colors.text.muted
                      }}
                      title="Delete entry"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                </div>

                {/* Row 2: Notes (truncated) */}
                {entry.notes && (
                  <div
                    style={{
                      color: colors.text.muted,
                      fontSize: sizes.fonts.xs,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginBottom: entry.equipment ? '3px' : 0,
                    }}
                  >
                    {entry.notes}
                  </div>
                )}

                {/* Row 3: Equipment tag */}
                {entry.equipment && (
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '1px 8px',
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      borderRadius: sizes.borderRadius.full,
                      color: colors.text.muted,
                      fontSize: '10px',
                    }}
                  >
                    {entry.equipment}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

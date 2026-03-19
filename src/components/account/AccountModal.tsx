import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faSignOutAlt, faTrash, faChevronDown, faChevronUp, faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons'
import { useStore } from '../../store/store'
import { colors, sizes, shadows, spacing } from '../../constants'

export default function AccountModal() {
  const isOpen = useStore((state) => state.isAccountModalOpen)
  const onClose = useStore((state) => state.closeAccountModal)
  const user = useStore((state) => state.user)
  const logout = useStore((state) => state.logout)
  const deleteAccount = useStore((state) => state.deleteAccount)
  const openPrivacyModal = useStore((state) => state.openPrivacyModal)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aboutOpen, setAboutOpen] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setConfirmDelete(false)
      setIsDeleting(false)
      setError(null)
      setAboutOpen(false)
    }
  }, [isOpen, user?.id])

  if (!isOpen || !user) return null

  const handleClose = () => {
    setConfirmDelete(false)
    setError(null)
    onClose()
  }

  const handleLogout = async () => {
    handleClose()
    await logout()
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    setError(null)
    try {
      await deleteAccount()
    } catch (err: any) {
      console.error('Account deletion failed:', err)
      setError('Failed to delete account. Please try again.')
      setIsDeleting(false)
    }
  }

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
  const initials = displayName
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  const joinedDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null

  const collapsibleHeaderStyle: React.CSSProperties = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 0',
    background: 'transparent',
    border: 'none',
    color: colors.text.secondary,
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
  }

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: sizes.zIndex.modalBackdrop,
          backgroundColor: colors.navbar.background,
          backdropFilter: `blur(${sizes.blur.default})`,
          WebkitBackdropFilter: `blur(${sizes.blur.default})`,
          animation: 'modalBackdropIn 200ms ease-out both',
        }}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className="fixed"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: sizes.modal.width,
          maxHeight: sizes.modal.maxHeight,
          zIndex: sizes.zIndex.modal,
          backgroundColor: colors.navbar.background,
          backdropFilter: `blur(${sizes.blur.default})`,
          WebkitBackdropFilter: `blur(${sizes.blur.default})`,
          border: `${sizes.modal.borderWidth} solid ${colors.navbar.border}`,
          borderRadius: sizes.borderRadius['2xl'],
          display: 'flex',
          flexDirection: 'column',
          boxShadow: shadows.lg,
          padding: 0,
          overflow: 'hidden',
          animation: 'modalContentIn 200ms ease-out both',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          className="btn-press"
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 1,
            background: 'transparent',
            border: 'none',
            color: colors.text.muted,
            cursor: 'pointer',
            padding: '4px',
            fontSize: '16px',
            lineHeight: 1,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = colors.white)}
          onMouseLeave={(e) => (e.currentTarget.style.color = colors.text.muted)}
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>

        {/* Content */}
        <div
          style={{
            padding: sizes.modal.paddingContent,
            flex: 1,
            overflowY: 'auto',
          }}
        >
          {/* User Info */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: spacing.xl }}>
            {/* Initials avatar */}
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: colors.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 600,
                color: colors.navbar.base,
                marginBottom: spacing.md,
              }}
            >
              {initials}
            </div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: colors.white }}>
              {displayName}
            </div>
            {user.email && (
              <div style={{ fontSize: '13px', color: colors.text.muted, marginTop: '4px' }}>
                {user.email}
              </div>
            )}
            {joinedDate && (
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
                Joined {joinedDate}
              </div>
            )}
          </div>

          {/* Privacy Policy link */}
          <button
            className="btn-press"
            onClick={openPrivacyModal}
            style={{
              ...collapsibleHeaderStyle,
              color: colors.accent,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            <span>Privacy Policy</span>
            <FontAwesomeIcon icon={faArrowUpRightFromSquare} style={{ fontSize: '10px' }} />
          </button>

          {/* About - collapsible */}
          <div>
            <button
              className="btn-press"
              onClick={() => setAboutOpen(!aboutOpen)}
              style={collapsibleHeaderStyle}
            >
              <span>About</span>
              <FontAwesomeIcon icon={aboutOpen ? faChevronUp : faChevronDown} style={{ fontSize: '11px' }} />
            </button>
            {aboutOpen && (
              <div style={{ fontSize: '12px', color: colors.text.muted, lineHeight: 1.6, paddingBottom: spacing.md }}>
                <p style={{ marginBottom: '8px' }}>
                  Solar Studio is a Final Year Project developed at the University of Birmingham. It provides
                  real-time celestial tracking, visibility forecasting, and an interactive 3D solar system
                  explorer.
                </p>
                <p>
                  Built with React, Three.js, Leaflet, and Supabase. Celestial data sourced from
                  NASA JPL Horizons. Weather data from Open-Meteo. Aurora forecasts from NOAA SWPC.
                </p>
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: `${spacing.lg} 0` }} />

          {error && (
            <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
              {error}
            </div>
          )}

          {/* Log Out */}
          <button
            className="btn-press"
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: sizes.inputs.paddingVertical,
              paddingLeft: sizes.inputs.paddingHorizontal,
              paddingRight: sizes.inputs.paddingHorizontal,
              backgroundColor: 'transparent',
              border: `1px solid ${colors.navbar.border}`,
              borderRadius: sizes.inputs.borderRadius,
              color: colors.text.secondary,
              fontSize: sizes.fonts.sm,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = colors.navbar.border)}
          >
            <FontAwesomeIcon icon={faSignOutAlt} style={{ fontSize: '13px' }} />
            Log Out
          </button>

          {/* Delete Account */}
          <div style={{ marginTop: spacing.md }}>
            {!confirmDelete ? (
              <button
                className="btn-press"
                onClick={() => setConfirmDelete(true)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: sizes.inputs.paddingVertical,
                  paddingLeft: sizes.inputs.paddingHorizontal,
                  paddingRight: sizes.inputs.paddingHorizontal,
                  backgroundColor: 'transparent',
                  border: `1px solid rgba(239, 68, 68, 0.25)`,
                  borderRadius: sizes.inputs.borderRadius,
                  color: colors.status.error,
                  fontSize: sizes.fonts.sm,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)')}
              >
                <FontAwesomeIcon icon={faTrash} style={{ fontSize: '13px' }} />
                Delete Account
              </button>
            ) : (
              <div
                style={{
                  padding: sizes.inputs.paddingHorizontal,
                  border: `1px solid rgba(239, 68, 68, 0.3)`,
                  borderRadius: sizes.inputs.borderRadius,
                  backgroundColor: 'rgba(239, 68, 68, 0.05)',
                }}
              >
                <p style={{ fontSize: '13px', color: colors.status.error, marginBottom: spacing.md }}>
                  This will permanently delete your account, reports, observations, and all associated data. This cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn-press"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    style={{
                      flex: 1,
                      padding: '10px',
                      backgroundColor: colors.status.error,
                      border: 'none',
                      borderRadius: sizes.inputs.borderRadius,
                      color: 'white',
                      fontSize: sizes.fonts.sm,
                      fontFamily: 'inherit',
                      fontWeight: 600,
                      cursor: isDeleting ? 'not-allowed' : 'pointer',
                      opacity: isDeleting ? 0.7 : 1,
                    }}
                  >
                    {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                  <button
                    className="btn-press"
                    onClick={() => setConfirmDelete(false)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      backgroundColor: 'transparent',
                      border: `1px solid ${colors.navbar.border}`,
                      borderRadius: sizes.inputs.borderRadius,
                      color: colors.text.muted,
                      fontSize: sizes.fonts.sm,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

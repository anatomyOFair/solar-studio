import { useState } from 'react'
import { useStore } from '../../store/store'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEnvelope, faLock, faUser, faXmark, faCheck } from '@fortawesome/free-solid-svg-icons'
import { colors, sizes, shadows, spacing } from '../../constants'

const inputStyle: React.CSSProperties = {
  width: '100%',
  paddingTop: sizes.inputs.paddingVertical,
  paddingBottom: sizes.inputs.paddingVertical,
  paddingLeft: sizes.inputs.paddingLeftWithIcon,
  paddingRight: sizes.inputs.paddingHorizontal,
  backgroundColor: 'rgba(0, 0, 0, 0.2)',
  border: `${sizes.inputs.borderWidth} solid ${colors.navbar.border}`,
  borderRadius: sizes.inputs.borderRadius,
  color: colors.white,
  fontSize: sizes.fonts.sm,
  boxSizing: 'border-box' as const,
  outline: 'none',
  transition: 'box-shadow 150ms ease, border-color 150ms ease',
}

const focusRing = `0 0 0 1px ${colors.accent}`

export default function AuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const setSession = useStore((state) => state.setSession)

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirm_password: '',
    username: '',
  })

  const resetForm = () => {
    setFormData({ email: '', password: '', confirm_password: '', username: '' })
    setError(null)
    setSignupSuccess(false)
    setFocusedField(null)
  }

  const handleTabChange = (tab: 'login' | 'signup') => {
    setActiveTab(tab)
    setError(null)
    setSignupSuccess(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const { supabase } = await import('../../lib/supabase')

      if (activeTab === 'signup') {
        if (formData.password !== formData.confirm_password) {
          throw new Error('Passwords do not match')
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.username,
            },
          },
        })

        if (signUpError) throw signUpError

        if (data.session) {
          setSession(data.session)
          handleClose()
        } else {
          setSignupSuccess(true)
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        })

        if (signInError) throw signInError

        if (data.session) {
          setSession(data.session)
          handleClose()
        }
      }
    } catch (err: any) {
      const msg = err.message || ''
      if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('credentials')) {
        setError('Email or password is incorrect')
      } else {
        setError(msg || 'Authentication failed')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = () => {
    setError('Password reset coming soon')
  }

  const getInputStyle = (field: string): React.CSSProperties => ({
    ...inputStyle,
    boxShadow: focusedField === field ? focusRing : 'none',
    borderColor: focusedField === field ? colors.accent : colors.navbar.border,
  })

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
          width: sizes.modal.widthNarrow,
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

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${colors.navbar.border}` }}>
          <button
            onClick={() => handleTabChange('login')}
            className="flex-1 text-sm font-medium transition-all"
            style={{
              padding: `${spacing.md} 0`,
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'login' ? `2px solid ${colors.accent}` : '2px solid transparent',
              color: activeTab === 'login' ? colors.white : colors.text.muted,
              cursor: 'pointer',
              marginBottom: '-1px',
            }}
          >
            Log In
          </button>
          <button
            onClick={() => handleTabChange('signup')}
            className="flex-1 text-sm font-medium transition-all"
            style={{
              padding: `${spacing.md} 0`,
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'signup' ? `2px solid ${colors.accent}` : '2px solid transparent',
              color: activeTab === 'signup' ? colors.white : colors.text.muted,
              cursor: 'pointer',
              marginBottom: '-1px',
            }}
          >
            Sign Up
          </button>
        </div>

        {/* Header */}
        <div
          style={{
            paddingTop: sizes.modal.headerPaddingTop,
            paddingBottom: sizes.modal.headerPaddingBottom,
            paddingLeft: sizes.modal.paddingContent,
            paddingRight: sizes.modal.paddingContent,
            textAlign: 'center',
          }}
        >
          <h2 className="text-2xl font-bold" style={{ color: colors.white, margin: 0 }}>
            {activeTab === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-sm" style={{ color: colors.text.muted, marginTop: '6px', marginBottom: 0 }}>
            {activeTab === 'login' ? 'Sign in to your observatory' : 'Join the observatory'}
          </p>
        </div>

        {/* Content */}
        <div
          style={{
            padding: `0 ${sizes.modal.paddingContent} ${sizes.modal.headerPaddingTop} ${sizes.modal.paddingContent}`,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Signup success state */}
          {signupSuccess ? (
            <div style={{ textAlign: 'center', padding: `${spacing.xl} 0` }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  border: `1px solid rgba(16, 185, 129, 0.3)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  color: colors.status.success,
                  fontSize: '22px',
                }}
              >
                <FontAwesomeIcon icon={faCheck} />
              </div>
              <h3 className="text-lg font-semibold" style={{ color: colors.white, margin: '0 0 8px' }}>
                Check your email
              </h3>
              <p className="text-sm" style={{ color: colors.text.muted, margin: 0, lineHeight: 1.5 }}>
                We sent a confirmation link to<br />
                <span style={{ color: colors.text.secondary }}>{formData.email}</span>
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div
                  className="rounded-lg flex items-center gap-3 text-sm"
                  style={{
                    marginBottom: spacing.md,
                    padding: spacing.md,
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: colors.status.error,
                  }}
                >
                  <div
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: colors.status.error,
                      flexShrink: 0,
                    }}
                  />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: sizes.inputs.gap, flex: 1 }}>
                {activeTab === 'signup' && (
                  <div className="relative">
                    <span
                      className="absolute top-1/2 -translate-y-1/2"
                      style={{ left: sizes.inputs.iconOffset, color: colors.text.muted, pointerEvents: 'none' }}
                    >
                      <FontAwesomeIcon icon={faUser} />
                    </span>
                    <input
                      type="text"
                      required
                      className="w-full"
                      style={getInputStyle('username')}
                      placeholder="Username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      onFocus={() => setFocusedField('username')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </div>
                )}

                <div className="relative">
                  <span
                    className="absolute top-1/2 -translate-y-1/2"
                    style={{ left: sizes.inputs.iconOffset, color: colors.text.muted, pointerEvents: 'none' }}
                  >
                    <FontAwesomeIcon icon={faEnvelope} />
                  </span>
                  <input
                    type="email"
                    required
                    className="w-full"
                    style={getInputStyle('email')}
                    placeholder="Email Address"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                  />
                </div>

                <div>
                  <div className="relative">
                    <span
                      className="absolute top-1/2 -translate-y-1/2"
                      style={{ left: sizes.inputs.iconOffset, color: colors.text.muted, pointerEvents: 'none' }}
                    >
                      <FontAwesomeIcon icon={faLock} />
                    </span>
                    <input
                      type="password"
                      required
                      className="w-full"
                      style={getInputStyle('password')}
                      placeholder="Password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </div>
                  {activeTab === 'login' && (
                    <button
                      className="btn-press"
                      type="button"
                      onClick={handleForgotPassword}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: colors.text.muted,
                        fontSize: sizes.fonts.xs,
                        cursor: 'pointer',
                        padding: '6px 0 0',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = colors.accent)}
                      onMouseLeave={(e) => (e.currentTarget.style.color = colors.text.muted)}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>

                {activeTab === 'signup' && (
                  <div className="relative">
                    <span
                      className="absolute top-1/2 -translate-y-1/2"
                      style={{ left: sizes.inputs.iconOffset, color: colors.text.muted, pointerEvents: 'none' }}
                    >
                      <FontAwesomeIcon icon={faLock} />
                    </span>
                    <input
                      type="password"
                      required
                      className="w-full"
                      style={getInputStyle('confirm_password')}
                      placeholder="Confirm Password"
                      value={formData.confirm_password}
                      onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                      onFocus={() => setFocusedField('confirm_password')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="font-medium transition-all active:scale-[0.98]"
                  style={{
                    width: '100%',
                    marginTop: spacing.md,
                    paddingTop: sizes.inputs.paddingVertical,
                    paddingBottom: sizes.inputs.paddingVertical,
                    backgroundColor: colors.accent,
                    border: 'none',
                    borderRadius: sizes.inputs.borderRadius,
                    color: colors.navbar.base,
                    fontSize: sizes.fonts.sm,
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? 0.7 : 1,
                    fontWeight: 600,
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoading) e.currentTarget.style.boxShadow = `0 0 20px rgba(201, 165, 92, 0.3)`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {isLoading ? 'Processing...' : activeTab === 'login' ? 'Log In' : 'Create Account'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  )
}

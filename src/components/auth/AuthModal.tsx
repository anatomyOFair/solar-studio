import { useState } from 'react'
import { useStore } from '../../store/store'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEnvelope, faLock, faUser } from '@fortawesome/free-solid-svg-icons'
import { colors, sizes, shadows, spacing } from '../../constants'

export default function AuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  
  const setSession = useStore((state) => state.setSession)

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirm_password: '', // Added for signup
    username: '', // Added for signup (maps to full_name)
  })

  // Sync tab with mode (optional, or just use one state)
  const handleTabChange = (tab: 'login' | 'signup') => {
    setActiveTab(tab)
    setError(null)
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
            throw new Error("Passwords do not match")
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
                data: {
                    full_name: formData.username
                }
            }
        })

        if (signUpError) throw signUpError

        // If auto-confirm is enabled, session might be established immediately.
        // Otherwise, user needs to check email.
        if (data.session) {
            setSession(data.session)
            // setUser(data.user) // handled by setSession side-effect in store logic if we wanted, but explicit set is fine too
            onClose()
        } else {
            // Email confirmation required case
             setError('Check your email for the confirmation link.')
             return // Don't close modal yet
        }

      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password
        })

        if (signInError) throw signInError

        if (data.session) {
            setSession(data.session)
            onClose()
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed')
    } finally {
      setIsLoading(false)
    }
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
            backgroundColor: colors.navbar.background, // Using standard background opacity
            backdropFilter: `blur(${sizes.blur.default})`,
            WebkitBackdropFilter: `blur(${sizes.blur.default})`,
        }}
        onClick={onClose}
      />

        {/* Modal Container */}
      <div
        className="fixed p-0"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: sizes.modal.width,
          maxWidth: sizes.modal.maxWidth,
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
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tabs */}
        <div className="flex">
            <button
                onClick={() => handleTabChange('login')}
                className="flex-1 text-sm font-medium transition-all relative"
                style={{ 
                    padding: `${spacing.md} 0`,
                    backgroundColor: activeTab === 'login' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                    color: activeTab === 'login' ? 'white' : '#9ca3af',
                }}
            >
                Log In
            </button>
            <button
                onClick={() => handleTabChange('signup')}
                className="flex-1 text-sm font-medium transition-all relative"
                style={{ 
                    padding: `${spacing.md} 0`,
                    backgroundColor: activeTab === 'signup' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                    color: activeTab === 'signup' ? 'white' : '#9ca3af'
                }}
            >
                Sign Up
            </button>
        </div>

        {/* Header Section */}
        <div style={{ 
            paddingTop: sizes.modal.headerPaddingTop, 
            paddingBottom: sizes.modal.headerPaddingBottom, 
            paddingLeft: sizes.modal.paddingContent, 
            paddingRight: sizes.modal.paddingContent, 
            textAlign: 'center' 
        }}>
            <h2 className="text-3xl font-bold mb-0" style={{ color: 'white' }}>
                {activeTab === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>
        </div>

        {/* Content Area */}
        <div style={{ 
            padding: `0 ${sizes.modal.paddingContent} ${sizes.inputs.iconOffset} ${sizes.modal.paddingContent}`, // re-using 24px as bottom padding
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column' 
        }}>
            {error && (
            <div 
                className="rounded-xl flex items-center gap-3 text-sm"
                style={{ 
                marginBottom: spacing.xl,
                padding: spacing.md,
                backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                border: `1px solid rgba(239, 68, 68, 0.2)`,
                color: colors.status.error
                }}
            >
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                <span>{error}</span>
            </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: sizes.inputs.gap, flex: 1 }}>
            {activeTab === 'signup' && (
                <div>
                <div className="relative">
                    <span className="absolute top-1/2 -translate-y-1/2" style={{ left: sizes.inputs.iconOffset, color: colors.text.muted }}>
                    <FontAwesomeIcon icon={faUser} />
                    </span>
                    <input
                    type="text"
                    required
                    className="w-full transition-all focus:outline-none focus:ring-0"
                    style={{
                        paddingTop: sizes.inputs.paddingVertical,
                        paddingBottom: sizes.inputs.paddingVertical,
                        paddingLeft: sizes.inputs.paddingLeftWithIcon,
                        paddingRight: sizes.inputs.paddingHorizontal,
                        backgroundColor: colors.transparent,
                        border: `${sizes.inputs.borderWidth} solid ${colors.navbar.background}`,
                        borderRadius: sizes.inputs.borderRadius,
                        color: colors.white,
                        fontSize: sizes.fonts.sm
                    }}
                    placeholder="Username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    />
                </div>
                </div>
            )}

            <div>
                <div className="relative">
                <span className="absolute top-1/2 -translate-y-1/2" style={{ left: '24px', color: colors.text.muted }}>
                    <FontAwesomeIcon icon={faEnvelope} />
                </span>
                <input
                    type="email"
                    required
                    className="w-full transition-all focus:outline-none focus:ring-0"
                    style={{
                    paddingTop: sizes.inputs.paddingVertical,
                    paddingBottom: sizes.inputs.paddingVertical,
                    paddingLeft: sizes.inputs.paddingLeftWithIcon,
                    paddingRight: sizes.inputs.paddingHorizontal,
                    backgroundColor: colors.transparent,
                    border: `${sizes.inputs.borderWidth} solid ${colors.navbar.background}`,
                    borderRadius: sizes.inputs.borderRadius,
                    color: colors.white,
                    fontSize: sizes.fonts.sm
                    }}
                    placeholder="Email Address"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                </div>
            </div>

            <div>
                <div className="relative">
                <span className="absolute top-1/2 -translate-y-1/2" style={{ left: '24px', color: colors.text.muted }}>
                    <FontAwesomeIcon icon={faLock} />
                </span>
                <input
                    type="password"
                    required
                    className="w-full transition-all focus:outline-none focus:ring-0"
                    style={{
                    paddingTop: sizes.inputs.paddingVertical,
                    paddingBottom: sizes.inputs.paddingVertical,
                    paddingLeft: sizes.inputs.paddingLeftWithIcon,
                    paddingRight: sizes.inputs.paddingHorizontal,
                    backgroundColor: colors.transparent,
                    border: `${sizes.inputs.borderWidth} solid ${colors.navbar.background}`,
                    borderRadius: sizes.inputs.borderRadius,
                    color: colors.white,
                    fontSize: sizes.fonts.sm
                    }}
                    placeholder="Password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                </div>
            </div>

            {activeTab === 'signup' && (
                <div>
                    <div className="relative">
                    <span className="absolute top-1/2 -translate-y-1/2" style={{ left: sizes.inputs.iconOffset, color: colors.text.muted }}>
                        <FontAwesomeIcon icon={faLock} />
                    </span>
                    <input
                        type="password"
                        required
                        className="w-full transition-all focus:outline-none focus:ring-0"
                        style={{
                        paddingTop: sizes.inputs.paddingVertical,
                        paddingBottom: sizes.inputs.paddingVertical,
                        paddingLeft: sizes.inputs.paddingLeftWithIcon,
                        paddingRight: sizes.inputs.paddingHorizontal,
                        backgroundColor: colors.transparent,
                        border: `${sizes.inputs.borderWidth} solid ${colors.navbar.background}`,
                        borderRadius: sizes.inputs.borderRadius, // Changed to lg
                        color: colors.white,
                        fontSize: sizes.fonts.sm
                        }}
                        placeholder="Confirm Password"
                        value={formData.confirm_password}
                        onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                    />
                    </div>
                </div>
            )}

            <button
                type="submit"
                disabled={isLoading}
                className="font-medium transition-all hover:brightness-110 active:scale-[0.98]"
                style={{
                    alignSelf: 'center', // Center the button since it's not full width
                    width: '50%',        // Reduced width
                    marginTop: spacing.xl,
                    paddingTop: sizes.inputs.paddingVertical,
                    paddingBottom: sizes.inputs.paddingVertical,
                    backgroundColor: colors.navbar.background,
                    border: `${sizes.inputs.borderWidth} solid ${colors.navbar.background}`,
                    borderRadius: sizes.inputs.borderRadius,
                    color: colors.white,
                    fontSize: sizes.fonts.sm,
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    opacity: isLoading ? 0.7 : 1,
                }}
            >
                {isLoading ? 'Processing...' : (activeTab === 'login' ? 'Log In' : 'Create Account')}
            </button>
            </form>
        </div>
      </div>
    </>
  )
}

import { useState } from 'react'
import { useStore } from '../../store/store'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLocationDot, faEye, faEyeSlash, faXmark } from '@fortawesome/free-solid-svg-icons'
import { colors, sizes, shadows, spacing } from '../../constants'

export default function ReportModal() {
  const isOpen = useStore((state) => state.isReportModalOpen)
  const onClose = useStore((state) => state.closeReportModal)
  const selectedObject = useStore((state) => state.selectedObject)
  const fetchReports = useStore((state) => state.fetchReports)
  const user = useStore((state) => state.user)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(true)
  const [location, setLocation] = useState<{ lat: number; lon: number; country?: string } | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)

  if (!isOpen) return null

  const resetForm = () => {
    setError(null)
    setIsVisible(true)
    setLocation(null)
    setLocationLoading(false)
  }

  const handleGetLocation = () => {
    setLocationLoading(true)
    setError(null)
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      setLocationLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        let country = 'Unknown Location'
        
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
            const data = await response.json()
            const sanitize = (s: string) => s.replace(/[<>"'`]/g, '').trim()
            if (data && data.address && data.address.country) {
                country = sanitize(data.address.country) || country
            } else if (data && data.display_name) {
                const parts = data.display_name.split(', ')
                country = sanitize(parts[parts.length - 1]) || country
            }
        } catch (e) {
            console.error("Reverse geocoding failed", e)
        }

        setLocation({ lat: latitude, lon: longitude, country }) 
        setLocationLoading(false)
      },
      (err) => {
        console.error(err)
        setError('Unable to retrieve your location')
        setLocationLoading(false)
      }
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedObject) {
        setError('No object selected')
        return
    }
    if (!user) {
        setError('You must be logged in')
        return
    }
    
    setIsLoading(true)
    setError(null)

    try {
      const { supabase } = await import('../../lib/supabase')

      const { error: insertError } = await supabase
        .from('user_reports')
        .insert({
          id: crypto.randomUUID(),
          user_id: user.id,
          object_id: selectedObject.id,
          country: location?.country || 'Unknown',
          is_visible: isVisible,
        })

      if (insertError) throw insertError

      if (selectedObject) fetchReports(selectedObject.id)
      onClose()
      resetForm()
    } catch (err: any) {
      console.error(err)
      setError('Failed to submit report. Please try again.')
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
                backgroundColor: colors.navbar.background,
                backdropFilter: `blur(${sizes.blur.default})`,
                WebkitBackdropFilter: `blur(${sizes.blur.default})`,
            }}
        onClick={() => { resetForm(); onClose() }}
      />

      {/* Modal Container */}
      <div
        className="fixed"
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
          padding: 0,
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={() => { resetForm(); onClose() }}
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
            transition: 'color 150ms ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = colors.white)}
          onMouseLeave={(e) => (e.currentTarget.style.color = colors.text.muted)}
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>

        {/* Header */}
        <div className="relative text-center" style={{
            paddingTop: sizes.modal.headerPaddingTop,
            paddingBottom: sizes.modal.headerPaddingBottom,
        }}>
            <h2 className="text-xl font-bold" style={{ color: colors.white }}>
                Report Visibility
            </h2>
            <p className="text-sm mt-1" style={{ color: colors.text.muted }}>
                for {selectedObject?.name || 'Unknown Object'}
            </p>
        </div>

        {/* Content */}
        <div style={{
            padding: sizes.modal.paddingContent,
            flex: 1,
            overflowY: 'auto'
        }}>
            {error && (
                <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: sizes.inputs.gap }}>
                
                {/* 1. Visibility Toggle */}
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        type="button"
                        onClick={() => setIsVisible(true)}
                        style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: `${spacing.md} 0`,
                            fontSize: sizes.fonts.sm,
                            fontWeight: 500,
                            borderRadius: sizes.inputs.borderRadius,
                            border: `1px solid ${isVisible ? colors.accent : colors.navbar.border}`,
                            backgroundColor: isVisible ? 'rgba(201, 165, 92, 0.1)' : 'transparent',
                            color: isVisible ? colors.accent : colors.text.muted,
                            cursor: 'pointer',
                            transition: 'all 150ms ease',
                        }}
                    >
                        <FontAwesomeIcon icon={faEye} />
                        Visible
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsVisible(false)}
                        style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: `${spacing.md} 0`,
                            fontSize: sizes.fonts.sm,
                            fontWeight: 500,
                            borderRadius: sizes.inputs.borderRadius,
                            border: `1px solid ${!isVisible ? colors.accent : colors.navbar.border}`,
                            backgroundColor: !isVisible ? 'rgba(201, 165, 92, 0.1)' : 'transparent',
                            color: !isVisible ? colors.accent : colors.text.muted,
                            cursor: 'pointer',
                            transition: 'all 150ms ease',
                        }}
                    >
                        <FontAwesomeIcon icon={faEyeSlash} />
                        Not Visible
                    </button>
                </div>

                {/* 2. Location */}
                <div>
                    <div className="relative">
                         <span className="absolute top-1/2 -translate-y-1/2" style={{ left: sizes.inputs.iconOffset, color: colors.text.muted }}>
                            <FontAwesomeIcon icon={faLocationDot} />
                        </span>
                        <button
                            type="button"
                            onClick={handleGetLocation}
                            disabled={locationLoading || !!location}
                            className="w-full text-left transition-all"
                            style={{
                                paddingTop: sizes.inputs.paddingVertical,
                                paddingBottom: sizes.inputs.paddingVertical,
                                paddingLeft: sizes.inputs.paddingLeftWithIcon,
                                paddingRight: sizes.inputs.paddingHorizontal,
                                backgroundColor: colors.transparent,
                                border: `${sizes.inputs.borderWidth} solid ${colors.navbar.border}`,
                                borderRadius: sizes.inputs.borderRadius,
                                color: location ? colors.white : colors.text.muted,
                                fontSize: sizes.fonts.sm,
                                opacity: locationLoading ? 0.7 : 1
                            }}
                        >
                            {locationLoading ? 'Getting location...' : (location?.country || 'Get Current Location')}
                        </button>
                    </div>
                    {!location && <p className="text-xs mt-2 text-center" style={{ color: colors.text.muted }}>Required to verify report authenticity</p>}
                </div>

                {/* Actions */}
                <div style={{ marginTop: spacing.xl }}>
                    <button
                        type="submit"
                        disabled={isLoading || !location}
                        className="font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                            width: '100%',
                            paddingTop: sizes.inputs.paddingVertical,
                            paddingBottom: sizes.inputs.paddingVertical,
                            backgroundColor: colors.accent,
                            border: 'none',
                            borderRadius: sizes.inputs.borderRadius,
                            color: colors.navbar.base,
                            fontSize: sizes.fonts.sm,
                            fontWeight: 600,
                            cursor: isLoading || !location ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {isLoading ? 'Submitting...' : 'Submit Report'}
                    </button>
                    
                    <button
                        type="button"
                        onClick={() => { resetForm(); onClose() }}
                        className="font-medium transition-all hover:brightness-110 active:scale-[0.98]"
                        style={{
                            width: '100%',
                            marginTop: spacing.md,
                            paddingTop: sizes.inputs.paddingVertical,
                            paddingBottom: sizes.inputs.paddingVertical,
                            backgroundColor: 'transparent', 
                            border: 'none',
                            color: colors.text.muted,
                            fontSize: sizes.fonts.sm,
                        }}
                    >
                        Cancel
                    </button>
                </div>

            </form>
        </div>

      </div>
    </>
  )
}

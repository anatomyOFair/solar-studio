import { useState, useRef } from 'react'
import { useStore } from '../../store/store'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLocationDot, faCamera, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'
import { colors, sizes, shadows, spacing } from '../../constants'

export default function ReportModal() {
  const isOpen = useStore((state) => state.isReportModalOpen)
  const onClose = useStore((state) => state.closeReportModal)
  const selectedObject = useStore((state) => state.selectedObject)
  const user = useStore((state) => state.user)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(true)
  const [location, setLocation] = useState<{ lat: number; lon: number; country?: string } | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

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
            if (data && data.address && data.address.country) {
                country = data.address.country
            } else if (data && data.display_name) {
                 // Fallback to last part of display name if country not explicit
                const parts = data.display_name.split(', ')
                country = parts[parts.length - 1]
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0])
    }
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
      let imageUrl = null

      // 1. Upload Image if exists
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('report_images')
          .upload(fileName, imageFile)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('report_images')
          .getPublicUrl(fileName)
        
        imageUrl = publicUrl
      }

      // 2. Insert Report
      const { error: insertError } = await supabase
        .from('user_reports')
        .insert({
          id: crypto.randomUUID(), // Explicitly generate ID to avoid not-null constraint violation
          user_id: user.id,
          object_id: selectedObject.id,
          country: location?.country || 'Unknown', 
          is_visible: isVisible,
        })

      if (insertError) throw insertError

      onClose()
      // Reset form
      setIsVisible(true)
      setLocation(null)
      setImageFile(null)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to submit report')
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
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
            }}
        onClick={onClose}
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
        {/* Header */}
        <div className="relative text-center" style={{ 
            paddingTop: sizes.modal.headerPaddingTop, 
            paddingBottom: sizes.modal.headerPaddingBottom,
            // Border removed as requested
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
                    {/* Sanitize error message for user */}
                    {error.includes('violates not-null constraint') ? 'System error: Unable to save report. Please contact support.' : error}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: sizes.inputs.gap }}>
                
                {/* 1. Visibility Toggle (Tab Style) */}
                {/* Removed internal divider color to match request */}
                <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: colors.navbar.border }}>
                    <button
                        type="button"
                        onClick={() => setIsVisible(true)}
                        className="flex-1 text-sm font-medium transition-all relative flex items-center justify-center gap-2"
                        style={{ 
                            padding: `${spacing.md} 0`,
                            backgroundColor: isVisible ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                            color: isVisible ? colors.white : colors.text.muted,
                        }}
                    >
                        <FontAwesomeIcon icon={faEye} />
                        Visible
                    </button>
                    {/* Divider removed */}
                    <button
                        type="button"
                        onClick={() => setIsVisible(false)}
                        className="flex-1 text-sm font-medium transition-all relative flex items-center justify-center gap-2"
                        style={{ 
                            padding: `${spacing.md} 0`,
                            backgroundColor: !isVisible ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                            color: !isVisible ? colors.white : colors.text.muted
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
                                border: `${sizes.inputs.borderWidth} solid ${colors.navbar.background}`,
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

                {/* 3. Image Upload */}
                <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.white }}>Photo (Optional)</label>
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-black/40 transition-colors text-left"
                        style={{
                            borderColor: 'rgba(255,255,255,0.2)',
                            backgroundColor: 'rgba(0,0,0,0.2)',
                            color: colors.text.muted,
                            fontSize: sizes.fonts.sm
                        }}
                    >
                        <div className="w-10 h-10 rounded bg-gray-800 flex items-center justify-center flex-shrink-0">
                            {imageFile ? (
                                <img 
                                    src={URL.createObjectURL(imageFile)} 
                                    alt="Preview" 
                                    className="w-full h-full object-cover rounded"
                                />
                            ) : (
                                <FontAwesomeIcon icon={faCamera} />
                            )}
                        </div>
                        <span className="text-sm truncate">
                            {imageFile ? imageFile.name : 'Tap to take a photo or upload'}
                        </span>
                    </button>
                </div>

                {/* Actions */}
                <div style={{ marginTop: spacing.xl }}>
                    <button
                        type="submit"
                        disabled={isLoading || !location}
                        className="font-medium transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                            width: '100%',
                            paddingTop: sizes.inputs.paddingVertical,
                            paddingBottom: sizes.inputs.paddingVertical,
                            backgroundColor: colors.navbar.background,
                            border: `${sizes.inputs.borderWidth} solid ${colors.navbar.border}`,
                            borderRadius: sizes.inputs.borderRadius,
                            color: colors.white,
                            fontSize: sizes.fonts.sm,
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                        }}
                    >
                        {isLoading ? 'Submitting...' : 'Submit Report'}
                    </button>
                    
                    <button
                        type="button"
                        onClick={onClose}
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

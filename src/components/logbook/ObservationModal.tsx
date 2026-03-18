import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faStar, faXmark } from '@fortawesome/free-solid-svg-icons'
import { useStore } from '../../store/store'
import { colors, sizes, shadows, spacing } from '../../constants'

export default function ObservationModal() {
  const isOpen = useStore((state) => state.isObservationModalOpen)
  const onClose = useStore((state) => state.closeObservationModal)
  const addEntry = useStore((state) => state.addObservationLogEntry)
  const objects = useStore((state) => state.objects)
  const userLocation = useStore((state) => state.userLocation)
  const user = useStore((state) => state.user)

  const [objectId, setObjectId] = useState('')
  const [objectName, setObjectName] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [rating, setRating] = useState(0)
  const [equipment, setEquipment] = useState('')
  const [notes, setNotes] = useState('')
  const [observedDate, setObservedDate] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  })
  const [observedTime, setObservedTime] = useState(() => {
    const now = new Date()
    const h = String(now.getHours()).padStart(2, '0')
    const m = String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, '0')
    return `${h}:${m}`
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const filteredSuggestions = objectName.trim().length > 0
    ? objects.filter((obj) => obj.name.toLowerCase().includes(objectName.toLowerCase())).slice(0, 8)
    : []

  const resetForm = () => {
    setObjectId('')
    setObjectName('')
    setShowSuggestions(false)
    setRating(0)
    setEquipment('')
    setNotes('')
    const now = new Date()
    setObservedDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`)
    const h2 = String(now.getHours()).padStart(2, '0')
    const m2 = String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, '0')
    setObservedTime(`${h2}:${m2}`)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const resolvedId = objectId || objectName.trim()
    if (!resolvedId) {
      setError('Please enter an object name')
      return
    }
    if (!user) {
      setError('You must be logged in')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await addEntry({
        object_id: resolvedId,
        notes: notes.trim() || null,
        equipment: equipment.trim() || null,
        rating: rating > 0 ? rating : null,
        observed_at: new Date(`${observedDate}T${observedTime}`).toISOString(),
        location_label: userLocation?.label ?? null,
        lat: userLocation?.lat ?? null,
        lon: userLocation?.lon ?? null,
      })
      resetForm()
      onClose()
    } catch (err: any) {
      console.error(err)
      setError('Failed to save entry. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    paddingTop: sizes.inputs.paddingVertical,
    paddingBottom: sizes.inputs.paddingVertical,
    paddingLeft: sizes.inputs.paddingHorizontal,
    paddingRight: sizes.inputs.paddingHorizontal,
    backgroundColor: colors.transparent,
    border: `${sizes.inputs.borderWidth} solid ${colors.navbar.border}`,
    borderRadius: sizes.inputs.borderRadius,
    color: colors.white,
    fontSize: sizes.fonts.sm,
    fontFamily: 'inherit',
    boxSizing: 'border-box',
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

      {/* Modal */}
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
          overflow: 'hidden',
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
        <div
          className="relative text-center"
          style={{
            paddingTop: sizes.modal.headerPaddingTop,
            paddingBottom: sizes.modal.headerPaddingBottom,
          }}
        >
          <h2
            className="text-xl font-bold"
            style={{ color: colors.white }}
          >
            New Observation
          </h2>
          <p className="text-sm mt-1" style={{ color: colors.text.muted }}>
            Record your stargazing session
          </p>
        </div>

        {/* Content */}
        <div
          style={{
            padding: sizes.modal.paddingContent,
            paddingTop: 0,
            flex: 1,
            overflowY: 'auto',
          }}
        >
          {error && (
            <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: sizes.inputs.gap }}
          >
            {/* Object Input */}
            <div style={{ position: 'relative' }}>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: colors.white }}
              >
                Object
              </label>
              <input
                type="text"
                value={objectName}
                onChange={(e) => {
                  const val = e.target.value
                  setObjectName(val)
                  setObjectId('')
                  setShowSuggestions(val.trim().length > 0)
                }}
                onFocus={() => {
                  if (objectName.trim().length > 0) setShowSuggestions(true)
                }}
                onBlur={() => {
                  // Delay to allow click on suggestion
                  setTimeout(() => setShowSuggestions(false), 150)
                }}
                placeholder="e.g., Mars, Sirius, M31, Orion Nebula..."
                style={inputStyle}
              />
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: colors.navbar.base,
                    border: `1px solid ${colors.navbar.border}`,
                    borderRadius: sizes.inputs.borderRadius,
                    overflow: 'hidden',
                    zIndex: 10,
                    maxHeight: '200px',
                    overflowY: 'auto',
                  }}
                >
                  {filteredSuggestions.map((obj) => (
                    <button
                      key={obj.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setObjectId(obj.id)
                        setObjectName(obj.name)
                        setShowSuggestions(false)
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 16px',
                        background: 'transparent',
                        border: 'none',
                        color: colors.white,
                        fontSize: sizes.fonts.sm,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        transition: 'background-color 100ms ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <span>{obj.name}</span>
                      <span style={{ marginLeft: '8px', color: colors.text.muted, fontSize: '12px' }}>
                        {obj.type}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date & Time */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: colors.white }}
              >
                Date & Time
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="date"
                  value={observedDate}
                  onChange={(e) => setObservedDate(e.target.value)}
                  style={{
                    ...inputStyle,
                    flex: 1,
                    colorScheme: 'dark',
                  }}
                />
                <select
                  value={observedTime.split(':')[0]}
                  onChange={(e) => setObservedTime(`${e.target.value}:${observedTime.split(':')[1]}`)}
                  style={{
                    ...inputStyle,
                    width: '70px',
                    flex: 'none',
                    colorScheme: 'dark',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2394a3b8'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 10px center',
                    paddingRight: '28px',
                  }}
                >
                  {Array.from({ length: 24 }, (_, i) => {
                    const val = String(i).padStart(2, '0')
                    return <option key={val} value={val}>{val}</option>
                  })}
                </select>
                <span style={{ color: colors.text.muted, alignSelf: 'center', fontSize: '16px', fontWeight: 600 }}>:</span>
                <select
                  value={observedTime.split(':')[1]}
                  onChange={(e) => setObservedTime(`${observedTime.split(':')[0]}:${e.target.value}`)}
                  style={{
                    ...inputStyle,
                    width: '70px',
                    flex: 'none',
                    colorScheme: 'dark',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2394a3b8'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 10px center',
                    paddingRight: '28px',
                  }}
                >
                  {Array.from({ length: 12 }, (_, i) => {
                    const val = String(i * 5).padStart(2, '0')
                    return <option key={val} value={val}>{val}</option>
                  })}
                </select>
              </div>
            </div>

            {/* Rating */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: colors.white }}
              >
                Rating
              </label>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star === rating ? 0 : star)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      fontSize: '20px',
                      color: star <= rating ? colors.status.warning : colors.text.muted,
                      transition: 'color 150ms ease',
                    }}
                  >
                    <FontAwesomeIcon icon={faStar} />
                  </button>
                ))}
              </div>
            </div>

            {/* Equipment */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: colors.white }}
              >
                Equipment (optional)
              </label>
              <input
                type="text"
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                placeholder="e.g., 8-inch Dobsonian, 10x50 binoculars"
                style={inputStyle}
              />
            </div>

            {/* Notes */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: colors.white }}
              >
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What did you observe? Seeing conditions, details..."
                rows={3}
                style={{
                  ...inputStyle,
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Location */}
            {userLocation && (
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: colors.white }}
                >
                  Location
                </label>
                <div
                  style={{
                    ...inputStyle,
                    color: colors.text.muted,
                    opacity: 0.8,
                  }}
                >
                  {userLocation.label}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ marginTop: spacing.xl }}>
              <button
                type="submit"
                disabled={isLoading || !(objectId || objectName.trim())}
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
                  fontFamily: 'inherit',
                  fontWeight: 600,
                  cursor: isLoading || !(objectId || objectName.trim()) ? 'not-allowed' : 'pointer',
                }}
              >
                {isLoading ? 'Saving...' : 'Save Entry'}
              </button>

              <button
                type="button"
                onClick={() => {
                  resetForm()
                  onClose()
                }}
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
                  fontFamily: 'inherit',
                  cursor: 'pointer',
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

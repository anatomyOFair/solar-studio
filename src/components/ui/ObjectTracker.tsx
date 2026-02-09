import { useState, useEffect } from 'react'
import { useStore, MOCK_MOON } from '../../store/store'
import type { CelestialObject } from '../../types'
import { colors, spacing, sizes, shadows } from '../../constants'
import MoonPhaseIcon from './MoonPhaseIcon'

// Available objects (starting with just Moon for testing)
const AVAILABLE_OBJECTS: CelestialObject[] = [
  MOCK_MOON,
]

export default function ObjectTracker() {
  const [isSelectorOpen, setIsSelectorOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const selectedObject = useStore((state) => state.selectedObject)
  const setSelectedObject = useStore((state) => state.setSelectedObject)
  const objects = useStore((state) => state.objects)
  const fetchObjects = useStore((state) => state.fetchObjects)

  useEffect(() => {
    fetchObjects()
  }, [fetchObjects])

  const filteredObjects = objects.length > 0 
    ? objects.filter((obj) => obj.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : AVAILABLE_OBJECTS.filter((obj) => obj.name.toLowerCase().includes(searchQuery.toLowerCase())) // Fallback to mocks if DB empty for testing

  const handleSelectObject = (object: CelestialObject) => {
    setSelectedObject(object)
    setIsSelectorOpen(false)
  }

  return (
    <>
      <div
        className="fixed cursor-pointer"
        style={{
          bottom: spacing.md,
          left: spacing.md,
          minWidth: sizes.widget.minWidth,
          zIndex: sizes.zIndex.fixed,
          backgroundColor: colors.navbar.background,
          backdropFilter: `blur(${sizes.blur.default})`,
          WebkitBackdropFilter: `blur(${sizes.blur.default})`,
          border: `1px solid ${colors.navbar.border}`,
          borderRadius: sizes.borderRadius.xl,
          padding: `${spacing.sm} ${spacing.md}`,
          transition: 'all 0.2s ease',
        }}
        onClick={() => setIsSelectorOpen(true)}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '0.9'
          e.currentTarget.style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '1'
          e.currentTarget.style.transform = 'translateY(0)'
        }}
      >
        <div className="flex items-center" style={{ color: colors.text.primary, gap: spacing.sm }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: selectedObject ? colors.status.success : colors.text.muted,
              transition: 'all 0.2s ease',
            }}
          />
          <span style={{ fontSize: '14px', fontWeight: 500 }}>
            {selectedObject ? `Tracking: ${selectedObject.name}` : 'Not tracking anything'}
          </span>
        </div>
        <div style={{ fontSize: '12px', color: colors.text.muted, marginTop: '2px' }}>
          Click to select object
        </div>
        {selectedObject?.type === 'moon' && <MoonPhaseIcon />}
      </div>

      {/* Modal Overlay */}
      {isSelectorOpen && (
        <>
          <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: sizes.zIndex.modalBackdrop,
                backgroundColor: 'rgba(0, 0, 0, 0.5)', // Simple dark overlay
            }}
            onClick={() => setIsSelectorOpen(false)}
          />

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
              boxShadow: shadows.lg, // Assuming shadows is imported
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ 
                paddingTop: sizes.modal.headerPaddingTop, 
                paddingBottom: sizes.modal.headerPaddingBottom, 
                paddingLeft: sizes.modal.paddingContent, 
                paddingRight: sizes.modal.paddingContent, 
                textAlign: 'center',
                borderBottom: `1px solid ${colors.navbar.border}`
            }}>
               <h2 className="text-xl font-bold mb-1" style={{ color: colors.white }}>
                  Select Object
               </h2>
               <p className="text-sm" style={{ color: colors.text.muted }}>
                  to track visibility
               </p>
            </div>

            {/* Content */}
            <div style={{ 
                padding: sizes.modal.paddingContent, 
                display: 'flex', 
                flexDirection: 'column', 
                flex: 1, 
                overflow: 'hidden',
                gap: spacing.lg
            }}>
                {/* Search */}
                <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full transition-all focus:outline-none focus:ring-0"
                style={{
                    paddingTop: sizes.inputs.paddingVertical,
                    paddingBottom: sizes.inputs.paddingVertical,
                    paddingLeft: sizes.inputs.paddingHorizontal,
                    paddingRight: sizes.inputs.paddingHorizontal,
                    backgroundColor: colors.transparent,
                    border: `${sizes.inputs.borderWidth} solid ${colors.navbar.background}`,
                    borderRadius: sizes.inputs.borderRadius,
                    color: colors.white,
                    fontSize: sizes.fonts.sm
                }}
                />

                {/* Object List */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {filteredObjects.length === 0 ? (
                    <div className="text-center py-8 text-sm" style={{ color: colors.text.muted }}>
                    No objects found
                    </div>
                ) : (
                    filteredObjects.map((object) => (
                    <button
                        key={object.id}
                        onClick={() => handleSelectObject(object)}
                        className="w-full text-left rounded-lg px-4 py-3 transition-all flex items-center justify-between group"
                        style={{
                        backgroundColor:
                            selectedObject?.id === object.id ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${
                            selectedObject?.id === object.id
                            ? 'rgba(255, 255, 255, 0.2)'
                            : 'transparent'
                        }`,
                        color: colors.white,
                        }}
                    >
                        <span className="font-medium">{object.name}</span>
                        {selectedObject?.id === object.id && (
                             <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(74,222,128,0.5)]" style={{ backgroundColor: colors.status.success }} />
                        )}
                    </button>
                    ))
                )}
                </div>

                {/* Footer / Cancel */}
                <button
                    onClick={() => setIsSelectorOpen(false)}
                    className="font-medium transition-all hover:brightness-110 active:scale-[0.98]"
                    style={{
                        width: '100%',
                        marginTop: spacing.lg,
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
                    Cancel
                </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

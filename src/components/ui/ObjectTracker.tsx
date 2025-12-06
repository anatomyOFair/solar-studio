import { useState } from 'react'
import { useStore, MOCK_MOON } from '../../store/store'
import type { CelestialObject } from '../../types'
import { colors, spacing, sizes } from '../../constants'

// Available objects (starting with just Moon for testing)
const AVAILABLE_OBJECTS: CelestialObject[] = [
  MOCK_MOON,
]

export default function ObjectTracker() {
  const [isSelectorOpen, setIsSelectorOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const selectedObject = useStore((state) => state.selectedObject)
  const setSelectedObject = useStore((state) => state.setSelectedObject)

  const filteredObjects = AVAILABLE_OBJECTS.filter((obj) =>
    obj.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
      </div>

      {/* Modal Overlay */}
      {isSelectorOpen && (
        <>
          <div
            className="fixed inset-0"
            style={{
              zIndex: sizes.zIndex.modal,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: `blur(${sizes.blur.modal})`,
            }}
            onClick={() => setIsSelectorOpen(false)}
          />

          <div
            className="fixed"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: sizes.widget.maxWidth,
              maxWidth: '90vw',
              maxHeight: '80vh',
              zIndex: sizes.zIndex.modal + 1,
              backgroundColor: colors.background.dark,
              border: `1px solid ${colors.navbar.border}`,
              borderRadius: sizes.borderRadius.xl,
              padding: spacing.lg,
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="mb-4">
              <h2
                className="text-lg font-semibold"
                style={{ color: colors.text.primary, marginBottom: spacing.sm }}
              >
                Select Object to Track
              </h2>
              <p className="text-sm" style={{ color: colors.text.muted }}>
                Choose an object to check visibility
              </p>
            </div>

            {/* Search */}
            <input
              type="text"
              placeholder="Search objects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg px-3 py-2 mb-4"
              style={{
                backgroundColor: colors.navbar.base,
                border: `1px solid ${colors.navbar.border}`,
                color: colors.text.primary,
                outline: 'none',
              }}
            />

            {/* Object List */}
            <div className="flex-1 overflow-y-auto">
              {filteredObjects.length === 0 ? (
                <div className="text-center py-8" style={{ color: colors.text.muted }}>
                  No objects found
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredObjects.map((object) => (
                    <button
                      key={object.id}
                      onClick={() => handleSelectObject(object)}
                      className="w-full text-left rounded-lg px-4 py-3 transition-all"
                      style={{
                        backgroundColor:
                          selectedObject?.id === object.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                        border: `1px solid ${
                          selectedObject?.id === object.id
                            ? colors.status.info
                            : colors.navbar.border
                        }`,
                      }}
                      onMouseEnter={(e) => {
                        if (selectedObject?.id !== object.id) {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedObject?.id !== object.id) {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs uppercase mt-1" style={{ color: colors.text.muted }}>
                            {object.name}
                          </div>
                        </div>
                        {selectedObject?.id === object.id && (
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.status.success }} />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setIsSelectorOpen(false)}
                className="flex-1 rounded-lg px-4 py-2 transition-opacity"
                style={{
                  backgroundColor: colors.navbar.base,
                  border: `1px solid ${colors.navbar.border}`,
                  color: colors.text.primary,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.8'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1'
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

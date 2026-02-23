import { useState, useEffect, useMemo } from 'react'
import { useStore } from '../../store/store'
import type { CelestialObject, CelestialObjectType } from '../../types'
import { colors, spacing, sizes, shadows } from '../../constants'
import MoonPhaseIcon from './MoonPhaseIcon'
import RiseSetTimes from './RiseSetTimes'
import { isNearNewMoon, type YallopZone } from '../../utils/yallopCriteria'
import { getVisibilityColor } from '../../utils/visibilityCalculator'

const CRESCENT_ZONES: YallopZone[] = ['A', 'B', 'C', 'D', 'E', 'F']
const ZONE_COLORS: Record<YallopZone, string> = {
  A: '#22c55e', B: '#86efac', C: '#facc15',
  D: '#f97316', E: '#ef4444', F: '#6b7280',
}
const ZONE_DESCS: Record<YallopZone, string> = {
  A: 'Easily visible', B: 'Perfect conditions', C: 'May need binoculars',
  D: 'Needs optical aid', E: 'Not visible with telescope', F: 'Not visible',
}

const TYPE_ORDER: CelestialObjectType[] = ['moon', 'planet', 'star', 'dwarf_planet', 'asteroid', 'comet']
const TYPE_LABELS: Record<string, string> = {
  moon: 'Moons',
  planet: 'Planets',
  star: 'Stars',
  dwarf_planet: 'Dwarf Planets',
  asteroid: 'Asteroids',
  comet: 'Comets',
}

export default function ObjectTracker() {
  const [isSelectorOpen, setIsSelectorOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const selectedObject = useStore((state) => state.selectedObject)
  const setSelectedObject = useStore((state) => state.setSelectedObject)
  const objects = useStore((state) => state.objects)
  const fetchObjects = useStore((state) => state.fetchObjects)
  const visualizationMode = useStore((state) => state.visualizationMode)
  const showCrescentZones = useStore((state) => state.showCrescentZones)
  const setShowCrescentZones = useStore((state) => state.setShowCrescentZones)
  const simulatedTime = useStore((state) => state.simulatedTime)

  const showCrescentToggle = selectedObject?.id === 'moon' && isNearNewMoon(simulatedTime ?? new Date())

  // Auto-disable crescent zones when Moon is deselected or not near new moon
  useEffect(() => {
    if (!showCrescentToggle && showCrescentZones) {
      setShowCrescentZones(false)
    }
  }, [showCrescentToggle, showCrescentZones, setShowCrescentZones])

  useEffect(() => {
    fetchObjects()
  }, [fetchObjects])

  const filteredObjects = objects
    .filter((obj) => obj.id !== 'earth') // Can't track Earth from Earth
    .filter((obj) => obj.name.toLowerCase().includes(searchQuery.toLowerCase()))

  // Group by type for display
  const groupedObjects = useMemo(() => {
    const groups: { type: CelestialObjectType; label: string; objects: CelestialObject[] }[] = []
    for (const type of TYPE_ORDER) {
      const objs = filteredObjects.filter((o) => o.type === type)
      if (objs.length > 0) {
        groups.push({ type, label: TYPE_LABELS[type] ?? type, objects: objs })
      }
    }
    return groups
  }, [filteredObjects])

  const handleSelectObject = (object: CelestialObject) => {
    setSelectedObject(object)
    setIsSelectorOpen(false)
  }

  return (
    <>
      {/* Crescent Visibility Zones toggle — only when Moon selected + near new moon */}
      {showCrescentToggle && (
        <div
          className="fixed"
          style={{
            bottom: `calc(${spacing.md} + 110px)`,
            left: spacing.md,
            zIndex: sizes.zIndex.fixed,
            backgroundColor: colors.navbar.background,
            backdropFilter: `blur(${sizes.blur.default})`,
            WebkitBackdropFilter: `blur(${sizes.blur.default})`,
            border: `1px solid ${colors.navbar.border}`,
            borderRadius: sizes.borderRadius.xl,
            padding: `${spacing.xs} ${spacing.sm}`,
          }}
        >
          <button
            onClick={() => setShowCrescentZones(!showCrescentZones)}
            className="flex items-center transition-all"
            style={{
              gap: spacing.sm,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: colors.text.primary,
              fontSize: '12px',
              fontWeight: 500,
              padding: `4px 6px`,
              borderRadius: '6px',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: showCrescentZones ? '#22c55e' : colors.text.muted,
                transition: 'all 0.2s ease',
              }}
            />
            Crescent Visibility Zones
          </button>
        </div>
      )}

      <div
        className="fixed cursor-pointer"
        style={{
          bottom: spacing.md,
          left: spacing.md,
          width: sizes.widget.minWidth,
          height: '120px',
          zIndex: sizes.zIndex.fixed,
          backgroundColor: colors.navbar.background,
          backdropFilter: `blur(${sizes.blur.default})`,
          WebkitBackdropFilter: `blur(${sizes.blur.default})`,
          border: `1px solid ${colors.navbar.border}`,
          borderRadius: sizes.borderRadius.xl,
          padding: `0 ${spacing.md}`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
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
        {selectedObject?.id === 'moon' && <MoonPhaseIcon />}
        <RiseSetTimes />
      </div>

      {/* Legend — beside the object tracker */}
      {(showCrescentZones || visualizationMode === 'hex') && (
        <div
          className="fixed"
          style={{
            bottom: spacing.md,
            left: `calc(${spacing.md} + ${sizes.widget.minWidth} + ${spacing.sm})`,
            zIndex: sizes.zIndex.fixed,
            backgroundColor: colors.navbar.background,
            backdropFilter: `blur(${sizes.blur.default})`,
            WebkitBackdropFilter: `blur(${sizes.blur.default})`,
            border: `1px solid ${colors.navbar.border}`,
            borderRadius: sizes.borderRadius.xl,
            padding: `${spacing.sm} ${spacing.md}`,
          }}
        >
          {showCrescentZones ? (
            <>
              <div style={{ fontSize: '11px', fontWeight: 600, color: colors.text.primary, marginBottom: '6px' }}>
                Crescent Visibility (Yallop)
              </div>
              {CRESCENT_ZONES.map((zone) => (
                <div key={zone} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                  <div
                    style={{
                      width: 16,
                      height: 12,
                      borderRadius: 2,
                      backgroundColor: ZONE_COLORS[zone],
                      opacity: zone === 'F' ? 0.5 : 0.85,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 8,
                      fontWeight: 700,
                      color: zone === 'C' || zone === 'D' ? '#000' : '#fff',
                    }}
                  >
                    {zone}
                  </div>
                  <span style={{ fontSize: '10px', color: colors.text.muted }}>{ZONE_DESCS[zone]}</span>
                </div>
              ))}
            </>
          ) : (
            <>
              <div style={{ fontSize: '11px', fontWeight: 600, color: colors.text.primary, marginBottom: '6px' }}>
                Visibility
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <div
                  style={{
                    width: 100,
                    height: 10,
                    borderRadius: 3,
                    background: `linear-gradient(to right, ${getVisibilityColor(0)}, ${getVisibilityColor(0.25)}, ${getVisibilityColor(0.5)}, ${getVisibilityColor(0.75)}, ${getVisibilityColor(1)})`,
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: 100 }}>
                <span style={{ fontSize: '9px', color: colors.text.muted }}>Poor</span>
                <span style={{ fontSize: '9px', color: colors.text.muted }}>Excellent</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <div
                  style={{
                    width: 16,
                    height: 10,
                    borderRadius: 2,
                    backgroundColor: '#6B7280',
                    opacity: 0.5,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: '9px', color: colors.text.muted }}>No weather data</span>
              </div>
            </>
          )}
        </div>
      )}

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
                <div className="flex-1 overflow-y-auto pr-2">
                {groupedObjects.length === 0 ? (
                    <div className="text-center py-8 text-sm" style={{ color: colors.text.muted }}>
                    No objects found
                    </div>
                ) : (
                    groupedObjects.map((group) => (
                    <div key={group.type} style={{ marginBottom: spacing.md }}>
                        <div
                          className="text-xs font-semibold uppercase"
                          style={{ color: colors.text.muted, marginBottom: spacing.sm, letterSpacing: '0.06em' }}
                        >
                          {group.label}
                        </div>
                        <div className="space-y-1">
                        {group.objects.map((object) => (
                          <button
                              key={object.id}
                              onClick={() => handleSelectObject(object)}
                              className="w-full text-left rounded-lg px-4 py-2.5 transition-all flex items-center justify-between group"
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
                              <span className="font-medium text-sm">{object.name}</span>
                              {selectedObject?.id === object.id && (
                                   <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(74,222,128,0.5)]" style={{ backgroundColor: colors.status.success }} />
                              )}
                          </button>
                        ))}
                        </div>
                    </div>
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

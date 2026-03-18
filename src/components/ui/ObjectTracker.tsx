import { useState, useEffect, useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'
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
  const setVisualizationMode = useStore((state) => state.setVisualizationMode)
  const showCrescentZones = useStore((state) => state.showCrescentZones)
  const setShowCrescentZones = useStore((state) => state.setShowCrescentZones)
  const showConstellationLines = useStore((state) => state.showConstellationLines)
  const setShowConstellationLines = useStore((state) => state.setShowConstellationLines)
  const simulatedTime = useStore((state) => state.simulatedTime)

  const showCrescentToggle = selectedObject?.id === 'moon' && isNearNewMoon(simulatedTime ?? new Date())

  // Auto-enable visibility overlay when an object is selected, disable when deselected
  useEffect(() => {
    setVisualizationMode(selectedObject ? 'hex' : 'none')
  }, [selectedObject, setVisualizationMode])

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
      {/* Constellation Lines toggle — always visible */}
      <div
        className="fixed"
        style={{
          bottom: `calc(${spacing.md} + 130px${showCrescentToggle ? ' + 40px' : ''})`,
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
          onClick={() => setShowConstellationLines(!showConstellationLines)}
          className="flex items-center transition-all"
          style={{
            gap: spacing.sm,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: colors.text.primary,
            fontSize: '12px',
            fontWeight: 500,
            padding: '4px 6px',
            borderRadius: '6px',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: showConstellationLines ? colors.accent : colors.text.muted,
              transition: 'all 0.2s ease',
            }}
          />
          Constellations
        </button>
      </div>

      {/* Crescent Visibility Zones toggle — only when Moon selected + near new moon */}
      {showCrescentToggle && (
        <div
          className="fixed"
          style={{
            bottom: `calc(${spacing.md} + 130px)`,
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
        data-hint="object-tracker"
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
      {(showCrescentZones || !!selectedObject) && (
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
                backgroundColor: colors.navbar.background,
                backdropFilter: `blur(${sizes.blur.default})`,
                WebkitBackdropFilter: `blur(${sizes.blur.default})`,
            }}
            onClick={() => setIsSelectorOpen(false)}
          />

          <div
            className="fixed"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '420px',
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
              overflow: 'hidden',
              padding: 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setIsSelectorOpen(false)}
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
            <div style={{
              paddingTop: sizes.modal.headerPaddingTop,
              paddingBottom: sizes.modal.headerPaddingBottom,
              paddingLeft: '24px',
              paddingRight: '24px',
              textAlign: 'center',
              borderBottom: `1px solid ${colors.navbar.border}`,
            }}>
              <h2 className="text-xl font-bold" style={{ color: colors.white }}>
                Select Object
              </h2>
              <p className="text-sm mt-1" style={{ color: colors.text.muted }}>
                to track visibility
              </p>
            </div>

            {/* Content */}
            <div style={{
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              overflow: 'hidden',
              gap: '16px',
            }}>
              {/* Search */}
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full transition-all focus:outline-none focus:ring-0"
                style={{
                  paddingTop: '10px',
                  paddingBottom: '10px',
                  paddingLeft: sizes.inputs.paddingHorizontal,
                  paddingRight: sizes.inputs.paddingHorizontal,
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  border: `1px solid ${colors.navbar.border}`,
                  borderRadius: sizes.inputs.borderRadius,
                  color: colors.white,
                  fontSize: sizes.fonts.sm,
                }}
                onFocus={(e) => (e.currentTarget.style.boxShadow = `0 0 0 1px ${colors.accent}`)}
                onBlur={(e) => (e.currentTarget.style.boxShadow = 'none')}
              />

              {/* Object List */}
              <div className="flex-1 overflow-y-auto" style={{ marginRight: '-8px', paddingRight: '8px' }}>
                {groupedObjects.length === 0 ? (
                  <div className="text-center py-8 text-sm" style={{ color: colors.text.muted }}>
                    No objects found
                  </div>
                ) : (
                  groupedObjects.map((group) => (
                    <div key={group.type} style={{ marginBottom: '16px' }}>
                      <div
                        className="text-xs font-semibold uppercase"
                        style={{
                          color: colors.text.muted,
                          marginBottom: '6px',
                          letterSpacing: '0.06em',
                          paddingLeft: '10px',
                          borderLeft: `2px solid ${colors.accent}`,
                        }}
                      >
                        {group.label}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {group.objects.map((object) => {
                          const isSelected = selectedObject?.id === object.id
                          return (
                            <button
                              key={object.id}
                              onClick={() => handleSelectObject(object)}
                              className="w-full text-left transition-all flex items-center justify-between"
                              style={{
                                padding: '8px 12px',
                                borderRadius: '6px',
                                backgroundColor: isSelected ? 'rgba(201, 165, 92, 0.1)' : 'transparent',
                                border: `1px solid ${isSelected ? colors.accent : 'transparent'}`,
                                color: isSelected ? colors.accent : colors.white,
                                cursor: 'pointer',
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'
                              }}
                            >
                              <span className="font-medium text-sm">{object.name}</span>
                              {isSelected && (
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{
                                    backgroundColor: colors.accent,
                                    boxShadow: '0 0 8px rgba(201, 165, 92, 0.5)',
                                  }}
                                />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Cancel */}
              <button
                onClick={() => setIsSelectorOpen(false)}
                className="transition-all active:scale-[0.98]"
                style={{
                  width: '100%',
                  paddingTop: sizes.inputs.paddingVertical,
                  paddingBottom: sizes.inputs.paddingVertical,
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: colors.text.muted,
                  fontSize: sizes.fonts.sm,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
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

import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useHints, type HintDef } from '../../hooks/useHints'
import { colors, spacing, sizes, shadows } from '../../constants'

const ARROW_SIZE = 6
const GAP = 10
const SPOTLIGHT_PAD = 8

function getPosition(
  target: DOMRect,
  tip: DOMRect,
  position: HintDef['position'],
): { top: number; left: number } {
  switch (position) {
    case 'bottom':
      return {
        top: target.bottom + GAP,
        left: target.left + target.width / 2 - tip.width / 2,
      }
    case 'top':
      return {
        top: target.top - tip.height - GAP,
        left: target.left + target.width / 2 - tip.width / 2,
      }
    case 'right':
      return {
        top: target.top + target.height / 2 - tip.height / 2,
        left: target.right + GAP,
      }
    case 'left':
      return {
        top: target.top + target.height / 2 - tip.height / 2,
        left: target.left - tip.width - GAP,
      }
  }
}

function arrowStyle(position: HintDef['position']): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 0,
    height: 0,
    borderStyle: 'solid',
  }

  switch (position) {
    case 'bottom':
      return {
        ...base,
        top: -ARROW_SIZE,
        left: '50%',
        transform: 'translateX(-50%)',
        borderWidth: `0 ${ARROW_SIZE}px ${ARROW_SIZE}px ${ARROW_SIZE}px`,
        borderColor: `transparent transparent ${colors.navbar.border} transparent`,
      }
    case 'top':
      return {
        ...base,
        bottom: -ARROW_SIZE,
        left: '50%',
        transform: 'translateX(-50%)',
        borderWidth: `${ARROW_SIZE}px ${ARROW_SIZE}px 0 ${ARROW_SIZE}px`,
        borderColor: `${colors.navbar.border} transparent transparent transparent`,
      }
    case 'right':
      return {
        ...base,
        left: -ARROW_SIZE,
        top: '50%',
        transform: 'translateY(-50%)',
        borderWidth: `${ARROW_SIZE}px ${ARROW_SIZE}px ${ARROW_SIZE}px 0`,
        borderColor: `transparent ${colors.navbar.border} transparent transparent`,
      }
    case 'left':
      return {
        ...base,
        right: -ARROW_SIZE,
        top: '50%',
        transform: 'translateY(-50%)',
        borderWidth: `${ARROW_SIZE}px 0 ${ARROW_SIZE}px ${ARROW_SIZE}px`,
        borderColor: `transparent transparent transparent ${colors.navbar.border}`,
      }
  }
}

const glassButton: React.CSSProperties = {
  backgroundColor: colors.navbar.background,
  backdropFilter: `blur(${sizes.blur.default})`,
  WebkitBackdropFilter: `blur(${sizes.blur.default})`,
  border: `${sizes.inputs.borderWidth} solid ${colors.navbar.border}`,
  borderRadius: sizes.inputs.borderRadius,
  padding: `${spacing.xs} ${spacing.lg}`,
  color: colors.text.primary,
  fontSize: sizes.fonts.sm,
  fontWeight: 500,
  cursor: 'pointer',
}

/** Build a clip-path polygon that covers the full viewport with a rectangular cutout */
function spotlightClipPath(rect: DOMRect, pad: number): string {
  const x1 = Math.max(0, rect.left - pad)
  const y1 = Math.max(0, rect.top - pad)
  const x2 = Math.min(window.innerWidth, rect.right + pad)
  const y2 = Math.min(window.innerHeight, rect.bottom + pad)

  // Polygon: outer rectangle (full screen) → inner cutout (target)
  // Trace outer clockwise, then inner counter-clockwise
  return `polygon(
    0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
    ${x1}px ${y1}px, ${x1}px ${y2}px, ${x2}px ${y2}px, ${x2}px ${y1}px, ${x1}px ${y1}px
  )`
}

// ── Tour Prompt ──────────────────────────────────────────────────────────

function TourPrompt({
  onAccept,
  onDecline,
}: {
  onAccept: () => void
  onDecline: () => void
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  return createPortal(
    <>
      {/* Backdrop - matches AuthModal */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: sizes.zIndex.modalBackdrop,
          backgroundColor: colors.navbar.background,
          backdropFilter: `blur(${sizes.blur.modal})`,
          WebkitBackdropFilter: `blur(${sizes.blur.modal})`,
          opacity: visible ? 1 : 0,
          transition: 'opacity 250ms ease',
        }}
      />

      {/* Prompt card */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, ${visible ? '-50%' : 'calc(-50% + 8px)'})`,
          zIndex: sizes.zIndex.modal,
          backgroundColor: colors.navbar.background,
          backdropFilter: `blur(${sizes.blur.default})`,
          WebkitBackdropFilter: `blur(${sizes.blur.default})`,
          border: `${sizes.inputs.borderWidth} solid ${colors.navbar.border}`,
          borderRadius: sizes.borderRadius['2xl'],
          padding: `${spacing.xl} ${spacing['2xl']}`,
          boxShadow: shadows.lg,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: spacing.sm,
          maxWidth: '300px',
          textAlign: 'center',
          opacity: visible ? 1 : 0,
          transition: 'opacity 250ms ease, transform 250ms ease',
        }}
      >
        <span
          style={{
            color: colors.text.primary,
            fontSize: '16px',
            fontWeight: 600,
          }}
        >
          Quick tour?
        </span>
        <span
          style={{
            color: colors.text.muted,
            fontSize: sizes.fonts.sm,
            lineHeight: 1.5,
          }}
        >
          A few quick tips to help you get around.
        </span>
        <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.md }}>
          <button
            onClick={onDecline}
            style={{ ...glassButton, color: colors.text.muted }}
          >
            Skip
          </button>
          <button
            onClick={onAccept}
            style={glassButton}
          >
            Show me
          </button>
        </div>
      </div>
    </>,
    document.body,
  )
}

// ── Hint Tooltip ─────────────────────────────────────────────────────────

function HintTooltip({
  hint,
  onDismiss,
}: {
  hint: HintDef
  onDismiss: () => void
}) {
  const tipRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [clipPath, setClipPath] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(false)
    setPos(null)
    setClipPath(null)

    const el = document.querySelector(`[data-hint="${hint.id}"]`)
    if (!el) return

    const raf = requestAnimationFrame(() => {
      const targetRect = el.getBoundingClientRect()
      const tipRect = tipRef.current?.getBoundingClientRect()
      if (!tipRect) return

      const pad = hint.padding ?? SPOTLIGHT_PAD
      setClipPath(spotlightClipPath(targetRect, pad))

      const p = getPosition(targetRect, tipRect, hint.position)
      p.left = Math.max(8, Math.min(p.left, window.innerWidth - tipRect.width - 8))
      p.top = Math.max(8, Math.min(p.top, window.innerHeight - tipRect.height - 8))

      setPos(p)
      requestAnimationFrame(() => setVisible(true))
    })

    return () => cancelAnimationFrame(raf)
  }, [hint])

  return createPortal(
    <div
      onClick={onDismiss}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: sizes.zIndex.tooltip,
        cursor: 'default',
      }}
    >
      {/* Dimmed overlay with spotlight cutout */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          clipPath: clipPath ?? undefined,
          opacity: visible ? 1 : 0,
          transition: 'opacity 300ms ease',
          pointerEvents: 'none',
        }}
      />

      {/* Tooltip */}
      <div
        ref={tipRef}
        style={{
          position: 'fixed',
          top: pos?.top ?? -9999,
          left: pos?.left ?? -9999,
          backgroundColor: colors.navbar.background,
          backdropFilter: `blur(${sizes.blur.default})`,
          WebkitBackdropFilter: `blur(${sizes.blur.default})`,
          border: `1px solid ${colors.navbar.border}`,
          borderRadius: sizes.borderRadius.xl,
          padding: `${spacing.sm} ${spacing.md}`,
          boxShadow: shadows.lg,
          display: 'flex',
          alignItems: 'center',
          gap: spacing.md,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(4px)',
          transition: 'opacity 200ms ease, transform 200ms ease',
          pointerEvents: 'auto',
          cursor: 'pointer',
          maxWidth: '280px',
        }}
      >
        <div style={arrowStyle(hint.position)} />

        <span
          style={{
            color: colors.text.secondary,
            fontSize: sizes.fonts.sm,
            lineHeight: 1.4,
          }}
        >
          {hint.message}
        </span>

        <span
          style={{
            color: colors.primary[400],
            fontSize: '12px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Got it
        </span>
      </div>
    </div>,
    document.body,
  )
}

// ── Main Overlay ─────────────────────────────────────────────────────────

export default function HintOverlay() {
  const { showPrompt, currentHint, dismiss, acceptTour, declineTour } = useHints()

  if (showPrompt) {
    return <TourPrompt onAccept={acceptTour} onDecline={declineTour} />
  }

  if (currentHint) {
    return <HintTooltip hint={currentHint} onDismiss={dismiss} />
  }

  return null
}

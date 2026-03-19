import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faXmark } from '@fortawesome/free-solid-svg-icons'
import { useStore } from '../../store/store'
import { colors, sizes, shadows, spacing } from '../../constants'

export default function PrivacyPolicyModal() {
  const isOpen = useStore((state) => state.isPrivacyModalOpen)
  const closePrivacyModal = useStore((state) => state.closePrivacyModal)
  const openAccountModal = useStore((state) => state.openAccountModal)

  if (!isOpen) return null

  const handleBack = () => {
    closePrivacyModal()
    openAccountModal()
  }

  const handleClose = () => {
    closePrivacyModal()
  }

  const headingStyle: React.CSSProperties = {
    fontSize: '15px',
    fontWeight: 600,
    color: colors.white,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  }

  const paragraphStyle: React.CSSProperties = {
    fontSize: '13px',
    color: colors.text.muted,
    lineHeight: 1.7,
    marginBottom: spacing.md,
  }

  const listStyle: React.CSSProperties = {
    fontSize: '13px',
    color: colors.text.muted,
    lineHeight: 1.7,
    marginBottom: spacing.md,
    paddingLeft: spacing.lg,
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
          width: sizes.modal.widthWide,
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
          animation: 'modalContentIn 200ms ease-out both',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: `1px solid ${colors.navbar.border}`,
        }}>
          <button
            className="btn-press"
            onClick={handleBack}
            style={{
              background: 'transparent',
              border: 'none',
              color: colors.text.muted,
              cursor: 'pointer',
              padding: '4px 8px',
              fontSize: '13px',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = colors.white)}
            onMouseLeave={(e) => (e.currentTarget.style.color = colors.text.muted)}
          >
            <FontAwesomeIcon icon={faArrowLeft} style={{ fontSize: '12px' }} />
            Account
          </button>

          <button
            className="btn-press"
            onClick={handleClose}
            style={{
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
        </div>

        {/* Content */}
        <div style={{
          padding: `24px ${sizes.modal.paddingContent} ${sizes.modal.paddingContent}`,
          flex: 1,
          overflowY: 'auto',
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: colors.white, marginBottom: '4px' }}>
            Privacy Policy
          </h2>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: spacing.lg }}>
            Last updated: March 2026
          </p>

          <p style={paragraphStyle}>
            Solar Studio is a university project developed at the University of Birmingham. We are
            committed to protecting your privacy. This policy explains how we collect, use, and store
            the personal data you provide while using our app.
          </p>

          <h3 style={headingStyle}>What data do we collect?</h3>
          <p style={paragraphStyle}>Solar Studio may collect the following data:</p>
          <ul style={listStyle}>
            <li>Personal identification information (email address, display name via Google OAuth or email sign-up)</li>
            <li>Visibility reports (whether a celestial object was visible, your country, timestamp)</li>
            <li>Observation log entries (object observed, date/time, equipment, personal notes, rating, approximate location if shared)</li>
            <li>User interactions with the app (page views, feature clicks, search queries) tied to a random session ID</li>
            <li>Approximate geographic coordinates, only when you explicitly enable location sharing</li>
          </ul>

          <h3 style={headingStyle}>How do we collect your data?</h3>
          <p style={paragraphStyle}>We collect data when you:</p>
          <ul style={listStyle}>
            <li>Register an account or sign in via Google OAuth</li>
            <li>Submit a visibility report or observation log entry</li>
            <li>Enable location sharing in Settings</li>
            <li>Interact with the app (usage events are logged automatically for authenticated users)</li>
          </ul>

          <h3 style={headingStyle}>How will we use your data?</h3>
          <p style={paragraphStyle}>Solar Studio collects your data to:</p>
          <ul style={listStyle}>
            <li>Provide core app functionality (visibility maps, observation logs, celestial tracking)</li>
            <li>Display aggregated community sighting reports on the visibility map</li>
            <li>Conduct academic evaluation of the platform as part of a Final Year Project</li>
            <li>Improve the user experience based on anonymised usage patterns</li>
          </ul>
          <p style={paragraphStyle}>
            We will not share your data with third parties. Visibility reports are shown
            to other users in aggregate form (country-level, no personal identifiers). Interaction
            data may be shared with the university for academic evaluation purposes only.
          </p>

          <h3 style={headingStyle}>How do we store your data?</h3>
          <p style={paragraphStyle}>
            Solar Studio securely stores your data using Supabase (hosted on AWS infrastructure).
            Authentication is handled by Supabase Auth. All connections use HTTPS encryption.
            Row-level security policies ensure users can only access their own personal data.
          </p>
          <p style={paragraphStyle}>
            Solar Studio uses browser local storage to maintain your authentication session. We do
            not use tracking cookies or third-party analytics services.
          </p>
          <p style={paragraphStyle}>
            Data is retained indefinitely to support the continued operation of the platform beyond
            the university project. You may delete your account and all associated data at any time.
          </p>

          <h3 style={headingStyle}>Third-party services</h3>
          <p style={paragraphStyle}>
            The app fetches data from external APIs to provide its features. These services receive
            only the technical requests necessary for their function and no user-identifying data:
          </p>
          <ul style={listStyle}>
            <li>Open-Meteo - weather and cloud cover forecasts</li>
            <li>OpenStreetMap Nominatim - reverse geocoding for location labels</li>
            <li>NASA JPL Horizons - celestial body positions</li>
            <li>NOAA SWPC - aurora and geomagnetic forecasts</li>
            <li>US Naval Observatory - moon phases and eclipse data</li>
          </ul>

          <h3 style={headingStyle}>Your data protection rights</h3>
          <p style={paragraphStyle}>As a user, you are entitled to the following rights:</p>
          <ul style={listStyle}>
            <li><strong style={{ color: colors.text.secondary }}>Right to access</strong> - you can view all your data within the app (observation log, reports, account details).</li>
            <li><strong style={{ color: colors.text.secondary }}>Right to rectification</strong> - request corrections to inaccurate data.</li>
            <li><strong style={{ color: colors.text.secondary }}>Right to erasure</strong> - you can permanently delete your account and all associated data at any time from the Account section. This action is immediate and irreversible.</li>
            <li><strong style={{ color: colors.text.secondary }}>Right to restrict processing</strong> - request limitations on how your data is used.</li>
            <li><strong style={{ color: colors.text.secondary }}>Right to object</strong> - object to specific uses of your data.</li>
            <li><strong style={{ color: colors.text.secondary }}>Right to data portability</strong> - request transfer of your data to another service.</li>
          </ul>
          <p style={paragraphStyle}>
            To exercise any of these rights, contact us at the details provided below.
          </p>

          <h3 style={headingStyle}>Changes to our privacy policy</h3>
          <p style={paragraphStyle}>
            Solar Studio regularly reviews this privacy policy to ensure compliance and accuracy. Updates
            will be reflected in-app with an updated date at the top of this page.
          </p>

          <h3 style={headingStyle}>How to contact us</h3>
          <p style={paragraphStyle}>
            If you have questions about this privacy policy or your data, contact:{' '}
            <a
              href="mailto:lmx471@student.bham.ac.uk"
              style={{ color: colors.accent, textDecoration: 'none' }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
            >
              lmx471@student.bham.ac.uk
            </a>
          </p>

          <h3 style={headingStyle}>Contact the appropriate authority</h3>
          <p style={paragraphStyle}>
            If you wish to report a complaint or feel that Solar Studio has not addressed your concern
            satisfactorily, you may contact the Information Commissioner's Office (ICO):
          </p>
          <ul style={listStyle}>
            <li>Website:{' '}
              <a
                href="https://ico.org.uk"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: colors.accent, textDecoration: 'none' }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
              >
                https://ico.org.uk
              </a>
            </li>
            <li>Phone: 0303 123 1113</li>
            <li>Address: Information Commissioner's Office, Wycliffe House, Water Lane, Wilmslow, Cheshire, SK9 5AF</li>
          </ul>
        </div>
      </div>
    </>
  )
}

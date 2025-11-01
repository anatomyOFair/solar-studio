export default function SideNav() {
  return (
    <nav
      className="fixed rounded-lg"
      style={{
        top: '50%',
        left: '1rem',
        transform: 'translateY(-50%)',
        width: '48px',
        height: '60%',
        minWidth: '48px',
        zIndex: 1000,
        backgroundColor: '#1f2937',
        border: '1px solid #374151',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
      }}
    >
      <div className="h-full flex items-center justify-center text-gray-400">
        <div style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
          SideNav
        </div>
      </div>
    </nav>
  )
}


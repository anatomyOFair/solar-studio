export default function TopNav() {
  return (
    <nav
      className="fixed rounded-lg"
      style={{
        top: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '80%',
        height: '48px',
        minHeight: '48px',
        zIndex: 1000,
        backgroundColor: '#1f2937',
        border: '1px solid #374151',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
      }}
    >
      <div className="h-full flex items-center justify-center text-gray-400">
        TopNav
      </div>
    </nav>
  )
}


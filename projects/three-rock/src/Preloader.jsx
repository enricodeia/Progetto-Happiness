export default function Preloader({ visible, fadeDuration = 0.9 }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#090b0d',
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.4vw',
        pointerEvents: visible ? 'auto' : 'none',
        opacity: visible ? 1 : 0,
        transition: `opacity ${fadeDuration}s cubic-bezier(0, 0.55, 0.45, 1)`,
      }}
    >
      <div
        style={{
          width: '2.2vw',
          height: '2.2vw',
          minWidth: 28,
          minHeight: 28,
          border: '1px solid rgba(236, 237, 240, 0.12)',
          borderTopColor: 'rgba(236, 237, 240, 0.85)',
          borderRadius: '50%',
          animation: 'preloader-spin 1.2s linear infinite',
        }}
      />
      <span
        style={{
          fontFamily: "'PP Eiko', serif",
          fontWeight: 100,
          fontStyle: 'italic',
          fontSize: '1.1vw',
          letterSpacing: '0.12em',
          textTransform: 'lowercase',
          color: 'rgba(236, 237, 240, 0.7)',
          animation: 'preloader-breath 1.8s ease-in-out infinite',
          userSelect: 'none',
        }}
      >
        loading
      </span>

      <style>{`
        @keyframes preloader-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes preloader-breath {
          0%, 100% { opacity: 0.4; }
          50%     { opacity: 0.9; }
        }
      `}</style>
    </div>
  )
}

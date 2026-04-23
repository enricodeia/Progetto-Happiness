// Title + description overlay for the hovered client. Image bg is rendered separately
// by ClientImageBg so it can sit BELOW the 3D canvas (with the rock in front).
export default function ClientPreview({
  client,
  titleTopVh = 18,
  titleLeftVw = 1.5,
  titleFontVw = 3.9,
  descRightVw = 8,
  descBottomVh = 24,
  descMaxWVw = 12,
  descFontVw = 0.92,
  fadeDurationS = 0.8,
  zIndex = 12,
}) {
  const visible = !!client
  return (
    <>
      <h2
        style={{
          position: 'fixed',
          top: `${titleTopVh}vh`,
          left: `${titleLeftVw}vw`,
          margin: 0,
          fontFamily: "'PP Eiko', serif",
          fontWeight: 100,
          fontSize: `${titleFontVw}vw`,
          lineHeight: 0.95,
          letterSpacing: '-0.03em',
          color: '#f5f6f8',
          pointerEvents: 'none',
          zIndex,
          opacity: visible ? 0.96 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(10px)',
          transition: `opacity ${fadeDurationS}s ease 60ms, transform ${fadeDurationS}s cubic-bezier(0,0.55,0.45,1) 60ms`,
          whiteSpace: 'nowrap',
          userSelect: 'none',
        }}
      >
        {client?.name || ''}
      </h2>
      <p
        style={{
          position: 'fixed',
          right: `${descRightVw}vw`,
          bottom: `${descBottomVh}vh`,
          margin: 0,
          maxWidth: `${descMaxWVw}vw`,
          color: '#d0d3dc',
          fontFamily: "'Basis Grotesque Pro', -apple-system, BlinkMacSystemFont, sans-serif",
          fontSize: `${descFontVw}vw`,
          lineHeight: 1.45,
          pointerEvents: 'none',
          zIndex,
          opacity: visible ? 0.85 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(10px)',
          transition: `opacity ${fadeDurationS}s ease 120ms, transform ${fadeDurationS}s cubic-bezier(0,0.55,0.45,1) 120ms`,
          textAlign: 'right',
          userSelect: 'none',
        }}
      >
        {client?.description || ''}
      </p>
    </>
  )
}

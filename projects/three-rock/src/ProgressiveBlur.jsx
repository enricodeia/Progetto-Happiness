const ANGLE = { top: 0, right: 90, bottom: 180, left: 270 }

export default function ProgressiveBlur({
  side = 'left',
  width = 200,
  layers = 8,
  intensity = 1,
  style,
}) {
  const angle = ANGLE[side] ?? 270
  const seg = 1 / (layers + 1)

  const container = {
    position: 'absolute',
    top: 0,
    height: '100%',
    width: `${width}vw`,
    pointerEvents: 'none',
    ...(side === 'left'   ? { left: 0 } : {}),
    ...(side === 'right'  ? { right: 0 } : {}),
    ...(side === 'top'    ? { top: 0, width: '100%', height: `${width}vw` } : {}),
    ...(side === 'bottom' ? { bottom: 0, top: 'auto', width: '100%', height: `${width}vw` } : {}),
    ...style,
  }

  return (
    <div style={container}>
      {Array.from({ length: Math.max(layers, 2) }).map((_, i) => {
        const stops = [
          i * seg,
          (i + 1) * seg,
          (i + 2) * seg,
          (i + 3) * seg,
        ]
          .map(
            (pos, p) =>
              `rgba(255,255,255,${p === 1 || p === 2 ? 1 : 0}) ${(pos * 100).toFixed(2)}%`,
          )
          .join(', ')
        const gradient = `linear-gradient(${angle}deg, ${stops})`
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              maskImage: gradient,
              WebkitMaskImage: gradient,
              backdropFilter: `blur(${(i * intensity).toFixed(2)}px)`,
              WebkitBackdropFilter: `blur(${(i * intensity).toFixed(2)}px)`,
            }}
          />
        )
      })}
    </div>
  )
}

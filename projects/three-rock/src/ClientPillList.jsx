import { useRef } from 'react'

export default function ClientPillList({
  items,
  bottomVh = 2.5,
  gapVw = 0.52,
  rowGapVw = 0.52,
  maxWidthVw = 33,
  pillPadYVw = 0.4,
  pillPadXVw = 1.10,
  fontSizeVw = 0.79,
  idleBg = '#ffffff14',
  hoverBg = 'rgba(0,0,0,0.45)',
  hoverBorder = 'rgba(255,255,255,0.9)',
  textColor = '#f5f6f8',
  blurPx = 4,
  hoveredId = null,
  onHoverChange,
  onClick,
  zIndex = 16,
}) {
  const refs = useRef(new Map())

  const emit = (id) => {
    if (!onHoverChange) return
    if (id == null) { onHoverChange(null, null); return }
    const el = refs.current.get(id)
    const rect = el ? el.getBoundingClientRect() : null
    onHoverChange(id, rect)
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: `${bottomVh}vh`,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        columnGap: `${gapVw}vw`,
        rowGap: `${rowGapVw}vw`,
        maxWidth: `${maxWidthVw}vw`,
        zIndex,
        pointerEvents: 'auto',
      }}
      onPointerLeave={() => emit(null)}
    >
      {items.map((c) => {
        const isHovered = hoveredId === c.id
        return (
          <button
            key={c.id}
            ref={(el) => {
              if (el) refs.current.set(c.id, el)
              else refs.current.delete(c.id)
            }}
            type="button"
            onPointerEnter={() => emit(c.id)}
            onPointerMove={() => { if (hoveredId !== c.id) emit(c.id) }}
            onClick={() => onClick?.(c.id)}
            style={{
              all: 'unset',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: `${pillPadYVw}vw ${pillPadXVw}vw`,
              borderRadius: 999,
              background: isHovered ? hoverBg : idleBg,
              border: isHovered ? `1px solid ${hoverBorder}` : '1px solid transparent',
              backdropFilter: `blur(${blurPx}px)`,
              WebkitBackdropFilter: `blur(${blurPx}px)`,
              color: textColor,
              fontFamily: "'Basis Grotesque Pro', -apple-system, BlinkMacSystemFont, sans-serif",
              fontSize: `${fontSizeVw}vw`,
              fontWeight: 400,
              letterSpacing: '-0.005em',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'background 0.4s cubic-bezier(0.23, 1, 0.32, 1), border-color 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
              willChange: 'background, border-color',
            }}
          >
            {c.name}
          </button>
        )
      })}
    </div>
  )
}

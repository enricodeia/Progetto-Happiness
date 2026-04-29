import './Marquee.css'

export function Marquee({ text = 'Metalab', repeat = 8, speed = 20 }) {
  const items = Array.from({ length: repeat })
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee__track" style={{ animationDuration: `${speed}s` }}>
        {items.map((_, i) => (
          <span className="marquee__item" key={`a-${i}`}>{text}</span>
        ))}
        {items.map((_, i) => (
          <span className="marquee__item" key={`b-${i}`}>{text}</span>
        ))}
      </div>
    </div>
  )
}

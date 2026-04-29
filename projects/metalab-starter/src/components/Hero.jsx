import './Hero.css'

export function Hero({ eyebrow, title, body, children }) {
  return (
    <section className="hero">
      <div className="container">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="hero__title">{title}</h1>
        {body && <p className="hero__body">{body}</p>}
        {children && <div className="hero__cta">{children}</div>}
      </div>
    </section>
  )
}

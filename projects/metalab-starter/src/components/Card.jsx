import './Card.css'

export function Card({ image, eyebrow, title, meta, href = '#' }) {
  return (
    <a className="card" href={href}>
      {image && <div className="card__media"><img src={image} alt="" /></div>}
      <div className="card__body">
        {eyebrow && <p className="eyebrow card__eyebrow">{eyebrow}</p>}
        <h3 className="card__title">{title}</h3>
        {meta && <p className="card__meta">{meta}</p>}
      </div>
    </a>
  )
}

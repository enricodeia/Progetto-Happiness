import './Button.css'

export function Button({ variant = 'primary', children, as = 'button', ...rest }) {
  const Tag = as
  return (
    <Tag className={`btn btn--${variant}`} {...rest}>
      <span className="btn__label">{children}</span>
      <span className="btn__arrow" aria-hidden="true">→</span>
    </Tag>
  )
}

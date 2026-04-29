import './NavBar.css'
import { Button } from './Button'

export function NavBar({ links = [], cta = 'Say hey' }) {
  return (
    <nav className="nav">
      <div className="container nav__inner">
        <a href="/" className="nav__logo">Metalab</a>
        <ul className="nav__links">
          {links.map((l) => (
            <li key={l.href}><a href={l.href}>{l.label}</a></li>
          ))}
        </ul>
        <Button variant="primary" as="a" href="/contact">{cta}</Button>
      </div>
    </nav>
  )
}

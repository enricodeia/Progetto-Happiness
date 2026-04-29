import './Footer.css'
import { Marquee } from './Marquee'

export function Footer() {
  return (
    <footer className="footer">
      <Marquee text="Metalab" repeat={8} speed={20} />
      <div className="container footer__inner">
        <div>
          <p className="eyebrow">Contact</p>
          <a href="mailto:contact@metalab.com" className="footer__email">contact@metalab.com</a>
        </div>
        <div>
          <p className="eyebrow">Social</p>
          <ul className="footer__list">
            <li><a href="#">Twitter</a></li>
            <li><a href="#">LinkedIn</a></li>
            <li><a href="#">Dribbble</a></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow">Sitemap</p>
          <ul className="footer__list">
            <li><a href="/what-we-do">What we do</a></li>
            <li><a href="/about">About</a></li>
            <li><a href="/blog">Blog</a></li>
            <li><a href="/contact">Contact</a></li>
          </ul>
        </div>
      </div>
    </footer>
  )
}

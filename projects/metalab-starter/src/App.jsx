import { NavBar } from './components/NavBar'
import { Hero } from './components/Hero'
import { Button } from './components/Button'
import { Card } from './components/Card'
import { Footer } from './components/Footer'

export default function App() {
  return (
    <>
      <NavBar
        links={[
          { href: '/what-we-do', label: 'What we do' },
          { href: '/about', label: 'About' },
          { href: '/blog', label: 'Blog' },
        ]}
      />

      <Hero
        eyebrow="Metalab Starter"
        title="We make interfaces."
        body="A Metalab-grade design system, ready to ship. Tokens, components, motion — pre-wired so you can focus on the idea, not the setup."
      >
        <Button variant="primary">Start building</Button>
        <Button variant="secondary">View tokens</Button>
      </Hero>

      <section className="container" style={{ paddingBottom: 'var(--space-9)' }}>
        <p className="eyebrow">Latest work</p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 'var(--space-5)',
          marginTop: 'var(--space-5)',
        }}>
          <Card eyebrow="Brand" title="A study in rigor" meta="2026" />
          <Card eyebrow="Product" title="Designing for trust" meta="2026" />
          <Card eyebrow="Marketing" title="Editorial systems" meta="2026" />
        </div>
      </section>

      <Footer />
    </>
  )
}

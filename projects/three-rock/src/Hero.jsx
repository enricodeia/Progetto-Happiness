export default function Hero({ children }) {
  return (
    <section className="hero" aria-label="hero">
      <h1 className="hero__title">
        {children ?? <>We craft <em>thoughtful</em> products.</>}
      </h1>
    </section>
  )
}

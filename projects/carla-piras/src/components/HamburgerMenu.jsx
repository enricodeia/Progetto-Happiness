import { useEffect, useRef } from "react";
import gsap from "gsap";
import "./HamburgerMenu.css";

const ITEMS = [
  { key: "come-lavoro", label: "Come lavoro", num: "01" },
  { key: "chi-sono", label: "Chi sono", num: "02" },
  { key: "contatti", label: "Contatti", num: "03" },
];

export default function HamburgerMenu({
  open,
  onToggle,
  onNavigate,
  activeSection,
}) {
  const panelRef = useRef(null);
  const itemsRef = useRef([]);
  const contactsRef = useRef(null);
  const ctaRef = useRef(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    if (open) {
      gsap.set(panel, { autoAlpha: 0, y: -40 });
      gsap.set(itemsRef.current, { y: 30, autoAlpha: 0 });
      if (contactsRef.current)
        gsap.set(contactsRef.current, { y: 20, autoAlpha: 0 });
      if (ctaRef.current) gsap.set(ctaRef.current, { y: 20, autoAlpha: 0 });
      const tl = gsap.timeline();
      tl.to(panel, {
        autoAlpha: 1,
        y: 0,
        duration: 0.45,
        ease: "power3.out",
      });
      tl.to(
        itemsRef.current,
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.55,
          ease: "power3.out",
          stagger: 0.08,
        },
        0.2
      );
      if (contactsRef.current) {
        tl.to(
          contactsRef.current,
          { y: 0, autoAlpha: 1, duration: 0.5, ease: "power3.out" },
          0.5
        );
      }
      if (ctaRef.current) {
        tl.to(
          ctaRef.current,
          { y: 0, autoAlpha: 1, duration: 0.5, ease: "power3.out" },
          0.55
        );
      }
    } else {
      gsap.to(panel, {
        autoAlpha: 0,
        y: -40,
        duration: 0.35,
        ease: "power3.in",
      });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onToggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onToggle]);

  return (
    <>
      <button
        type="button"
        className={`hamburger ${open ? "is-open" : ""}`}
        onClick={onToggle}
        aria-label={open ? "Chiudi menu" : "Apri menu"}
        aria-expanded={open}
      >
        <span className="hamburger__bar" />
        <span className="hamburger__bar" />
      </button>

      <div
        ref={panelRef}
        className="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
      >
        <div className="mobile-menu__center">
          <ul className="mobile-menu__list">
            {ITEMS.map((it, i) => (
              <li key={it.key}>
                <button
                  type="button"
                  ref={(el) => (itemsRef.current[i] = el)}
                  className={`mobile-menu__item ${
                    activeSection === it.key ? "is-active" : ""
                  }`}
                  onClick={() => onNavigate(it.key)}
                >
                  <span className="mobile-menu__label">{it.label}</span>
                  <span className="mobile-menu__num">{it.num}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="mobile-menu__foot">
          <ul className="mobile-menu__contacts" ref={contactsRef}>
            <li>
              <span className="mm-label">Telefono</span>
              <a href="tel:+393513063859" className="mm-val">+39 351 3063859</a>
            </li>
            <li>
              <span className="mm-label">Email</span>
              <a href="mailto:carlapiras.psi@gmail.com" className="mm-val">carlapiras.psi@gmail.com</a>
            </li>
            <li>
              <span className="mm-label">Instagram</span>
              <a
                href="https://instagram.com/carlapiras.psicologa"
                target="_blank"
                rel="noreferrer"
                className="mm-val"
              >
                @carlapiras.psicologa
              </a>
            </li>
            <li>
              <span className="mm-label">Studi</span>
              <span className="mm-val">
                Milano · Via Cosimo del Fante · Viale Famagosta · Online
              </span>
            </li>
          </ul>

          <button
            type="button"
            ref={ctaRef}
            className="mobile-menu__cta"
            onClick={() => onNavigate("contatti")}
          >
            <span>Prenota un colloquio</span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}

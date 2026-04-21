import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import "./ContactModal.css";

export default function ContactModal({ open, onClose }) {
  const backdropRef = useRef(null);
  const panelRef = useRef(null);
  const [status, setStatus] = useState("idle");
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "primo-colloquio",
    message: "",
    consent: false,
  });

  useEffect(() => {
    const backdrop = backdropRef.current;
    const panel = panelRef.current;
    if (!backdrop || !panel) return;

    if (open) {
      const items = panel.querySelectorAll(
        ".modal__index, .modal__title, .modal__lead, .modal__directs > li, .field, .consent, .form-submit"
      );
      gsap.set(backdrop, { autoAlpha: 0 });
      gsap.set(panel, { autoAlpha: 0, y: 24, scale: 0.985 });
      gsap.set(items, { y: 18, autoAlpha: 0 });
      const tl = gsap.timeline();
      tl.to(backdrop, { autoAlpha: 1, duration: 0.35, ease: "power2.out" }, 0);
      tl.to(
        panel,
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.6,
          ease: "power3.out",
        },
        0.05
      );
      tl.to(
        items,
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.55,
          ease: "power3.out",
          stagger: 0.05,
        },
        0.25
      );
    } else {
      const tl = gsap.timeline();
      tl.to(panel, {
        autoAlpha: 0,
        y: 16,
        scale: 0.99,
        duration: 0.32,
        ease: "power3.in",
      });
      tl.to(backdrop, { autoAlpha: 0, duration: 0.28, ease: "power2.in" }, "<0.1");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim() || !form.consent) {
      setStatus("error");
      return;
    }
    setStatus("sending");
    const subject = encodeURIComponent(
      `[Sito] ${form.subject.replace("-", " ")} — ${form.name}`
    );
    const body = encodeURIComponent(
      `${form.message}\n\n— ${form.name}\n${form.email}`
    );
    window.location.href = `mailto:carlapiras.psi@gmail.com?subject=${subject}&body=${body}`;
    setTimeout(() => setStatus("sent"), 400);
  };

  return (
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-title"
      aria-hidden={!open}
    >
      <div
        ref={backdropRef}
        className="modal__backdrop"
        onClick={onClose}
      />
      <div ref={panelRef} className="modal__panel">
        <button
          type="button"
          className="modal__close"
          onClick={onClose}
          aria-label="Chiudi"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>

        <div className="modal__head">
          <span className="modal__index">03 · Contatti</span>
          <h2 id="contact-title" className="modal__title">
            Scrivimi per un <em>primo</em>
            <br />
            colloquio.
          </h2>
          <p className="modal__lead">
            Lascia un messaggio e ti risponderò nel più breve tempo possibile,
            oppure contattami direttamente.
          </p>
          <ul className="modal__directs">
            <li>
              <span className="ct-label">Telefono</span>
              <a href="tel:+393513063859" className="ct-val">+39 351 3063859</a>
            </li>
            <li>
              <span className="ct-label">Email</span>
              <a href="mailto:carlapiras.psi@gmail.com" className="ct-val">carlapiras.psi@gmail.com</a>
            </li>
            <li>
              <span className="ct-label">Studi</span>
              <span className="ct-val">
                Milano · Via Cosimo del Fante, 14
                <br />
                Viale Famagosta · Online
              </span>
            </li>
          </ul>
        </div>

        <form className="modal__form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="c-name">Nome e cognome</label>
            <input
              id="c-name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Come ti chiami"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="c-email">Email</label>
            <input
              id="c-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="indirizzo@email.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="field field--select">
            <label htmlFor="c-subject">Di cosa vorresti parlarmi</label>
            <select
              id="c-subject"
              name="subject"
              value={form.subject}
              onChange={handleChange}
            >
              <option value="primo-colloquio">Primo colloquio</option>
              <option value="percorso-individuale">Percorso individuale</option>
              <option value="genitorialita">Genitorialità e adolescenza</option>
              <option value="altro">Altro</option>
            </select>
          </div>

          <div className="field field--area">
            <label htmlFor="c-msg">Messaggio</label>
            <textarea
              id="c-msg"
              name="message"
              rows="4"
              placeholder="Raccontami brevemente ciò che ti ha portato qui."
              value={form.message}
              onChange={handleChange}
              required
            />
          </div>

          <label className="consent">
            <input
              type="checkbox"
              name="consent"
              checked={form.consent}
              onChange={handleChange}
            />
            <span>
              Ho letto l'informativa sulla privacy e acconsento al trattamento
              dei dati.
            </span>
          </label>

          {status === "error" && (
            <p className="form-error">
              Controlla i campi obbligatori e il consenso alla privacy.
            </p>
          )}

          <button type="submit" className="form-submit">
            <span>{status === "sent" ? "Grazie, a presto." : "Invia messaggio"}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </form>

      </div>
    </div>
  );
}

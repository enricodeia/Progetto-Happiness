import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import StaggerButton from "./StaggerButton.jsx";
import ContactModal from "./ContactModal.jsx";
import Flower from "./Flower.jsx";
import FlowerBurst from "./FlowerBurst.jsx";
import "./Hero.css";

const CARLA = "Carla".split("");
const PIRAS = "Piras".split("");
const LOGO = "Carla Piras".split("");

const PANEL_SECTIONS = ["chi-sono", "come-lavoro"];

const FLOWERS = [
  { size: 52, delay: 0.0, offsetY: 0, variant: "wave" },
  { size: 30, delay: 0.5, offsetY: 18, variant: "twist" },
  { size: 38, delay: 0.9, offsetY: -6, variant: "knot" },
  { size: 26, delay: 1.3, offsetY: 24, variant: "zigzag" },
  { size: 42, delay: 1.7, offsetY: 4, variant: "taper" },
  { size: 24, delay: 2.1, offsetY: 28, variant: "lean" },
];

export default function Hero({ preloader, typography, chisono, tilt, meta }) {
  const rootRef = useRef(null);
  const carlaWordRef = useRef(null);
  const pirasWordRef = useRef(null);
  const carlaCharsRef = useRef([]);
  const pirasCharsRef = useRef([]);
  const photoRef = useRef(null);
  const photoInnerRef = useRef(null);
  const imgRef = useRef(null);
  const percRef = useRef(null);
  const navRef = useRef(null);
  const footRef = useRef(null);
  const decorRef = useRef(null);
  const decorTopRef = useRef(null);
  const decorBottomRef = useRef(null);
  const panelsRef = useRef({});
  const prevSectionRef = useRef(null);
  const badgeRef = useRef(null);
  const metaLeftRef = useRef(null);
  const metaRightRef = useRef(null);
  const logoRef = useRef(null);
  const logoCharsRef = useRef([]);

  const [activeSection, setActiveSection] = useState(null);
  const [preloadComplete, setPreloadComplete] = useState(false);
  const [navCtaHover, setNavCtaHover] = useState(false);
  const [footCtaHover, setFootCtaHover] = useState(false);
  const ctaHover = navCtaHover || footCtaHover;

  // Synchronous initial state — runs BEFORE paint so there's no FOUC
  useLayoutEffect(() => {
    const p = preloader;
    const topY = `-${50 - p.letterTopOffset}vh`;
    const bottomY = `${50 - p.letterBottomOffset}vh`;

    const ctx = gsap.context(() => {
      gsap.set(carlaWordRef.current, {
        xPercent: -50,
        yPercent: -50,
        x: 0,
        y: topY,
        autoAlpha: 1,
      });
      gsap.set(pirasWordRef.current, {
        xPercent: -50,
        yPercent: -50,
        x: 0,
        y: bottomY,
        autoAlpha: 1,
      });
      gsap.set(carlaCharsRef.current, { y: p.charsYFrom, autoAlpha: 0 });
      gsap.set(pirasCharsRef.current, { y: p.charsYFrom, autoAlpha: 0 });

      gsap.set(photoRef.current, {
        xPercent: -50,
        yPercent: -50,
        x: 0,
        "--mask-y": "50%",
        autoAlpha: 1,
      });
      gsap.set(photoInnerRef.current, {
        scale: p.photoScaleFrom,
        transformOrigin: "50% 50%",
        force3D: true,
      });
      gsap.set(percRef.current, {
        xPercent: -50,
        yPercent: -50,
        autoAlpha: 1,
      });
      gsap.set(
        [
          navRef.current,
          footRef.current,
          badgeRef.current,
          metaLeftRef.current,
          metaRightRef.current,
        ],
        { autoAlpha: 0, y: 14 }
      );
      gsap.set(logoCharsRef.current, { y: 20, autoAlpha: 0 });
      gsap.set(decorRef.current, { autoAlpha: 1 });

      const paths = [decorTopRef.current, decorBottomRef.current].filter(Boolean);
      paths.forEach((path) => {
        const len = path.getTotalLength();
        path.style.strokeDasharray = `${len}`;
        path.style.strokeDashoffset = `${len}`;
      });

      Object.values(panelsRef.current).forEach((el) => {
        if (el) gsap.set(el, { autoAlpha: 0, x: 40 });
      });

      if (percRef.current) percRef.current.textContent = "00";
    }, rootRef);

    rootRef.current?.setAttribute("data-ready", "true");

    return () => {
      ctx.revert();
      rootRef.current?.setAttribute("data-ready", "false");
    };
  }, [preloader]);

  // Async timeline — waits for image decode to avoid reveal jank
  useEffect(() => {
    const p = preloader;
    let ctx = null;
    let cancelled = false;

    const build = () => {
      ctx = gsap.context(() => {
        const leftX = `-${p.lettersSideOffset}vw`;
        const rightX = `${p.lettersSideOffset}vw`;
        const paths = [decorTopRef.current, decorBottomRef.current].filter(Boolean);

        const counter = { v: 0 };
        const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
        let decoded = false;

        if (paths.length) {
          tl.to(
            paths,
            { strokeDashoffset: 0, duration: 4, ease: "circ.inOut" },
            0
          );
        }

        tl.to(
          carlaCharsRef.current,
          {
            y: 0,
            autoAlpha: 1,
            duration: p.charsDuration,
            ease: p.charsEase,
            stagger: p.charsStagger,
          },
          0
        );
        tl.to(
          pirasCharsRef.current,
          {
            y: 0,
            autoAlpha: 1,
            duration: p.charsDuration,
            ease: p.charsEase,
            stagger: p.charsStagger,
          },
          `>-${Math.max(0, p.charsDuration - p.gapBetweenWords)}`
        );

        tl.to(
          counter,
          {
            v: 100,
            duration: p.percentageDuration,
            ease: "none",
            onUpdate: () => {
              if (percRef.current)
                percRef.current.textContent = Math.round(counter.v)
                  .toString()
                  .padStart(2, "0");
            },
          },
          `>-${p.percentageDuration * 0.6}`
        );
        tl.to({}, { duration: p.holdDuration });
        tl.to(percRef.current, {
          autoAlpha: 0,
          duration: p.percentageFadeDuration,
          ease: "power2.out",
        });

        tl.addPause("reveal", () => {
          rootRef.current?.setAttribute("data-revealing", "true");
          if (decoded) tl.resume();
        });

        tl.to(
          photoRef.current,
          {
            "--mask-y": "0%",
            duration: p.maskDuration,
            ease: p.maskEase,
          },
          ">-0.05"
        );
        tl.to(
          photoInnerRef.current,
          {
            scale: 1,
            duration: p.maskDuration,
            ease: p.maskEase,
          },
          "<"
        );
        tl.to(
          carlaWordRef.current,
          {
            x: leftX,
            y: `${p.letterFinalYVh}vh`,
            duration: p.maskDuration,
            ease: p.maskEase,
          },
          "<"
        );
        tl.to(
          pirasWordRef.current,
          {
            x: rightX,
            y: `${p.letterFinalYVh}vh`,
            duration: p.maskDuration,
            ease: p.maskEase,
            onComplete: () => {
              rootRef.current?.removeAttribute("data-revealing");
            },
          },
          "<"
        );

        tl.to(
          [
            navRef.current,
            footRef.current,
            badgeRef.current,
            metaLeftRef.current,
            metaRightRef.current,
          ],
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.9,
            ease: "power2.out",
            stagger: 0.08,
            onComplete: () => setPreloadComplete(true),
          },
          `>-${0.5 - p.uiFadeDelay}`
        );

        const img = imgRef.current;
        const decodeP = img?.decode
          ? img.decode().catch(() => {})
          : Promise.resolve();
        decodeP.then(() => {
          if (cancelled) return;
          decoded = true;
          if (tl.paused()) tl.resume();
        });
      }, rootRef);
    };

    build();

    return () => {
      cancelled = true;
      if (ctx) ctx.revert();
      setPreloadComplete(false);
      prevSectionRef.current = null;
    };
  }, [preloader]);

  // Photo tilt + momentum — only after preloader completes, to avoid matrix
  // conflicts with the mask reveal scale animation on .photo-inner.
  useEffect(() => {
    if (!tilt.enabled || !preloadComplete) return;
    const inner = photoInnerRef.current;
    if (!inner) return;

    const rotY = gsap.quickTo(inner, "rotationY", {
      duration: tilt.smoothing,
      ease: "power2.out",
    });
    const rotX = gsap.quickTo(inner, "rotationX", {
      duration: tilt.smoothing,
      ease: "power2.out",
    });
    const transX = gsap.quickTo(inner, "x", {
      duration: tilt.smoothing,
      ease: "power2.out",
    });
    const transY = gsap.quickTo(inner, "y", {
      duration: tilt.smoothing,
      ease: "power2.out",
    });

    const onMove = (e) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      rotY(nx * tilt.angle);
      rotX(-ny * tilt.angle);
      transX(nx * tilt.drift);
      transY(ny * tilt.drift);
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      gsap.set(inner, { x: 0, y: 0, rotationX: 0, rotationY: 0 });
    };
  }, [tilt.enabled, tilt.angle, tilt.drift, tilt.smoothing, preloadComplete]);

  // Section transitions (panels only; contatti is a modal)
  useEffect(() => {
    if (!preloadComplete) return;

    const prev = prevSectionRef.current;
    const next = activeSection;
    prevSectionRef.current = next;
    if (prev === next) return;

    const prevIsPanel = PANEL_SECTIONS.includes(prev);
    const nextIsPanel = PANEL_SECTIONS.includes(next);

    const c = chisono;
    const p = preloader;

    const tl = gsap.timeline();

    // Title title-change animation: fast circ.in out, circ.out back
    const fastExit = Math.min(c.exitDuration, 0.45);
    const fastEnter = Math.min(p.charsDuration * 0.55, 0.7);

    const isMobile = window.matchMedia("(max-width: 900px)").matches;
    const fillX = isMobile ? 0 : "-25vw";
    const fillY = isMobile ? "-25vh" : 0;

    const footItems = footRef.current
      ? footRef.current.querySelectorAll(".tagline, .foot-cta")
      : [];
    const metaItems = [metaLeftRef.current, metaRightRef.current].filter(
      Boolean
    );

    if (nextIsPanel && !prevIsPanel) {
      tl.to(
        carlaCharsRef.current,
        {
          y: -p.charsYFrom,
          autoAlpha: 0,
          duration: fastExit,
          ease: "circ.in",
          stagger: c.exitStagger,
        },
        0
      );
      tl.to(
        pirasCharsRef.current,
        {
          y: -p.charsYFrom,
          autoAlpha: 0,
          duration: fastExit,
          ease: "circ.in",
          stagger: c.exitStagger,
        },
        `>-${fastExit * 0.55}`
      );
      tl.to(
        photoRef.current,
        {
          x: fillX,
          y: fillY,
          duration: c.bioEnterDuration,
          ease: "power3.inOut",
        },
        ">-0.05"
      );
      tl.to(
        photoInnerRef.current,
        {
          scale: c.parallaxScale,
          duration: c.bioEnterDuration + 0.3,
          ease: "power2.out",
        },
        "<"
      );
      tl.to(
        panelsRef.current[next],
        {
          autoAlpha: 1,
          x: 0,
          duration: c.bioEnterDuration,
          ease: c.bioEnterEase,
        },
        "<+0.1"
      );
      const panelItems = panelsRef.current[next]
        ? panelsRef.current[next].querySelectorAll(
            ".bio-index, .bio-title, .bio-body > p, .bio-steps > li, .bio-sign"
          )
        : [];
      if (panelItems.length) {
        tl.fromTo(
          panelItems,
          { y: 18, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.55,
            ease: "power3.out",
            stagger: 0.07,
          },
          "<+0.15"
        );
      }
      if (footItems.length) {
        tl.to(
          footItems,
          {
            y: 50,
            autoAlpha: 0,
            duration: 0.6,
            ease: "circ.in",
            stagger: 0.3,
          },
          0
        );
      }
      if (metaItems.length) {
        tl.to(
          metaItems,
          {
            y: 50,
            autoAlpha: 0,
            duration: 0.6,
            ease: "circ.in",
            stagger: 0.15,
          },
          0
        );
      }
      tl.to(
        logoCharsRef.current,
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.6,
          ease: "circ.out",
          stagger: 0.035,
        },
        fastExit * 0.5
      );
    } else if (!nextIsPanel && prevIsPanel) {
      tl.to(
        panelsRef.current[prev],
        {
          autoAlpha: 0,
          x: 40,
          duration: c.exitDuration * 0.7,
          ease: "power3.in",
        },
        0
      );
      tl.to(
        photoRef.current,
        {
          x: 0,
          y: 0,
          duration: c.bioEnterDuration,
          ease: "power3.inOut",
        },
        "<+0.05"
      );
      tl.to(
        photoInnerRef.current,
        { scale: 1, duration: c.bioEnterDuration, ease: "power2.out" },
        "<"
      );
      tl.fromTo(
        carlaCharsRef.current,
        { y: p.charsYFrom, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: fastEnter,
          ease: "circ.out",
          stagger: p.charsStagger,
        },
        ">-0.05"
      );
      tl.fromTo(
        pirasCharsRef.current,
        { y: p.charsYFrom, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: fastEnter,
          ease: "circ.out",
          stagger: p.charsStagger,
        },
        `>-${fastEnter * 0.55}`
      );
      if (footItems.length) {
        tl.to(
          footItems,
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.6,
            ease: "circ.out",
            stagger: 0.3,
          },
          0
        );
      }
      if (metaItems.length) {
        tl.to(
          metaItems,
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.6,
            ease: "circ.out",
            stagger: 0.15,
          },
          0
        );
      }
      tl.to(
        logoCharsRef.current,
        {
          y: 20,
          autoAlpha: 0,
          duration: 0.45,
          ease: "circ.in",
          stagger: 0.03,
        },
        0
      );
    } else if (prevIsPanel && nextIsPanel) {
      tl.to(
        panelsRef.current[prev],
        {
          autoAlpha: 0,
          x: 40,
          duration: c.exitDuration * 0.6,
          ease: "power3.in",
        },
        0
      );
      tl.fromTo(
        panelsRef.current[next],
        { autoAlpha: 0, x: 40 },
        {
          autoAlpha: 1,
          x: 0,
          duration: c.bioEnterDuration,
          ease: c.bioEnterEase,
        },
        `>-0.1`
      );
      const swapItems = panelsRef.current[next]
        ? panelsRef.current[next].querySelectorAll(
            ".bio-index, .bio-title, .bio-body > p, .bio-steps > li, .bio-sign"
          )
        : [];
      if (swapItems.length) {
        tl.fromTo(
          swapItems,
          { y: 18, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.55,
            ease: "power3.out",
            stagger: 0.07,
          },
          "<+0.1"
        );
      }
    }
  }, [activeSection, preloadComplete, chisono, preloader]);

  const toggleSection = (name) => {
    setActiveSection((cur) => (cur === name ? null : name));
  };

  const photoStyle = {
    "--photo-home-w": `calc(${preloader.imageHeightVh}vh * ${preloader.imageAspect})`,
    "--photo-home-h": `${preloader.imageHeightVh}vh`,
  };

  const titleStyle = {
    fontFamily: typography.titleFont,
    fontWeight: typography.titleWeight,
    fontStyle: "normal",
    letterSpacing: `${typography.titleTracking}em`,
    fontSize: `clamp(60px, ${typography.titleSizeVw}vw, 260px)`,
  };

  const navItems = [
    { key: "come-lavoro", label: "Come lavoro" },
    { key: "chi-sono", label: "Chi sono" },
    { key: "contatti", label: "Contatti" },
  ];

  return (
    <div className="hero" ref={rootRef} data-active={activeSection || "home"}>
      <div className="decor" ref={decorRef} aria-hidden="true">
        <svg
          className="decor-line decor-line--top"
          viewBox="0 0 900 100"
          preserveAspectRatio="xMinYMid meet"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            ref={decorTopRef}
            d="M 40 60 Q 190 10 340 60 T 640 55 T 880 50"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <svg
          className="decor-line decor-line--bottom"
          viewBox="0 0 900 100"
          preserveAspectRatio="xMaxYMid meet"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            ref={decorBottomRef}
            d="M 860 50 Q 710 100 560 50 T 260 55 T 20 60"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <header className="hero-nav" ref={navRef}>
        <button
          type="button"
          className="logo-home"
          ref={logoRef}
          onClick={() => setActiveSection(null)}
          aria-label="Torna alla home"
          style={{
            fontFamily: typography.titleFont,
            fontWeight: typography.titleWeight,
            letterSpacing: `${typography.titleTracking}em`,
            color: typography.titleColorCarla,
          }}
        >
          {LOGO.map((c, i) => (
            <span
              className="char"
              key={`l-${i}`}
              ref={(el) => (logoCharsRef.current[i] = el)}
            >
              {c === " " ? "\u00A0" : c}
            </span>
          ))}
        </button>
        <nav className="nav-links">
          {navItems.map(({ key, label }) => (
            <StaggerButton
              key={key}
              onClick={() => toggleSection(key)}
              className={activeSection === key ? "is-active" : ""}
              aria-pressed={activeSection === key}
            >
              {label}
            </StaggerButton>
          ))}
        </nav>
        <div className="nav-right">
          <button
            type="button"
            className="nav-cta"
            onClick={() => setActiveSection("contatti")}
            onPointerEnter={() => setNavCtaHover(true)}
            onPointerLeave={() => setNavCtaHover(false)}
          >
            <StaggerButton
              as="span"
              className="nav-cta-label"
              triggerSelector=".nav-cta"
            >
              Prenota un colloquio
            </StaggerButton>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
          <div className="nav-badge" ref={badgeRef}>
            Albo Psicologi Lombardia · n. 26906
          </div>
        </div>
      </header>

      <div
        className="hero-meta hero-meta--left"
        ref={metaLeftRef}
        style={{ left: `${meta.leftX}vw`, top: `${meta.leftY}vh` }}
      >
        <div className="meta-col">
          <span className="meta-label">Ricevo a</span>
          <span className="meta-val">Milano · Online</span>
        </div>
      </div>

      <div
        className="hero-meta hero-meta--right"
        ref={metaRightRef}
        style={{ left: `${meta.rightX}vw`, top: `${meta.rightY}vh` }}
      >
        <div className="meta-col">
          <span className="meta-label">Adatto per:</span>
          <span className="meta-val">Adolescenti</span>
          <span className="meta-val">Adulti</span>
          <span className="meta-val">Famiglie</span>
        </div>
      </div>

      <div
        className="letter carla"
        ref={carlaWordRef}
        style={{ ...titleStyle, color: typography.titleColorCarla }}
        aria-label="Carla"
      >
        {CARLA.map((c, i) => (
          <span
            className="char"
            key={`c-${i}`}
            ref={(el) => (carlaCharsRef.current[i] = el)}
          >
            {c}
          </span>
        ))}
      </div>

      <div
        className="letter piras"
        ref={pirasWordRef}
        style={{ ...titleStyle, color: typography.titleColorPiras }}
        aria-label="Piras"
      >
        {PIRAS.map((c, i) => (
          <span
            className="char"
            key={`p-${i}`}
            ref={(el) => (pirasCharsRef.current[i] = el)}
          >
            {c}
          </span>
        ))}
      </div>

      <figure className="photo" ref={photoRef} style={photoStyle}>
        <div className="photo-inner" ref={photoInnerRef}>
          <img
            ref={imgRef}
            src="/CarlaPiras.webp"
            alt="Dott.ssa Carla Piras"
            decoding="async"
            fetchPriority="high"
          />
        </div>
      </figure>

      <div className="percentage" ref={percRef}>00</div>

      <aside
        className="bio-panel"
        ref={(el) => (panelsRef.current["chi-sono"] = el)}
        aria-hidden={activeSection !== "chi-sono"}
      >
        <button type="button" className="bio-close" onClick={() => toggleSection("chi-sono")} aria-label="Chiudi">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
        <span className="bio-index">02 · Chi sono</span>
        <h2 className="bio-title">
          Uno spazio <em>d'ascolto,</em>
          <br />
          senza giudizio.
        </h2>
        <div className="bio-body">
          <p className="bio-lead">
            Sono <strong>Carla Piras</strong>, psicologa clinica e specializzanda
            in psicoterapia integrata, iscritta all'Albo degli Psicologi della
            Lombardia n. 26906.
          </p>
          <p>
            Ho maturato esperienza in contesti ospedalieri e territoriali, tra
            cui il Policlinico di Milano e l'Ospedale San Paolo, Centro per i
            Disturbi della Nutrizione e dell'Alimentazione in età evolutiva,
            accompagnando adolescenti, adulti e famiglie.
          </p>
          <p>
            Credo che ogni vissuto meriti ascolto, comprensione e uno spazio in
            cui potersi sentire accolti, senza giudizio.
          </p>
        </div>
        <div className="bio-sign">
          <span className="sign-line" />
          <span>Milano &amp; Online · Adolescenti · Adulti · Famiglie</span>
        </div>
      </aside>

      <aside
        className="bio-panel"
        ref={(el) => (panelsRef.current["come-lavoro"] = el)}
        aria-hidden={activeSection !== "come-lavoro"}
      >
        <button type="button" className="bio-close" onClick={() => toggleSection("come-lavoro")} aria-label="Chiudi">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
        <span className="bio-index">01 · Come lavoro</span>
        <h2 className="bio-title">
          Un percorso costruito <em>insieme,</em>
          <br />
          nel rispetto dei tuoi tempi.
        </h2>
        <ol className="bio-steps">
          <li>
            <span className="step-num">01</span>
            <div>
              <h3>Primo colloquio</h3>
              <p>
                Un momento di conoscenza reciproca in cui potrai raccontare ciò
                che ti ha portato a chiedere supporto.
              </p>
            </div>
          </li>
          <li>
            <span className="step-num">02</span>
            <div>
              <h3>Frequenza e durata</h3>
              <p>
                Sedute di circa 50 minuti, generalmente con cadenza settimanale,
                da definire insieme.
              </p>
            </div>
          </li>
          <li>
            <span className="step-num">03</span>
            <div>
              <h3>Modalità</h3>
              <p>
                Ricevo a Milano, in Via Cosimo del Fante e in Viale Famagosta, e
                online: scegli ciò che si adatta meglio alle tue esigenze.
              </p>
            </div>
          </li>
        </ol>
      </aside>

      <ContactModal
        open={activeSection === "contatti"}
        onClose={() => setActiveSection((cur) => (cur === "contatti" ? null : cur))}
      />

      <FlowerBurst active={ctaHover} count={36} />

      <div className="flower-field" aria-hidden="true">
        {FLOWERS.map((f, i) => (
          <Flower
            key={i}
            animate={preloadComplete}
            size={f.size}
            delay={f.delay}
            variant={f.variant}
            style={{ transform: `translateY(${f.offsetY}px)` }}
          />
        ))}
      </div>

      <div className="hero-foot" ref={footRef}>
        <div className="foot-left">
          <p className="tagline">
            Uno spazio{" "}
            <em>
              per ascoltare, comprendere,
              <br />e accogliere ciò che stai vivendo.
            </em>
          </p>
        </div>
        <button
          type="button"
          className="foot-cta"
          onClick={() => setActiveSection("contatti")}
          onPointerEnter={() => setFootCtaHover(true)}
          onPointerLeave={() => setFootCtaHover(false)}
        >
          <StaggerButton
            as="span"
            className="foot-cta-label"
            triggerSelector=".foot-cta"
          >
            Primo colloquio
          </StaggerButton>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </div>
  );
}

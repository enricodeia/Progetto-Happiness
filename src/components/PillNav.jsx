import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import './PillNav.css';

const PillNav = ({
  logo,
  logoAlt = 'Logo',
  items,
  activeItem,
  className = '',
  onItemClick,
  // Colors
  pillColor = '#ddd9c0',
  pillTextColor = '#2C2118',
  hoverCircleColor = '#FFDD00',
  hoverTextColor = '#2C2118',
  navBg = 'rgba(12, 12, 12, 0.6)',
  navStroke = 'rgba(255, 255, 255, 0.12)',
  // Motion
  enterDuration = 0.45,
  leaveDuration = 0.35,
  enterEase = 'power3.out',
  leaveEase = 'power3.inOut',
  circleScale = 1.2,
  labelShift = 1.0,
  logoSpinDuration = 0.35,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const pillsRef = useRef([]);
  const circlesRef = useRef([]);
  const labelsRef = useRef([]);
  const hoverLabelsRef = useRef([]);
  const pillDataRef = useRef([]); // cached height per pill
  const logoImgRef = useRef(null);
  const logoTweenRef = useRef(null);
  const hamburgerRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const navRef = useRef(null);
  const hasAnimated = useRef(false);

  // ─── Intro stagger animation ───
  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;
    const nav = navRef.current;
    if (!nav) return;

    const logoEl = nav.querySelector('.pill-logo');
    const navItems = nav.querySelector('.pill-nav-items');

    const targets = [logoEl, navItems].filter(Boolean);
    gsap.to(targets, {
      opacity: 1, y: 0,
      duration: 0.6,
      ease: 'power3.out',
      stagger: 0.12,
      delay: 0.1,
    });
  }, []);

  // ─── Measure + set initial circle geometry ───
  useEffect(() => {
    const measure = () => {
      pillsRef.current.forEach((pill, i) => {
        const circle = circlesRef.current[i];
        const label = labelsRef.current[i];
        const hoverLabel = hoverLabelsRef.current[i];
        if (!pill || !circle) return;

        const rect = pill.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;

        // Store height for hover calculations
        pillDataRef.current[i] = { h };

        // Size circle to fully cover the rounded pill
        const R = ((w * w) / 4 + h * h) / (2 * h);
        const D = Math.ceil(2 * R) + 2;
        const delta = Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1;

        Object.assign(circle.style, {
          width: `${D}px`,
          height: `${D}px`,
          bottom: `${-delta}px`,
        });
        gsap.set(circle, {
          xPercent: -50,
          scale: 0,
          transformOrigin: `50% ${D - delta}px`,
        });

        if (label) gsap.set(label, { y: 0 });
        if (hoverLabel) gsap.set(hoverLabel, { y: h + 20, opacity: 0 });
      });
    };

    measure();
    window.addEventListener('resize', measure);
    document.fonts?.ready?.then(measure).catch(() => {});
    return () => window.removeEventListener('resize', measure);
  }, [items]);

  // ─── Mobile menu init ───
  useEffect(() => {
    const m = mobileMenuRef.current;
    if (m) gsap.set(m, { autoAlpha: 0, y: 8 });
  }, []);

  // ─── ENTER: three independent gsap.to() calls ───
  const onEnter = (i) => {
    const circle = circlesRef.current[i];
    const label = labelsRef.current[i];
    const hoverLabel = hoverLabelsRef.current[i];
    const data = pillDataRef.current[i];
    if (!circle || !data) return;

    gsap.to(circle, {
      scale: circleScale,
      duration: enterDuration,
      ease: enterEase,
      overwrite: 'auto',
    });

    if (label) {
      gsap.to(label, {
        y: -(data.h * labelShift + 8),
        duration: enterDuration,
        ease: enterEase,
        overwrite: 'auto',
      });
    }

    if (hoverLabel) {
      gsap.to(hoverLabel, {
        y: 0,
        opacity: 1,
        duration: enterDuration,
        ease: enterEase,
        overwrite: 'auto',
      });
    }
  };

  // ─── LEAVE: three independent gsap.to() calls ───
  const onLeave = (i) => {
    const circle = circlesRef.current[i];
    const label = labelsRef.current[i];
    const hoverLabel = hoverLabelsRef.current[i];
    const data = pillDataRef.current[i];
    if (!circle || !data) return;

    gsap.to(circle, {
      scale: 0,
      duration: leaveDuration,
      ease: leaveEase,
      overwrite: 'auto',
    });

    if (label) {
      gsap.to(label, {
        y: 0,
        duration: leaveDuration,
        ease: leaveEase,
        overwrite: 'auto',
      });
    }

    if (hoverLabel) {
      gsap.to(hoverLabel, {
        y: data.h + 20,
        opacity: 0,
        duration: leaveDuration,
        ease: leaveEase,
        overwrite: 'auto',
      });
    }
  };

  // ─── Logo ───
  const onLogoEnter = () => {
    const img = logoImgRef.current;
    if (!img) return;
    logoTweenRef.current?.kill();
    logoTweenRef.current = gsap.fromTo(
      img, { rotate: 0 }, { rotate: 360, duration: logoSpinDuration, ease: enterEase }
    );
  };

  // ─── Mobile ───
  const toggleMobile = () => {
    const next = !mobileOpen;
    setMobileOpen(next);
    const lines = hamburgerRef.current?.querySelectorAll('.hamburger-line');
    const menu = mobileMenuRef.current;
    if (lines) {
      gsap.to(lines[0], { rotation: next ? 45 : 0, y: next ? 3 : 0, duration: 0.3, ease: enterEase });
      gsap.to(lines[1], { rotation: next ? -45 : 0, y: next ? -3 : 0, duration: 0.3, ease: enterEase });
    }
    if (menu) {
      gsap.to(menu, next
        ? { autoAlpha: 1, y: 0, duration: 0.3, ease: enterEase }
        : { autoAlpha: 0, y: 8, duration: 0.2, ease: leaveEase }
      );
    }
  };

  const vars = {
    '--pill-bg': pillColor,
    '--pill-text': pillTextColor,
    '--hover-circle': hoverCircleColor,
    '--hover-text': hoverTextColor,
    '--nav-bg': navBg,
    '--nav-stroke': navStroke,
  };

  return (
    <div className="pill-nav-container">
      <nav className={`pill-nav ${className}`} aria-label="Primary" style={vars} ref={navRef}>
        <a
          className="pill-logo"
          href="#"
          aria-label="Home"
          onMouseEnter={onLogoEnter}
          onClick={(e) => { e.preventDefault(); onItemClick?.('home'); }}
        >
          <img src={logo} alt={logoAlt} ref={logoImgRef} />
        </a>

        <div className="pill-nav-items desktop-only">
          <ul className="pill-list" role="menubar">
            {items.map((item, i) => (
              <li key={item.id} role="none">
                <button
                  role="menuitem"
                  className={`pill${activeItem === item.id ? ' is-active' : ''}`}
                  ref={(el) => { pillsRef.current[i] = el; }}
                  onPointerEnter={() => onEnter(i)}
                  onPointerLeave={() => onLeave(i)}
                  onClick={() => onItemClick?.(item.id)}
                >
                  <span className="hover-circle" ref={(el) => { circlesRef.current[i] = el; }} />
                  <span className="label-stack">
                    <span className="pill-label" ref={(el) => { labelsRef.current[i] = el; }}>{item.label}</span>
                    <span className="pill-label-hover" ref={(el) => { hoverLabelsRef.current[i] = el; }}>{item.label}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <button className="mobile-menu-button mobile-only" onClick={toggleMobile} ref={hamburgerRef}>
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>
      </nav>

      <div className="mobile-menu-popover mobile-only" ref={mobileMenuRef} style={vars}>
        <ul className="mobile-menu-list">
          {items.map((item) => (
            <li key={item.id}>
              <button
                className={`mobile-menu-link${activeItem === item.id ? ' is-active' : ''}`}
                onClick={() => { setMobileOpen(false); onItemClick?.(item.id); }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default PillNav;

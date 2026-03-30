import { useState, useEffect, useCallback, useRef } from 'react';
import { gsap } from 'gsap';
import { motion } from 'motion/react';
import HoverCard from './components/HoverCard.jsx';
import Preloader from './components/Preloader.jsx';
import Globe from './components/Globe.jsx';
// CountUp moved to About overlay
import Noise from './components/Noise.jsx';
import AboutOverlay from './components/AboutOverlay.jsx';
import PillNav from './components/PillNav.jsx';
import PanelCard from './components/PanelCard.jsx';
import Bacheca from './components/Bacheca.jsx';
import BubbleMenu from './components/BubbleMenu.jsx';
import ScrollPath from './components/ScrollPath.jsx';
import HeroTitle from './components/HeroTitle.jsx';
import { globeState } from './globe-scene.js';
import { episodes, happinessConcepts } from './data.js';

function LocalClock({ scrollPct = 0 }) {
  const [time, setTime] = useState('');
  const [zone, setZone] = useState('');
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setZone(tz.split('/').pop().replace(/_/g, ' '));
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  const op = scrollPct <= 15 ? 1 : scrollPct >= 25 ? 0 : 1 - (scrollPct - 15) / 10;
  return (
    <div className="local-clock" style={{ opacity: op }}>
      <span className="local-clock__zone">{zone}</span>
      <span className="local-clock__time">{time}</span>
    </div>
  );
}

function SidebarItem({ ep, isActive, onClick, index }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Use the scrollable list container as root so IntersectionObserver works inside overflow
    const root = el.closest('.sidebar__list');
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { root, threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.li
      ref={ref}
      className={`sidebar__item ${isActive ? 'sidebar__item--active' : ''}`}
      onClick={onClick}
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 12, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.02, ease: [0.33, 1, 0.68, 1] }}
    >
      <img className="sidebar__item-thumb" src={ep.thumb} alt="" loading="lazy" />
      <div className="sidebar__item-info">
        <span className="sidebar__item-title">{ep.title}</span>
        <span className="sidebar__item-loc">{ep.location}</span>
      </div>
    </motion.li>
  );
}

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [showUI, setShowUI] = useState(false);
  const [hoverCard, setHoverCard] = useState(null);
  const [countryName, setCountryName] = useState(null);
  const [countryPos, setCountryPos] = useState({ x: 0, y: 0 });
  const [panelData, setPanelData] = useState(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [activeEp, setActiveEp] = useState(null);
  const [activeNav, setActiveNav] = useState('globe');
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [bachecaOpen, setBachecaOpen] = useState(false);
  const [scrollPct, setScrollPct] = useState(0);
  const [navConfig] = useState({
    pillColor: '#ddd9c0',
    pillTextColor: '#2C2118',
    hoverCircleColor: '#FFDD00',
    hoverTextColor: '#2C2118',
    navBg: 'rgba(12, 12, 12, 0.6)',
    navStroke: 'rgba(255, 255, 255, 0.12)',
    enterDuration: 0.45,
    leaveDuration: 0.35,
    enterEase: 'power3.out',
    leaveEase: 'power3.inOut',
    circleScale: 1.2,
    labelShift: 1.0,
    logoSpinDuration: 0.65,
  });
  const [bubbleConfig, setBubbleConfig] = useState({
    duration: 0.5,
    stagger: 0.12,
    rotation: 8,
    gap: -20,
    ease: 'back.out(1.5)',
    menuBg: '#ffffff',
    menuContentColor: '#111111',
  });
  const [bubblePanelOpen, setBubblePanelOpen] = useState(false);
  const [sidebarConfig, setSidebarConfig] = useState({
    paddingTop: 14,
    paddingBottom: 14,
    paddingX: 16,
    fontSize: 20,
    badgeSize: 22,
    borderRadius: 24,
    bottom: 16,
    desktopBottom: 28,
    collapsedHeight: 160,
  });
  const [heroConfig, setHeroConfig] = useState({
    topY: 12,
    topYMobile: 21,
    bottomY: 60,
    topSize: 92,
    bottomSize: 41,
    curveWidth: 500,
    curveDepth: 285,
    topColor: '#F6E3D5',
    accentColor: '#FFDD00',
    bottomColor: '#F6E3D5',
    topOpacity: 1,
    bottomOpacity: 0.75,
  });
  const [smileConfig] = useState({
    fontSize: 52, width: 500, viewW: 620, curveDepth: 200, posY: 80,
    revealStart: 59, revealEnd: 69, fadeStart: 77, fadeEnd: 81,
    mFontSize: 38, mWidth: 300, mViewW: 470, mCurveDepth: 120, mPosY: 77,
  });

  const sidebarRef = useRef(null);
  const sidebarShown = useRef(false);
  const isMobile = () => window.innerWidth <= 768;

  const handlePreloaderComplete = useCallback(() => {
    setShowUI(true);
  }, []);

  useEffect(() => {
    const onHover = (e) => setHoverCard(e.detail);
    const onLeave = () => setHoverCard(null);
    const onDrag = () => { setHoverCard(null); setCountryName(null); };
    const onScroll = (e) => setScrollPct(e.detail.pct);
    const onCountry = (e) => { setCountryName(e.detail.name); setCountryPos({ x: e.detail.x, y: e.detail.y }); };
    const onClick = (e) => {
      openEpisodePanel(e.detail.marker);
    };
    window.addEventListener('globe:marker-hover', onHover);
    window.addEventListener('globe:marker-leave', onLeave);
    window.addEventListener('globe:drag', onDrag);
    window.addEventListener('globe:country-hover', onCountry);
    window.addEventListener('globe:marker-click', onClick);
    window.addEventListener('globe:scroll', onScroll);
    return () => {
      window.removeEventListener('globe:marker-hover', onHover);
      window.removeEventListener('globe:marker-leave', onLeave);
      window.removeEventListener('globe:drag', onDrag);
      window.removeEventListener('globe:country-hover', onCountry);
      window.removeEventListener('globe:marker-click', onClick);
      window.removeEventListener('globe:scroll', onScroll);
    };
  }, []);

  // Open episode: animate sidebar out on mobile, fly to pin offset upward
  // Show sidebar at 64% scroll
  useEffect(() => {
    const el = sidebarRef.current;
    if (!el || !showUI) return;

    if (scrollPct >= 64 && !sidebarShown.current) {
      sidebarShown.current = true;
      gsap.fromTo(el,
        { y: 100, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, ease: 'circ.out' }
      );
    } else if (scrollPct < 60 && sidebarShown.current) {
      sidebarShown.current = false;
      gsap.to(el, { y: 100, opacity: 0, duration: 0.4, ease: 'circ.in' });
    }
  }, [scrollPct, showUI]);

  const openEpisodePanel = useCallback((m) => {
    setPanelData(m);
    setActiveEp(m.data.id);
    setHoverCard(null);

    // Fly to marker — on mobile offset upward so card doesn't cover pin
    if (globeState.flyToMarker) {
      globeState.flyToMarker(m, isMobile() ? 0.25 : 0);
    }

    // Mobile: slide sidebar out to right
    if (isMobile() && sidebarRef.current) {
      gsap.to(sidebarRef.current, { x: '100vw', duration: 0.6, ease: 'circ.out', overwrite: true });
    }
  }, []);

  // Close episode panel: bring sidebar back on mobile
  const closeEpisodePanel = useCallback(() => {
    setPanelData(null);
    setActiveEp(null);

    if (isMobile() && sidebarRef.current) {
      gsap.to(sidebarRef.current, { x: 0, duration: 0.6, ease: 'circ.out', overwrite: true });
    }
  }, []);

  const selectEpisode = (ep) => {
    const m = globeState.markers.find((x) => x.data.id === ep.id);
    if (m) openEpisodePanel(m);
  };

  return (
    <>
      <Preloader onComplete={handlePreloaderComplete} />

      {/* PillNav — always on top */}
      {showUI && (
        <PillNav
          logo="/logo.webp"
          logoAlt="Progetto Happiness"
          items={[
            { id: 'bacheca', label: 'Bacheca' },
            { id: 'about', label: 'About' },
            { id: 'blog', label: 'Blog' },
          ]}
          activeItem={activeNav}
          pillColor={navConfig.pillColor}
          pillTextColor={navConfig.pillTextColor}
          hoverCircleColor={navConfig.hoverCircleColor}
          hoverTextColor={navConfig.hoverTextColor}
          navBg={navConfig.navBg}
          navStroke={navConfig.navStroke}
          enterDuration={navConfig.enterDuration}
          leaveDuration={navConfig.leaveDuration}
          enterEase={navConfig.enterEase}
          leaveEase={navConfig.leaveEase}
          circleScale={navConfig.circleScale}
          labelShift={navConfig.labelShift}
          logoSpinDuration={navConfig.logoSpinDuration}
          onItemClick={(id) => {
            if (id === 'home') { setAboutOpen(false); setBachecaOpen(false); setActiveNav('home'); return; }
            setActiveNav(id);
            if (id === 'bacheca') setBachecaOpen(true);
            else if (id === 'about') setAboutOpen(true);
            else if (id === 'blog') window.open('https://progettohappiness.com/episodi/', '_blank');
          }}
        />
      )}

      {/* BubbleMenu — toggle button + fullscreen pill overlay */}
      {showUI && (
        <BubbleMenu
          items={[
            { label: 'Bacheca', href: '#', ariaLabel: 'Bacheca', rotation: bubbleConfig.rotation, hoverStyles: { bgColor: '#FFDD00', textColor: '#2C2118' }, id: 'bacheca' },
            { label: 'About', href: '#', ariaLabel: 'About', rotation: -bubbleConfig.rotation, hoverStyles: { bgColor: '#F6E3D5', textColor: '#2C2118' }, id: 'about' },
            { label: 'Blog', href: '#', ariaLabel: 'Blog', rotation: bubbleConfig.rotation, hoverStyles: { bgColor: '#ef4444', textColor: '#ffffff' }, id: 'blog' },
          ]}
          menuAriaLabel="Toggle navigation"
          menuBg={bubbleConfig.menuBg}
          menuContentColor={bubbleConfig.menuContentColor}
          useFixedPosition={true}
          animationEase={bubbleConfig.ease}
          animationDuration={bubbleConfig.duration}
          staggerDelay={bubbleConfig.stagger}
          pillGap={bubbleConfig.gap}
          onItemClick={(item) => {
            const id = item.id;
            if (id === 'bacheca') setBachecaOpen(true);
            else if (id === 'about') setAboutOpen(true);
            else if (id === 'blog') window.open('https://progettohappiness.com/episodi/', '_blank');
          }}
        />
      )}

      {/* ---- Globe page (slides left when bacheca opens) ---- */}
      <div className={`page-wrapper ${bachecaOpen ? 'page-wrapper--slide-left' : ''}`}>
        <Globe />
        <Noise patternSize={200} patternAlpha={12} patternRefreshInterval={6} />
        {showUI && <LocalClock scrollPct={scrollPct} />}
        {showUI && <ScrollPath />}

        {/* Hero title over globe */}
        {showUI && (
          <HeroTitle config={heroConfig} smileConfig={smileConfig} />
        )}

        <aside
          ref={sidebarRef}
          className={`sidebar ${sidebarExpanded ? 'sidebar--expanded' : ''}`}
          style={{ '--sb-bottom-mobile': `${sidebarConfig.bottom}px`, '--sb-bottom-desktop': `${sidebarConfig.desktopBottom}px`, borderRadius: sidebarConfig.borderRadius, maxHeight: sidebarExpanded ? '55vh' : sidebarConfig.collapsedHeight }}
        >
          <div className="sidebar__header" onClick={() => setSidebarExpanded((p) => !p)}
            style={{ padding: `${sidebarConfig.paddingTop}px ${sidebarConfig.paddingX}px ${sidebarConfig.paddingBottom}px`, borderRadius: `${sidebarConfig.borderRadius}px ${sidebarConfig.borderRadius}px 0 0` }}
          >
            <div className="sidebar__title-group">
              <h3 className="sidebar__title" style={{ fontSize: sidebarConfig.fontSize }}>Episodi</h3>
              <span className="sidebar__badge" style={{ width: sidebarConfig.badgeSize, height: sidebarConfig.badgeSize }}>{episodes.length}</span>
            </div>
            <svg className={`sidebar__arrow ${sidebarExpanded ? 'sidebar__arrow--up' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 9l6 6 6-6"/></svg>
          </div>
          <div className="sidebar__scroll">
            <ul className="sidebar__list">
              {episodes.map((ep, i) => (
                <SidebarItem key={ep.id} ep={ep} index={i} isActive={activeEp === ep.id} onClick={() => selectEpisode(ep)} />
              ))}
            </ul>
            <div className="sidebar__gradient" />
          </div>
        </aside>

        {hoverCard && (
          <HoverCard data={hoverCard.data} type={hoverCard.type} x={hoverCard.x} y={hoverCard.y} />
        )}

        {countryName && (
          <div className="country-label" style={{ left: countryPos.x, top: countryPos.y - 28 }}>{countryName}</div>
        )}

        <PanelCard data={panelData} onClose={closeEpisodePanel} />

        {/* Scroll line indicator — bottom center */}
        <div className={`scroll-line ${showUI ? 'scroll-line--visible' : ''}`} style={{
          opacity: scrollPct <= 8 ? 1 : scrollPct >= 18 ? 0 : 1 - (scrollPct - 8) / 10,
        }}>
          {Array.from({ length: 15 }, (_, i) => (
            <div key={i} className="scroll-line__dash" />
          ))}
        </div>

        {/* Social icons — bottom right */}
        {showUI && (
          <div className="socials" style={{
            opacity: scrollPct <= 15 ? 1 : scrollPct >= 25 ? 0 : 1 - (scrollPct - 15) / 10,
          }}>
            {[
              { href: 'https://www.youtube.com/@ProgettoHappiness', icon: <path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 12a29 29 0 00.46 5.58 2.78 2.78 0 001.94 2C5.12 20 12 20 12 20s6.88 0 8.6-.46a2.78 2.78 0 001.94-2A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/> },
              { href: 'https://www.instagram.com/progettohappiness/', icon: <><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5"/></> },
              { href: 'https://www.facebook.com/progettohappiness', icon: <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/> },
              { href: 'https://www.linkedin.com/company/progettohappiness/', icon: <><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-7a6 6 0 016-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></> },
              { href: 'https://www.twitch.tv/progettohappiness', icon: <path d="M21 2H3v16h5v4l4-4h5l4-4V2zm-10 9V7m5 4V7"/> },
            ].map(({ href, icon }, i) => (
              <a key={i} href={href} target="_blank" rel="noopener" className="socials__icon"
                onPointerEnter={(e) => {
                  const circle = e.currentTarget.querySelector('.socials__circle');
                  if (circle) gsap.to(circle, { scale: 1, duration: 0.4, ease: 'circ.out', overwrite: true });
                  gsap.to(e.currentTarget.querySelector('svg'), { stroke: '#000', duration: 0.25, overwrite: true });
                }}
                onPointerLeave={(e) => {
                  const circle = e.currentTarget.querySelector('.socials__circle');
                  if (circle) gsap.to(circle, { scale: 0, duration: 0.4, ease: 'circ.out', overwrite: true });
                  gsap.to(e.currentTarget.querySelector('svg'), { stroke: 'currentColor', duration: 0.25, overwrite: true });
                }}
              >
                <span className="socials__circle" />
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  {icon}
                </svg>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* ---- Bacheca (slides in from right) ---- */}
      <Bacheca visible={bachecaOpen} onBack={() => setBachecaOpen(false)} />

      {/* About overlay */}
      <AboutOverlay visible={aboutOpen} onClose={() => { setAboutOpen(false); setActiveNav('globe'); }} />
    </>
  );
}

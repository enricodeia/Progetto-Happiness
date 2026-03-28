import { useState, useEffect, useCallback, useRef } from 'react';
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
// Control panels removed for production
import HeroTitle from './components/HeroTitle.jsx';
import { globeState } from './globe-scene.js';
import { episodes, happinessConcepts } from './data.js';

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
  const [heroConfig] = useState({
    topY: 13,
    bottomY: 65,
    topSize: 80,
    bottomSize: 41,
    curveWidth: 530,
    curveDepth: 245,
    topColor: '#ffffff',
    accentColor: '#FFDD00',
    bottomColor: '#ffffff',
    topOpacity: 1,
    bottomOpacity: 0.75,
  });

  const handlePreloaderComplete = useCallback(() => {
    setLoaded(true);
    setTimeout(() => setShowUI(true), 300);
  }, []);

  useEffect(() => {
    const onHover = (e) => setHoverCard(e.detail);
    const onLeave = () => setHoverCard(null);
    const onDrag = () => { setHoverCard(null); setCountryName(null); };
    const onScroll = (e) => setScrollPct(e.detail.pct);
    const onCountry = (e) => { setCountryName(e.detail.name); setCountryPos({ x: e.detail.x, y: e.detail.y }); };
    const onClick = (e) => {
      const m = e.detail.marker;
      setPanelData(m);
      setActiveEp(m.data.id);
      setHoverCard(null);
      if (globeState.flyToMarker) globeState.flyToMarker(m);
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

  const selectEpisode = (ep) => {
    const m = globeState.markers.find((x) => x.data.id === ep.id);
    if (m) {
      setPanelData(m);
      setActiveEp(ep.id);
      if (globeState.flyToMarker) globeState.flyToMarker(m);
    }
  };

  return (
    <>
      {!loaded && <Preloader onComplete={handlePreloaderComplete} />}

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

      {/* ---- Globe page (slides left when bacheca opens) ---- */}
      <div className={`page-wrapper ${bachecaOpen ? 'page-wrapper--slide-left' : ''}`}>
        <Globe />
        <Noise patternSize={200} patternAlpha={12} patternRefreshInterval={6} />

        {/* Hero title over globe */}
        {showUI && (
          <HeroTitle config={heroConfig} />
        )}

        <aside
          className={`sidebar ${showUI ? 'sidebar--visible' : ''} ${sidebarExpanded ? 'sidebar--expanded' : ''}`}
          onMouseEnter={() => setSidebarExpanded(true)}
          onMouseLeave={() => setSidebarExpanded(false)}
        >
          <div className="sidebar__header">
            <h3 className="sidebar__title">Episodi</h3>
            <span className="sidebar__badge">{episodes.length}</span>
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

        <PanelCard data={panelData} onClose={() => { setPanelData(null); setActiveEp(null); }} />

        <div className={`hint ${showUI ? 'hint--visible' : ''}`}>Scroll per esplorare il mondo</div>

        {/* Scroll % indicator — bottom right */}
        {showUI && (
          <div className="scroll-indicator">
            <span className="scroll-indicator__value">{scrollPct}%</span>
            <div className="scroll-indicator__bar">
              <div className="scroll-indicator__fill" style={{ width: `${scrollPct}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* ---- Bacheca (slides in from right) ---- */}
      <Bacheca visible={bachecaOpen} onBack={() => setBachecaOpen(false)} />

      {/* Stalk/Pin controls */}
      {/* Control panels removed for production */}

      {/* About overlay */}
      <AboutOverlay visible={aboutOpen} onClose={() => { setAboutOpen(false); setActiveNav('globe'); }} />
    </>
  );
}

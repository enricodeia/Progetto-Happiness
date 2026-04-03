import { forwardRef } from 'react';

const AboutOverlay = forwardRef(({ visible, onClose }, ref) => {
  if (!visible) return null;

  return (
    <div ref={ref} className="about" style={{ position: 'fixed', inset: 0, zIndex: 300, background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <button onClick={onClose} style={{ position: 'absolute', top: 24, right: 24, background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '50%', width: 40, height: 40, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-sans)', fontSize: 14 }}>Coming soon</p>
    </div>
  );
});

AboutOverlay.displayName = 'AboutOverlay';
export default AboutOverlay;

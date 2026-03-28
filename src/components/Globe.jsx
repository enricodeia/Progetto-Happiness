import { useEffect, useRef } from 'react';
import { initGlobe } from '../globe-scene.js';

const Globe = () => {
  const canvasRef = useRef(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || !canvasRef.current) return;
    initialized.current = true;
    initGlobe(canvasRef.current);
  }, []);

  return <canvas className="globe__canvas" ref={canvasRef} />;
};

export default Globe;

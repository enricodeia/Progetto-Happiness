import { useEffect, useRef } from 'react';
import './MapPreview.css';

const MapPreview = ({ imageData, label }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !imageData) return;
    const canvas = canvasRef.current;
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    canvas.getContext('2d').putImageData(imageData, 0, 0);
  }, [imageData]);

  return (
    <div className="map-preview">
      <div className="map-preview__label">{label}</div>
      <canvas ref={canvasRef} className="map-preview__canvas" />
    </div>
  );
};

export default MapPreview;

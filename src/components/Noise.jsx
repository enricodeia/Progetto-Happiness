const Noise = ({
  patternSize = 150,
  patternScaleX = 1,
  patternScaleY = 1,
  patternRefreshInterval = 4,
  patternAlpha = 15,
}) => {
  const patternId = 'noise-pattern';
  const filterId = 'noise-filter';

  return (
    <div
      className="noise"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
        mixBlendMode: 'overlay',
      }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
        <filter id={filterId}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="4"
            stitchTiles="stitch"
            seed={Math.random() * 100}
          >
            <animate
              attributeName="seed"
              from="0"
              to="100"
              dur={`${patternRefreshInterval}s`}
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <pattern
          id={patternId}
          width={patternSize}
          height={patternSize}
          patternUnits="userSpaceOnUse"
          patternTransform={`scale(${patternScaleX} ${patternScaleY})`}
        >
          <rect
            width={patternSize}
            height={patternSize}
            filter={`url(#${filterId})`}
            opacity={patternAlpha / 100}
          />
        </pattern>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    </div>
  );
};

export default Noise;

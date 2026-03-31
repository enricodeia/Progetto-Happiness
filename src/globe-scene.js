import * as THREE from 'three';
import { gsap } from 'gsap';
import { feature } from 'topojson-client';
import { latLngToECEF, EARTH_RADIUS } from './tiles-globe.js';
import { episodes, happinessConcepts } from './data.js';

export const globeState = {
  markers: [],
  flyToMarker: null,
  updateColors: null,
  updatePinStyle: null, // live pin style updates from panel
  // Stalk + pin config (live-tunable from control panel)
  stalkConfig: {
    stalkHeight: 1400000,
    pinSize: 150000,
    collapseStart: 0,
    collapseEnd: 90,
    stalkFadeStart: 85,
    stalkFadeEnd: 92,
    stalkOpacity: 0.90,
    stalkColor: '#FFDD00',
    pinBorderColor: '#FFDD00',
    lerpSpeed: 0.04,
  },
  pinStyle: {
    pinSize: 150000,
    hoverScale: 1.4,
    stickyRadius: 100,
    stickyStrength: 0.15,
    stickyMinScroll: 0,
  },
  liveConfig: null, // set by panel, read each frame
  zodiacConfig: {
    pointSize: 3.0,
    opacity: 0.8,
    glowSoftness: 0.3,   // 0 = hard dot, 1 = full glow
    twinkleAmount: 0.15,
    warmth: 0.92,         // blue channel (lower = warmer)
    radius: 50,           // multiplier of EARTH_RADIUS
  },
};

export function initGlobe(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 100, 1e9);
  camera.position.set(0, 0, EARTH_RADIUS * 7);
  camera.lookAt(0, 0, 0);

  // ── Lighting: ambient (night side) + directional (sun for day/night) ──
  const ambientLight = new THREE.AmbientLight(0x516270, 2.0);
  scene.add(ambientLight);
  const sunLight = new THREE.DirectionalLight(0xffffff, 3.1);
  scene.add(sunLight);

  function getSunPosition() {
    const now = new Date();
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 1)) / 86400000) + 1;
    const declination = 23.45 * Math.sin((2 * Math.PI / 365.25) * (dayOfYear - 81));
    const utcH = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
    return { lat: declination, lng: (12 - utcH) * 15 };
  }
  function updateSunLight() {
    const s = getSunPosition();
    sunLight.position.copy(latLngToECEF(s.lat, s.lng, EARTH_RADIUS * 3));
  }
  updateSunLight();

  // ── Stars: twinkling starfield ──
  const STAR_COUNT = 6000;
  const _sp = new Float32Array(STAR_COUNT * 3);
  const _so = new Float32Array(STAR_COUNT);
  for (let i = 0; i < STAR_COUNT; i++) {
    const r = EARTH_RADIUS * 40 + Math.random() * EARTH_RADIUS * 60;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    _sp[i*3] = r * Math.sin(ph) * Math.cos(th);
    _sp[i*3+1] = r * Math.sin(ph) * Math.sin(th);
    _sp[i*3+2] = r * Math.cos(ph);
    _so[i] = Math.random();
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(_sp, 3));
  starGeo.setAttribute('opacity', new THREE.BufferAttribute(_so, 1));
  const starMat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: `
      attribute float opacity;
      varying float vOpacity;
      void main() {
        vOpacity = opacity;
        gl_PointSize = 2.5;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      varying float vOpacity;
      void main() {
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;
        float twinkle = sin(time * vOpacity * 3.0 + vOpacity * 10.0) * 0.3 + 0.7;
        float alpha = (1.0 - dist * 2.0) * twinkle * vOpacity;
        gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
      }
    `,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  scene.add(new THREE.Points(starGeo, starMat));

  // ── Zodiac constellations: real star positions (RA/Dec → 3D) ──
  // Each entry: [RA in decimal hours, Dec in degrees]
  const zodiacStars = [
    // Aries
    [2.12, 23.5], [1.91, 20.8], [1.89, 19.3],
    // Taurus
    [4.60, 16.5], [5.44, 28.6], [3.79, 24.1], [5.63, 21.1],
    // Gemini
    [7.58, 31.9], [7.76, 28.0], [6.63, 16.4], [6.73, 25.1],
    // Cancer
    [8.97, 11.9], [8.28, 9.2], [8.72, 21.5], [8.74, 18.2],
    // Leo
    [10.14, 12.0], [11.82, 14.6], [10.33, 19.8], [11.24, 20.5],
    // Virgo
    [13.42, -11.2], [11.85, 1.8], [12.69, -1.4], [13.04, 10.9],
    // Libra
    [14.85, -16.0], [15.28, -9.4], [15.07, -25.3],
    // Scorpio
    [16.49, -26.4], [17.56, -37.1], [17.62, -43.0], [16.01, -22.6], [16.84, -34.3],
    // Sagittarius
    [18.40, -34.4], [18.92, -26.3], [19.04, -29.9], [18.35, -29.8], [18.47, -25.4],
    // Capricorn
    [21.78, -16.1], [20.35, -14.8], [20.30, -12.5], [21.67, -16.7],
    // Aquarius
    [21.53, -5.6], [22.10, -0.3], [22.91, -15.8], [22.88, -7.6],
    // Pisces
    [1.52, 15.3], [2.03, 2.8], [23.07, 3.8], [23.29, 3.3],
  ];

  const ZODIAC_RADIUS = EARTH_RADIUS * 50;
  const zPos = new Float32Array(zodiacStars.length * 3);
  const zOpa = new Float32Array(zodiacStars.length);

  zodiacStars.forEach(([ra, dec], i) => {
    const theta = (ra / 24) * Math.PI * 2;        // RA → angle
    const phi = ((90 - dec) * Math.PI) / 180;      // Dec → polar
    zPos[i * 3]     = ZODIAC_RADIUS * Math.sin(phi) * Math.cos(theta);
    zPos[i * 3 + 1] = ZODIAC_RADIUS * Math.cos(phi);
    zPos[i * 3 + 2] = ZODIAC_RADIUS * Math.sin(phi) * Math.sin(theta);
    zOpa[i] = 0.7 + Math.random() * 0.3; // bright stars
  });

  const zGeo = new THREE.BufferGeometry();
  zGeo.setAttribute('position', new THREE.BufferAttribute(zPos, 3));
  zGeo.setAttribute('opacity', new THREE.BufferAttribute(zOpa, 1));
  const zCfg = globeState.zodiacConfig;
  const zMat = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      uSize: { value: zCfg.pointSize },
      uOpacity: { value: zCfg.opacity },
      uGlow: { value: zCfg.glowSoftness },
      uTwinkle: { value: zCfg.twinkleAmount },
      uWarmth: { value: zCfg.warmth },
    },
    vertexShader: `
      attribute float opacity;
      varying float vOpacity;
      uniform float uSize;
      void main() {
        vOpacity = opacity;
        gl_PointSize = uSize;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform float uOpacity;
      uniform float uGlow;
      uniform float uTwinkle;
      uniform float uWarmth;
      varying float vOpacity;
      void main() {
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;
        float twinkle = sin(time * vOpacity * 2.0 + vOpacity * 8.0) * uTwinkle + (1.0 - uTwinkle);
        // Mix between hard dot and soft glow
        float hard = step(dist, 0.2) * 0.8 + (1.0 - smoothstep(0.2, 0.5, dist)) * 0.2;
        float soft = smoothstep(0.5, 0.0, dist);
        float shape = mix(hard, soft, uGlow);
        float alpha = shape * twinkle * vOpacity * uOpacity;
        gl_FragColor = vec4(1.0, 0.98, uWarmth, alpha);
      }
    `,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  scene.add(new THREE.Points(zGeo, zMat));

  // ── Atmosphere glow ──
  const atmosMat = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      void main() {
        float intensity = pow(0.55 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
        gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
      }
    `,
    blending: THREE.AdditiveBlending, side: THREE.BackSide,
    transparent: true, depthWrite: false,
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS * 1.12, 64, 32), atmosMat));

  // Globe sphere — standard Three.js SphereGeometry with correct UV mapping
  // Rotated to align with our ECEF frame swap (geoX→Z, geoY→X, geoZ→Y)
  //
  // Three.js SphereGeometry: Y-up, phi goes from top (0) to bottom (pi)
  //   UV: u = theta / 2pi, v = phi / pi (standard equirectangular)
  //   At phi=0 (Y=1): north pole. theta=0: positive Z axis.
  //
  // Our ECEF: lat 0, lng 0 maps to (geoY=X, geoZ=Y, geoX=Z) = (0, 0, R)
  //   So lng=0 is at Three.js +Z. Three.js sphere also has theta=0 at +Z.
  //   But we need to rotate 90 degrees around Y because our frame swap
  //   puts geoY (east) on X axis, which shifts longitude by 90 degrees.
  // Inner opaque sphere — blocks backside dots, always visible
  const innerSphereMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS * 0.995, 64, 64), innerSphereMat));

  // Outer textured sphere — Phong for day/night lighting, depthWrite false so dots stay on top
  const sphereMat = new THREE.MeshPhongMaterial({
    color: 0xffffff, transparent: true, opacity: 1, depthWrite: false, shininess: 27,
  });

  const sphereGeo = new THREE.SphereGeometry(EARTH_RADIUS * 0.997, 128, 128);
  const globeMesh = new THREE.Mesh(sphereGeo, sphereMat);
  globeMesh.rotation.y = -Math.PI / 2;
  globeMesh.renderOrder = 0;
  scene.add(globeMesh);

  // ---- Cloud layer (real texture, additive blending for black bg) ----
  const cloudGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.003, 64, 64);
  const cloudMat = new THREE.MeshBasicMaterial({
    transparent: true, opacity: 0.75, depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
  cloudMesh.rotation.y = -Math.PI / 2;
  scene.add(cloudMesh);

  // Load cloud texture
  new THREE.TextureLoader().load('/clouds.webp', (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    cloudMat.map = tex;
    cloudMat.needsUpdate = true;
  });

  // Hit sphere for raycasting
  const hitMesh = new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS, 48, 48), new THREE.MeshBasicMaterial({ visible: false }));
  scene.add(hitMesh);

  let markers = [];
  let clickableDots = [];
  let countryFeatures = null;
  let highlightGroup = null;
  let highlightedCountry = null;
  let stalks = [];

  // Async load
  (async () => {
    let topo110, topo50;
    try {
      const [r1, r2] = await Promise.all([
        fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'),
        fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json'),
      ]);
      topo110 = await r1.json();
      topo50 = await r2.json();
    } catch (e) { return; }

    const features110 = feature(topo110, topo110.objects.countries).features;
    const features50 = feature(topo50, topo50.objects.countries).features;
    countryFeatures = features110;

    // Land mask
    const mc = document.createElement('canvas');
    mc.width = 720; mc.height = 360;
    const ctx = mc.getContext('2d');
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 720, 360);
    ctx.fillStyle = '#fff';
    features50.forEach((f) => {
      const { type, coordinates } = f.geometry;
      const draw = (ring) => { if (ring.length < 3) return; ctx.beginPath(); ring.forEach(([lng, lat], i) => { i === 0 ? ctx.moveTo((lng + 180) * 2, (90 - lat) * 2) : ctx.lineTo((lng + 180) * 2, (90 - lat) * 2); }); ctx.closePath(); ctx.fill(); };
      if (type === 'Polygon') coordinates.forEach(draw);
      else if (type === 'MultiPolygon') coordinates.forEach((p) => p.forEach(draw));
    });

    // ---- Generate dot target positions ----
    const DOT_N = 35000;
    const gr = (1 + Math.sqrt(5)) / 2;
    const targetArr = [];

    for (let i = 0; i < DOT_N; i++) {
      const th = 2 * Math.PI * i / gr;
      const ph = Math.acos(1 - 2 * (i + 0.5) / DOT_N);
      const lat = 90 - (ph * 180) / Math.PI;
      const lng = ((th * 180) / Math.PI) % 360 - 180;
      const px = ctx.getImageData(Math.max(0, Math.min(719, Math.round((lng + 180) * 2))), Math.max(0, Math.min(359, Math.round((90 - lat) * 2))), 1, 1).data;
      if (px[0] > 128) {
        const p = latLngToECEF(lat, lng, 3000);
        targetArr.push(p.x, p.y, p.z);
      }
    }

    // Create round dot texture (circle instead of square)
    const dotTexCanvas = document.createElement('canvas');
    dotTexCanvas.width = 64; dotTexCanvas.height = 64;
    const dtx = dotTexCanvas.getContext('2d');
    dtx.beginPath();
    dtx.arc(32, 32, 30, 0, Math.PI * 2);
    dtx.fillStyle = '#FDF4ED';
    dtx.fill();
    const dotTexture = new THREE.CanvasTexture(dotTexCanvas);

    // Place dots
    const dotGeoFinal = new THREE.BufferGeometry();
    dotGeoFinal.setAttribute('position', new THREE.Float32BufferAttribute(targetArr, 3));
    const dotMat = new THREE.PointsMaterial({
      color: 0xFDF4ED, size: 15000, transparent: true, opacity: 0.45,
      depthWrite: false, depthTest: true, sizeAttenuation: true,
      map: dotTexture, alphaMap: dotTexture,
    });
    const dotPoints = new THREE.Points(dotGeoFinal, dotMat);
    dotPoints.renderOrder = 2; // render on top of textured sphere
    scene.add(dotPoints);

    // ---- Country borders (outline only, no fill) ----
    const borderMat = new THREE.LineBasicMaterial({ color: 0xFFDD00, transparent: true, opacity: 0.11, depthWrite: false });
    const borderGroup = new THREE.Group();
    features110.forEach((f) => {
      const { type, coordinates } = f.geometry;
      const drawRing = (ring) => { if (ring.length < 3) return; const step = ring.length > 80 ? 2 : 1; const pts = []; for (let i = 0; i < ring.length; i += step) pts.push(latLngToECEF(ring[i][1], ring[i][0], 2500)); if (pts.length > 1) borderGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), borderMat.clone())); };
      if (type === 'Polygon') coordinates.forEach(drawRing);
      else if (type === 'MultiPolygon') coordinates.forEach((p) => p.forEach(drawRing));
    });
    scene.add(borderGroup);

    highlightGroup = new THREE.Group();
    scene.add(highlightGroup);

    // ---- Yellow dot texture for pins ----
    const pinDotCanvas = document.createElement('canvas');
    pinDotCanvas.width = 64; pinDotCanvas.height = 64;
    const pdc = pinDotCanvas.getContext('2d');
    pdc.beginPath(); pdc.arc(32, 32, 30, 0, Math.PI * 2);
    pdc.fillStyle = '#ffffff';
    pdc.fill();
    const pinDotTex = new THREE.CanvasTexture(pinDotCanvas);

    // ---- Active pin indicator: static ring + pulse ring ----
    // Thin ring with soft glow
    const makeRingTex = (size, radius, lineW, glowW) => {
      const c = document.createElement('canvas');
      c.width = size; c.height = size;
      const ctx = c.getContext('2d');
      const cx = size / 2;
      // Outer glow
      if (glowW > 0) {
        ctx.beginPath(); ctx.arc(cx, cx, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = lineW + glowW;
        ctx.stroke();
      }
      // Core ring
      ctx.beginPath(); ctx.arc(cx, cx, radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = lineW;
      ctx.stroke();
      return new THREE.CanvasTexture(c);
    };

    // Static ring (always visible when pin selected)
    const staticRingTex = makeRingTex(128, 52, 1.5, 6);
    const staticRingMat = new THREE.SpriteMaterial({
      map: staticRingTex, color: 0xFFDD00, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true,
    });
    const staticRing = new THREE.Sprite(staticRingMat);
    staticRing.renderOrder = 5;
    staticRing.visible = false;
    scene.add(staticRing);

    // Pulse ring (expands + fades in loop)
    const pulseRingTex = makeRingTex(128, 54, 1, 0);
    const pulseRingMat = new THREE.SpriteMaterial({
      map: pulseRingTex, color: 0xFFDD00, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true,
    });
    const pulseRing = new THREE.Sprite(pulseRingMat);
    pulseRing.renderOrder = 5;
    pulseRing.visible = false;
    scene.add(pulseRing);

    let activePin = null;
    let pulseTween = null;
    let staticFadeTween = null;
    globeState._activePin = null;
    globeState._staticRing = staticRing;
    globeState._pulseRing = pulseRing;

    globeState.setActivePin = (marker) => {
      if (marker === activePin) return;
      activePin = marker;
      globeState._activePin = marker;
      pulseTween?.kill();
      staticFadeTween?.kill();

      if (!marker) {
        // Fade out
        staticFadeTween = gsap.to(staticRingMat, {
          opacity: 0, duration: 0.3, ease: 'power2.in',
          onComplete: () => { staticRing.visible = false; }
        });
        pulseRing.visible = false;
        pulseRingMat.opacity = 0;
        return;
      }

      const baseScale = marker.dot.scale.x * 1.8;

      // Position both rings
      staticRing.position.copy(marker.dot.position);
      pulseRing.position.copy(marker.dot.position);

      // Static ring: fade in, stays
      staticRing.visible = true;
      staticRing.scale.setScalar(baseScale);
      staticFadeTween = gsap.to(staticRingMat, { opacity: 0.7, duration: 0.4, ease: 'power2.out' });

      // Pulse ring: expand + fade loop
      pulseRing.visible = true;
      const runPulse = () => {
        pulseRing.scale.setScalar(baseScale);
        pulseRingMat.opacity = 0.5;
        pulseTween = gsap.to({ s: baseScale, o: 0.5 }, {
          s: baseScale * 3, o: 0, duration: 1.8, ease: 'power1.out',
          onUpdate() {
            pulseRing.scale.setScalar(this.targets()[0].s);
            pulseRingMat.opacity = this.targets()[0].o;
          },
          onComplete: runPulse,
        });
      };
      runPulse();
    };

    globeState.clearActivePin = () => {
      activePin = null;
      globeState._activePin = null;
      pulseTween?.kill();
      staticFadeTween?.kill();
      // Fade out both
      gsap.to(staticRingMat, { opacity: 0, duration: 0.3, ease: 'power2.in', onComplete: () => { staticRing.visible = false; } });
      gsap.to(pulseRingMat, { opacity: 0, duration: 0.2, ease: 'power2.in', onComplete: () => { pulseRing.visible = false; } });
    };

    // ---- Stalks + Pin markers (episodes) ----
    const stalkGroup = new THREE.Group();
    const initCfg = globeState.stalkConfig;
    const STALK_SEGMENTS = 12; // segments for gradient
    const stalkColor = new THREE.Color(initCfg.stalkColor);
    stalks = [];

    episodes.forEach((ep) => {
      const dir = latLngToECEF(ep.lat, ep.lng, 0).normalize();
      const baseAlt = EARTH_RADIUS + 3000;

      // Multi-segment stalk with vertex colors for gradient
      const positions = new Float32Array(STALK_SEGMENTS * 3);
      const colors = new Float32Array(STALK_SEGMENTS * 3);
      for (let j = 0; j < STALK_SEGMENTS; j++) {
        const t = j / (STALK_SEGMENTS - 1); // 0 = base, 1 = tip
        const alt = baseAlt + initCfg.stalkHeight * t;
        const p = dir.clone().multiplyScalar(alt);
        positions[j * 3] = p.x;
        positions[j * 3 + 1] = p.y;
        positions[j * 3 + 2] = p.z;
        // Gradient: 10% brightness at base, 100% at tip
        const brightness = 0.1 + 0.9 * t;
        colors[j * 3] = stalkColor.r * brightness;
        colors[j * 3 + 1] = stalkColor.g * brightness;
        colors[j * 3 + 2] = stalkColor.b * brightness;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const mat = new THREE.LineBasicMaterial({
        vertexColors: true, transparent: true, opacity: initCfg.stalkOpacity, depthWrite: false,
      });
      const line = new THREE.Line(geo, mat);
      line.renderOrder = 3;
      stalkGroup.add(line);

      // Tip position = last segment
      const tipPos = dir.clone().multiplyScalar(baseAlt + initCfg.stalkHeight);

      // Pin sprite — solid yellow dot
      const pinMat = new THREE.SpriteMaterial({
        map: pinDotTex, color: 0xFFDD00, transparent: true, opacity: 1, depthWrite: false, sizeAttenuation: true,
      });
      const pin = new THREE.Sprite(pinMat);
      pin.scale.setScalar(initCfg.pinSize);
      pin.position.copy(tipPos);
      pin.renderOrder = 4;
      pin.userData = { type: 'episode', data: ep, baseScale: 1, hoverRingScale: 0 };
      scene.add(pin);

      markers.push({ dot: pin, type: 'episode', data: ep });
      stalks.push({ line, dir, heightPct: 1, pin, baseAlt });
    });
    scene.add(stalkGroup);

    // ---- Concept markers (unchanged, small dots on surface) ----
    happinessConcepts.forEach((c, i) => {
      const pos = latLngToECEF(c.lat, c.lng, 10000);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(10000, 10, 10), new THREE.MeshBasicMaterial({ color: 0xF6E3D5, transparent: true, opacity: 0.6, depthWrite: false }));
      dot.position.copy(pos);
      dot.renderOrder = 3;
      dot.userData = { type: 'concept', data: { ...c, id: 100 + i }, baseScale: 1, hoverRingScale: 0 };
      scene.add(dot);
      dot.userData.basePosition = pos.clone();
      markers.push({ dot, type: 'concept', data: { ...c, id: 100 + i } });
    });
    clickableDots = markers.map((m) => m.dot);
    globeState.markers = markers;

    // Earth texture (8k daymap) — enabled by default
    let earthTexture = null;
    new THREE.TextureLoader().load('/earth-8k.webp', (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      earthTexture = tex;
      // Apply immediately
      sphereMat.map = tex;
      sphereMat.color.set('#ffffff');
      sphereMat.needsUpdate = true;
    });

    // Live config update from panel — applies immediately
    globeState.updateColors = (c) => {
      globeState.liveConfig = c;
      scene.background.set(c.bg || '#000000');
      innerSphereMat.color.set(c.sphereColor || '#080808');
      dotMat.color.set(c.dotColor || '#FDF4ED');
      dotMat.opacity = c.dotOpacity ?? 0.45;
      dotMat.size = c.dotSize ?? 20000;
      borderGroup.children.forEach((line) => {
        line.material.color.set(c.borderColor || '#FFDD00');
        line.material.opacity = c.borderOpacity ?? 0.06;
      });
      // Pin style
      Object.assign(globeState.pinStyle, {
        pinSize: c.pinSize ?? 150000,
        pinColor: c.pinColor || null,
        hoverScale: c.hoverScale ?? 1.4,
        stickyRadius: c.stickyRadius ?? 100,
        stickyStrength: c.stickyStrength ?? 0.15,
        stickyMinScroll: c.stickyMinScroll ?? 0,
      });
      // Stalk
      globeState.stalkConfig.stalkColor = c.stalkColor || '#FFDD00';
      globeState.stalkConfig.stalkOpacity = c.stalkOpacity ?? 0.5;
      // Cloud
      cloudMat.opacity = c.cloudOpacity ?? 0.4;
    };

    // Live pin style update — redraws all pin textures
    globeState.updatePinStyle = (newStyle) => {
      Object.assign(globeState.pinStyle, newStyle);
      markers.forEach((m) => {
        if (m.type === 'episode' && m.dot.material.map?.userData?.redraw) {
          m.dot.material.map.userData.redraw();
        }
      });
    };

    // Earth appearance controls
    globeState.updateEarth = (c) => {
      ambientLight.intensity = c.ambientIntensity ?? 2.0;
      ambientLight.color.set(c.ambientColor || '#516270');
      sunLight.intensity = c.sunIntensity ?? 3.1;
      sunLight.color.set(c.sunColor || '#ffffff');
      sphereMat.shininess = c.shininess ?? 42;
      sphereMat.emissive.set(c.emissive || '#000000');
      sphereMat.emissiveIntensity = c.emissiveIntensity ?? 0;
      innerSphereMat.color.set(c.shadowColor || '#000000');
      cloudMat.opacity = c.cloudOpacity ?? 0.75;
    };
  })();

  // ---- State ----
  let isDragging = false, dragDist = 0, prevX = 0, prevY = 0;
  let rotX = 0, rotY = 0, targetRotX = 0, targetRotY = 0;
  let autoRotate = true, autoTimer = null;
  let camDist = EARTH_RADIUS * 7, targetCamDist = EARTH_RADIUS * 7;
  let hoveringPin = false;
  let rotSpeed = 0.00006; // start at target speed immediately
  let targetRotSpeed = 0.00006;

  // No expansion trigger needed

  // ---- Zoom constants (needed by fly/scroll) ----
  const ZOOM_MIN = EARTH_RADIUS * 1.15;
  const ZOOM_MAX = EARTH_RADIUS * 7;
  const SCROLL_LIMIT = 90;
  const ZOOM_SCROLL_CAP = ZOOM_MAX - (SCROLL_LIMIT / 100) * (ZOOM_MAX - ZOOM_MIN);
  let pinZoomActive = false;

  // ---- Fly to marker ----
  // Set zoom by scroll percentage (0=far, 100=close) — animated
  let zoomTween = null;
  globeState.setZoomPct = (pct) => {
    const p = Math.max(0, Math.min(100, pct)) / 100;
    const ZOOM_MIN_L = EARTH_RADIUS * 1.15;
    const ZOOM_MAX_L = EARTH_RADIUS * 7;
    const dest = ZOOM_MAX_L - p * (ZOOM_MAX_L - ZOOM_MIN_L);
    if (pct > SCROLL_LIMIT) pinZoomActive = true;
    autoRotate = false; clearTimeout(autoTimer);
    autoTimer = setTimeout(() => { autoRotate = true; }, 8000);
    zoomTween?.kill();
    zoomTween = gsap.to({ v: targetCamDist }, {
      v: dest, duration: 1, ease: 'circ.inOut',
      onUpdate() { targetCamDist = this.targets()[0].v; },
    });
  };

  // ---- Fly animation state ----
  let flyActive = false; // when true, GSAP controls camDist/rot directly (bypasses lerp)
  let flyZoomTween = null;
  let flyRotTweenX = null;
  let flyRotTweenY = null;
  const PIN_ZOOM_PCT = 97;
  const PIN_ZOOM_DIST = ZOOM_MAX - (PIN_ZOOM_PCT / 100) * (ZOOM_MAX - ZOOM_MIN);

  // Zoom back to scroll limit (90%) — called when panel closes
  let returnTween = null;
  globeState.returnToScrollLimit = () => {
    flyActive = true;
    zoomVelocity = 0;
    flyZoomTween?.kill(); returnTween?.kill();
    returnTween = gsap.to({ v: camDist }, {
      v: ZOOM_SCROLL_CAP, duration: 1, ease: 'circ.inOut',
      onUpdate() { camDist = targetCamDist = this.targets()[0].v; },
      onComplete() { pinZoomActive = false; flyActive = false; },
    });
  };

  globeState.flyToMarker = (marker, verticalOffset = 0) => {
    const d = marker.data;
    const pos = latLngToECEF(d.lat, d.lng, 0).normalize();
    const destRotY = Math.atan2(pos.x, pos.z);
    const destRotX = Math.asin(Math.max(-0.99, Math.min(0.99, pos.y))) - verticalOffset;

    pinZoomActive = true;
    flyActive = true;
    zoomVelocity = 0; // kill any manual scroll momentum
    autoRotate = false; clearTimeout(autoTimer);
    autoTimer = setTimeout(() => { autoRotate = true; }, 10000);

    // Kill previous tweens (including return-to-90% if switching pins)
    returnTween?.kill(); flyZoomTween?.kill(); flyRotTweenX?.kill(); flyRotTweenY?.kill();

    // Animate rotation — GSAP writes rotX/rotY/targetRotX/targetRotY directly
    flyRotTweenX = gsap.to({ v: rotX }, {
      v: destRotX, duration: 1.2, ease: 'circ.out',
      onUpdate() { rotX = targetRotX = this.targets()[0].v; },
    });
    flyRotTweenY = gsap.to({ v: rotY }, {
      v: destRotY, duration: 1.2, ease: 'circ.out',
      onUpdate() { rotY = targetRotY = this.targets()[0].v; },
    });

    // Zoom — only if not already at pin level (switching pins keeps zoom)
    const alreadyClose = Math.abs(camDist - PIN_ZOOM_DIST) < EARTH_RADIUS * 0.3;
    if (!alreadyClose) {
      flyZoomTween = gsap.to({ v: camDist }, {
        v: PIN_ZOOM_DIST, duration: 1.2, ease: 'circ.out',
        onUpdate() { camDist = targetCamDist = this.targets()[0].v; },
        onComplete() { flyActive = false; },
      });
    } else {
      flyActive = false;
    }
  };

  function isFrontFacing(worldPos) {
    return camera.position.clone().normalize().dot(worldPos.clone().normalize()) > 0.05;
  }

  // ---- Pointer ----
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let hoveredMarker = null;

  const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  canvas.addEventListener('pointerdown', (e) => {
    isDragging = true; dragDist = 0; prevX = e.clientX; prevY = e.clientY;
    autoRotate = false; clearTimeout(autoTimer);
    canvas.style.cursor = 'grabbing';
  });

  window.addEventListener('pointermove', (e) => {
    if (!isDragging && e.target !== canvas) return;

    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    if (isDragging) {
      const dx = e.clientX - prevX, dy = e.clientY - prevY;
      dragDist += Math.abs(dx) + Math.abs(dy);

      // Zoom-dependent drag sensitivity: slower when zoomed in
      const zoomRatio = camDist / (EARTH_RADIUS * 7); // 1.0 far, ~0.16 close
      const sens = 0.3 + zoomRatio * 0.7; // range: 0.3 (close) → 1.0 (far)

      if (isMobile && (Math.abs(dx) > 0.3 || Math.abs(dy) > 0.3)) {
        // Angle-aware: always rotate both axes, blend in zoom for vertical gestures
        const angle = Math.atan2(Math.abs(dy), Math.abs(dx)) * 180 / Math.PI;
        // Rotation: full strength horizontal, reduced for pure vertical
        const rotWeight = Math.min(1, 1 - Math.max(0, angle - 50) / 40); // 1 at 0-50°, fades to 0 at 90°
        const zoomWeight = Math.max(0, (angle - 40) / 50); // 0 at 0-40°, ramps to 1 at 90°
        targetRotY -= dx * 0.004 * sens;
        targetRotX += dy * 0.002 * sens * rotWeight;
        targetRotX = Math.max(-1.2, Math.min(1.2, targetRotX));
        if (!pinZoomActive) {
          zoomVelocity -= dy * 0.0003 * zoomWeight;
        } else if (zoomWeight > 0.3 && dy > 0) {
          window.dispatchEvent(new CustomEvent('globe:empty-click'));
        }
      } else {
        // Desktop: drag rotates both axes, scaled by zoom
        targetRotY -= dx * 0.003 * sens;
        targetRotX += dy * 0.002 * sens;
        targetRotX = Math.max(-1.2, Math.min(1.2, targetRotX));
      }

      prevX = e.clientX; prevY = e.clientY;
      window.dispatchEvent(new CustomEvent('globe:drag'));
      return;
    }

    if (clickableDots.length === 0) return;
    raycaster.setFromCamera(mouse, camera);

    let closestDist = Infinity, closestMarker = null;
    const scrV = new THREE.Vector3();
    markers.forEach((m) => {
      if (!m.dot.visible || !isFrontFacing(m.dot.position)) return;
      scrV.copy(m.dot.position).project(camera);
      if (scrV.z > 1) return;
      const sx = (scrV.x * 0.5 + 0.5) * window.innerWidth;
      const sy = (-scrV.y * 0.5 + 0.5) * window.innerHeight;
      const dist = Math.hypot(e.clientX - sx, e.clientY - sy);
      if (dist < closestDist) { closestDist = dist; closestMarker = m; }
    });

    if (closestMarker && closestDist < 60) {
      if (hoveredMarker !== closestMarker.dot) {
        if (hoveredMarker) { hoveredMarker.userData.hoverRingScale = 0; }
        hoveredMarker = closestMarker.dot;
        canvas.style.cursor = 'pointer';
      }
      hoveringPin = true;
      targetRotSpeed = 0;
      const t = 1 - closestDist / 60;
      hoveredMarker.userData.hoverRingScale = t;
      window.dispatchEvent(new CustomEvent('globe:marker-hover', { detail: { data: closestMarker.data, type: closestMarker.type, x: e.clientX, y: e.clientY } }));
      clearCountryHL();
    } else {
      if (hoveredMarker) { hoveredMarker.userData.hoverRingScale = 0; hoveredMarker = null; }
      if (hoveringPin) { hoveringPin = false; targetRotSpeed = 0.00006; } // resume
      canvas.style.cursor = '';
      window.dispatchEvent(new CustomEvent('globe:marker-leave'));

      // Country hover (outline only)
      if (countryFeatures) {
        const hits = raycaster.intersectObject(hitMesh);
        if (hits.length > 0) {
          const hp = hits[0].point.clone();
          const gX = hp.z, gY = hp.x, gZ = hp.y;
          const r = Math.sqrt(gX * gX + gY * gY + gZ * gZ);
          const lat = Math.asin(gZ / r) * 180 / Math.PI;
          const lng = Math.atan2(gY, gX) * 180 / Math.PI;

          let found = null;
          for (const f of countryFeatures) {
            const { type, coordinates: coords } = f.geometry;
            const pip = (la, lo, ring) => { let ins = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1]; if (((yi > la) !== (yj > la)) && (lo < (xj - xi) * (la - yi) / (yj - yi) + xi)) ins = !ins; } return ins; };
            if (type === 'Polygon' && pip(lat, lng, coords[0])) { found = f; break; }
            if (type === 'MultiPolygon' && coords.some((p) => pip(lat, lng, p[0]))) { found = f; break; }
          }

          if (found && found !== highlightedCountry) { highlightedCountry = found; drawHL(found); }
          else if (!found) { clearCountryHL(); }
          window.dispatchEvent(new CustomEvent('globe:country-hover', { detail: { name: found?.properties?.name || null, x: e.clientX, y: e.clientY } }));
        } else {
          clearCountryHL();
          window.dispatchEvent(new CustomEvent('globe:country-hover', { detail: { name: null } }));
        }
      }
    }
  });

  window.addEventListener('pointerup', () => {
    isDragging = false;
    canvas.style.cursor = hoveredMarker ? 'pointer' : '';
    autoTimer = setTimeout(() => { autoRotate = true; }, 4000);
  });

  window.addEventListener('click', (e) => {
    if (dragDist > 5) return;
    if (e.target.closest('.sidebar, .panel, .filters, .hover-card, .pill-nav, .bubble-menu')) return;

    // On desktop, use hoveredMarker. On mobile, detect nearest pin at click point.
    if (hoveredMarker) {
      const m = markers.find((x) => x.dot === hoveredMarker);
      if (m) window.dispatchEvent(new CustomEvent('globe:marker-click', { detail: { marker: m } }));
      return;
    }

    // Direct tap detection (mobile + desktop fallback)
    if (clickableDots.length === 0) {
      window.dispatchEvent(new CustomEvent('globe:empty-click'));
      return;
    }
    const clickX = (e.clientX / window.innerWidth) * 2 - 1;
    const clickY = -(e.clientY / window.innerHeight) * 2 + 1;
    const scrV = new THREE.Vector3();
    let closestDist = Infinity, closestMarker = null;
    markers.forEach((m) => {
      if (!m.dot.visible || !isFrontFacing(m.dot.position)) return;
      scrV.copy(m.dot.position).project(camera);
      if (scrV.z > 1) return;
      const sx = (scrV.x * 0.5 + 0.5) * window.innerWidth;
      const sy = (-scrV.y * 0.5 + 0.5) * window.innerHeight;
      const dist = Math.hypot(e.clientX - sx, e.clientY - sy);
      if (dist < closestDist) { closestDist = dist; closestMarker = m; }
    });
    // Larger tap target on mobile (80px vs 60px for hover)
    if (closestMarker && closestDist < 80) {
      window.dispatchEvent(new CustomEvent('globe:marker-click', { detail: { marker: closestMarker } }));
    } else {
      // Clicked empty space — tell UI to close any open panel
      window.dispatchEvent(new CustomEvent('globe:empty-click'));
    }
  });

  // Smooth zoom with accumulated velocity (like Lenis)
  let zoomVelocity = 0;
  canvas.addEventListener('wheel', (e) => {
    const delta = e.deltaY * 0.00015;
    if (pinZoomActive) {
      if (delta > 0) window.dispatchEvent(new CustomEvent('globe:empty-click'));
      return; // block all zoom when card open
    }
    zoomVelocity += delta;
  }, { passive: true });

  // Touch: pinch to zoom, single finger to rotate
  let lastTouchDist = 0;
  let touchCount = 0;

  canvas.addEventListener('touchstart', (e) => {
    touchCount = e.touches.length;
    if (touchCount === 2) {
      // Pinch start: don't rotate
      isDragging = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist = Math.sqrt(dx * dx + dy * dy);
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
      // Pinch zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const delta = lastTouchDist - dist;
      if (pinZoomActive) {
        if (delta > 0) window.dispatchEvent(new CustomEvent('globe:empty-click'));
        lastTouchDist = dist;
        return; // block all zoom when card open
      }
      zoomVelocity += delta * 0.0003;
      lastTouchDist = dist;
    }
  }, { passive: true });

  canvas.addEventListener('touchend', () => {
    touchCount = 0;
  }, { passive: true });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ---- Country highlight: OUTLINE ONLY (no fill texture) ----
  function drawHL(feat) {
    clearHL();
    if (!highlightGroup) return;
    const outlineMat = new THREE.LineBasicMaterial({ color: 0xFFDD00, transparent: true, opacity: 0.4, depthWrite: false });
    const { type, coordinates } = feat.geometry;
    const drawRing = (ring) => { if (ring.length < 3) return; const pts = ring.map(([lo, la]) => latLngToECEF(la, lo, 3000)); if (pts.length > 1) highlightGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), outlineMat.clone())); };
    if (type === 'Polygon') coordinates.forEach(drawRing);
    else if (type === 'MultiPolygon') coordinates.forEach((p) => p.forEach(drawRing));
  }

  function clearHL() {
    if (!highlightGroup) return;
    while (highlightGroup.children.length > 0) { const ch = highlightGroup.children[0]; ch.geometry?.dispose(); ch.material?.dispose(); highlightGroup.remove(ch); }
  }

  function clearCountryHL() {
    highlightedCountry = null;
    clearHL();
  }

  // ---- Scroll percentage tracker ----
  let scrollPct = 0; // 0 = zoomed out (far), 100 = zoomed in (close)

  // Dispatch scroll % for UI
  function updateScrollPct() {
    scrollPct = (1 - (camDist - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN)) * 100;
    scrollPct = Math.max(0, Math.min(100, scrollPct));
    window.dispatchEvent(new CustomEvent('globe:scroll', { detail: { pct: scrollPct } }));
  }

  // ---- Render loop ----
  // Texture fade state (GSAP-driven)
  let texFadeActive = false;
  let texFadeDir = 'none';
  let gsapTexTween = null;
  const texState = { opacity: 1 };

  // Cloud fade state (separate trigger)
  let cloudFadeActive = false;
  let gsapCloudTween = null;
  const cloudState = { opacity: 0.4 };

  let animTime = 0;
  function animate() {
    requestAnimationFrame(animate);
    animTime += 0.016;

    // Stars twinkle + zodiac + sun position
    starMat.uniforms.time.value = animTime;
    zMat.uniforms.time.value = animTime;
    const zc = globeState.zodiacConfig;
    zMat.uniforms.uSize.value = zc.pointSize;
    zMat.uniforms.uOpacity.value = zc.opacity;
    zMat.uniforms.uGlow.value = zc.glowSoftness;
    zMat.uniforms.uTwinkle.value = zc.twinkleAmount;
    zMat.uniforms.uWarmth.value = zc.warmth;
    updateSunLight();

    // Smooth rotation speed (ease on pause/resume)
    rotSpeed += (targetRotSpeed - rotSpeed) * 0.04;
    if (autoRotate) targetRotY += rotSpeed;

    // Rotation lerp (skipped when GSAP fly is active)
    if (!flyActive) {
      rotX += (targetRotX - rotX) * 0.12;
      rotY += (targetRotY - rotY) * 0.12;
    }

    // Zoom (skipped when GSAP fly is active — GSAP writes camDist directly)
    if (!flyActive) {
      targetCamDist *= 1 - zoomVelocity;
      const zoomFloor = pinZoomActive ? EARTH_RADIUS * 1.15 : ZOOM_SCROLL_CAP;
      targetCamDist = Math.max(zoomFloor, Math.min(EARTH_RADIUS * 7, targetCamDist));
      if (pinZoomActive && zoomVelocity > 0 && targetCamDist >= ZOOM_SCROLL_CAP) pinZoomActive = false;
      zoomVelocity *= 0.85;
      if (Math.abs(zoomVelocity) < 0.000001) zoomVelocity = 0;
      camDist += (targetCamDist - camDist) * 0.06;
    }

    // Clouds drift very slightly relative to globe surface
    cloudMesh.rotation.y += 0.000008;
    globeMesh.rotation.y = -Math.PI / 2;

    camera.position.x = camDist * Math.sin(rotY) * Math.cos(rotX);
    camera.position.y = camDist * Math.sin(rotX);
    camera.position.z = camDist * Math.cos(rotY) * Math.cos(rotX);
    camera.lookAt(0, 0, 0);

    // Update scroll percentage
    updateScrollPct();

    // Keep ring sprite on active pin position
    if (globeState._activePin) {
      const pinPos = globeState._activePin.dot.position;
      if (globeState._staticRing?.visible) globeState._staticRing.position.copy(pinPos);
      if (globeState._pulseRing?.visible) globeState._pulseRing.position.copy(pinPos);
    }

    // ---- Texture fade: GSAP at scroll trigger ----
    const lc = globeState.liveConfig;
    const texTrigger = lc?.texFadeStart ?? 96;
    const texTarget = lc?.texFadeEnd ?? 0.3;
    if (sphereMat.map) {
      if (scrollPct >= texTrigger && !texFadeActive) {
        texFadeActive = true;
        gsapTexTween?.kill();
        gsapTexTween = gsap.to(texState, {
          opacity: texTarget, duration: 1.3, ease: 'cubic.out',
          onUpdate: () => { sphereMat.opacity = texState.opacity; },
        });
      } else if (scrollPct < texTrigger && texFadeActive) {
        texFadeActive = false;
        gsapTexTween?.kill();
        gsapTexTween = gsap.to(texState, {
          opacity: 1, duration: 0.8, ease: 'cubic.out',
          onUpdate: () => { sphereMat.opacity = texState.opacity; },
        });
      }
    }

    // ---- Cloud fade: GSAP at 68% scroll (1% before "What Makes You Happy?" max) ----
    if (scrollPct >= 68 && !cloudFadeActive) {
      cloudFadeActive = true;
      gsapCloudTween?.kill();
      gsapCloudTween = gsap.to(cloudState, {
        opacity: 0, duration: 1.2, ease: 'cubic.out',
        onUpdate: () => { cloudMat.opacity = cloudState.opacity; },
      });
    } else if (scrollPct < 68 && cloudFadeActive) {
      cloudFadeActive = false;
      gsapCloudTween?.kill();
      gsapCloudTween = gsap.to(cloudState, {
        opacity: 0.4, duration: 1.2, ease: 'cubic.out',
        onUpdate: () => { cloudMat.opacity = cloudState.opacity; },
      });
    }

    // ---- Stalks + pins: scroll-driven collapse with smoothstep ----
    const camDir = camera.position.clone().normalize();
    const zoomFactor = camDist / EARTH_RADIUS;
    const cfg = globeState.stalkConfig;

    if (stalks.length > 0) {
      // Smoothstep for better motion feel
      const smoothstep = (x) => x * x * (3 - 2 * x);

      // Height: 1 at collapseStart, 0 at collapseEnd (eased)
      const collapseRange = Math.max(1, cfg.collapseEnd - cfg.collapseStart);
      const rawT = Math.min(1, Math.max(0, (scrollPct - cfg.collapseStart) / collapseRange));
      const heightTarget = 1 - smoothstep(rawT);

      // Stalk fade: full until stalkFadeStart, 0 at stalkFadeEnd
      const fadeRange = Math.max(1, cfg.stalkFadeEnd - cfg.stalkFadeStart);
      const rawFade = Math.min(1, Math.max(0, (scrollPct - cfg.stalkFadeStart) / fadeRange));
      const stalkAlphaTarget = 1 - smoothstep(rawFade);

      const stalkColor = new THREE.Color(cfg.stalkColor || '#FFDD00');

      stalks.forEach((s) => {
        // Adaptive lerp: faster when far from target, slower near
        const delta = heightTarget - s.heightPct;
        const adaptiveSpeed = cfg.lerpSpeed * (1 + Math.abs(delta) * 2);
        s.heightPct += delta * Math.min(adaptiveSpeed, 0.12);
        if (Math.abs(delta) < 0.0005) s.heightPct = heightTarget;

        // Update multi-segment stalk geometry + gradient colors
        const posAttr = s.line.geometry.getAttribute('position');
        const colAttr = s.line.geometry.getAttribute('color');
        const segCount = posAttr.count;
        const h = cfg.stalkHeight * s.heightPct;

        for (let j = 0; j < segCount; j++) {
          const t = j / (segCount - 1);
          const alt = s.baseAlt + h * t;
          const p = s.dir.clone().multiplyScalar(alt);
          posAttr.setXYZ(j, p.x, p.y, p.z);
          // Gradient: 10% at base, 100% at tip
          const brightness = 0.1 + 0.9 * t;
          colAttr.setXYZ(j, stalkColor.r * brightness, stalkColor.g * brightness, stalkColor.b * brightness);
        }
        posAttr.needsUpdate = true;
        colAttr.needsUpdate = true;

        // Pin rides stalk tip (last segment position)
        const tipIdx = segCount - 1;
        const tipX = posAttr.getX(tipIdx), tipY = posAttr.getY(tipIdx), tipZ = posAttr.getZ(tipIdx);
        if (s.pin) {
          s.pin.position.set(tipX, tipY, tipZ);
          // scale is handled in the marker loop below (zoom-aware)
        }

        // Backside culling
        const facing = camDir.dot(s.dir);
        const front = facing > 0.05 ? Math.min(1, (facing - 0.05) * 5) : 0;

        // Stalk fade
        s.line.material.opacity = cfg.stalkOpacity * front * stalkAlphaTarget;
        s.line.visible = stalkAlphaTarget > 0.001;

        // Pin always visible when front-facing
        if (s.pin) s.pin.material.opacity = front;
      });
    }

    const ps = globeState.pinStyle;
    const pSize = ps.pinSize || cfg.pinSize;
    const pinZoomScale = zoomFactor / 7;
    const stickyV = new THREE.Vector3();

    markers.forEach((m) => {
      const hoverT = m.dot.userData.hoverRingScale || 0;
      const hoverBoost = 1 + hoverT * ((ps.hoverScale || 1.4) - 1);
      m.dot.scale.setScalar(pSize * pinZoomScale * hoverBoost);

      // Pin color (episode pins tinted, concept markers stay cream)
      if (m.type === 'episode' && ps.pinColor) {
        m.dot.material.color.set(ps.pinColor);
      }

      // Back-side culling
      const markerDir = m.dot.position.clone().normalize();
      const facing = camDir.dot(markerDir);
      const frontOpacity = facing > 0.05 ? Math.min(1, (facing - 0.05) * 5) : 0;
      const baseOp = m.type === 'episode' ? 1 : 0.6;
      m.dot.material.opacity = baseOp * frontOpacity;

      // Sticky: pin drifts toward cursor when nearby
      const sRadius = ps.stickyRadius || 100;
      const sStrength = ps.stickyStrength || 0.15;
      const sMin = ps.stickyMinScroll ?? 0;
      if (!isDragging && frontOpacity > 0.1 && scrollPct >= sMin && m.type === 'episode') {
        stickyV.copy(m.dot.position).project(camera);
        if (stickyV.z < 1) {
          const sx = (stickyV.x * 0.5 + 0.5) * window.innerWidth;
          const sy = (-stickyV.y * 0.5 + 0.5) * window.innerHeight;
          const dist = Math.hypot(mouse.x * window.innerWidth / 2 + window.innerWidth / 2 - sx,
                                  -mouse.y * window.innerHeight / 2 + window.innerHeight / 2 - sy);
          if (dist < sRadius && dist > 1) {
            const t = (1 - dist / sRadius) * sStrength;
            const ndcOffX = ((mouse.x * window.innerWidth / 2 + window.innerWidth / 2 - sx) * t / window.innerWidth) * 2;
            const ndcOffY = (-(- mouse.y * window.innerHeight / 2 + window.innerHeight / 2 - sy) * t / window.innerHeight) * 2;
            const pullTarget = new THREE.Vector3(stickyV.x + ndcOffX, stickyV.y + ndcOffY, stickyV.z).unproject(camera);
            pullTarget.normalize().multiplyScalar(m.dot.position.length());
            m.dot.position.lerp(pullTarget, 0.12);
          }
        }
      }
    });

    renderer.render(scene, camera);
  }
  animate();
}

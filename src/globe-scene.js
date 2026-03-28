import * as THREE from 'three';
import { feature } from 'topojson-client';
import { latLngToECEF, EARTH_RADIUS } from './tiles-globe.js';
import { episodes, happinessConcepts } from './data.js';

export const globeState = {
  markers: [],
  flyToMarker: null,
  updateColors: null,
  // Stalk + pin config (live-tunable from control panel)
  stalkConfig: {
    stalkHeight: 1400000,
    pinSize: 150000,
    collapseStart: 0,
    collapseEnd: 90,
    stalkFadeStart: 85,
    stalkFadeEnd: 92,
    stalkOpacity: 0.5,
    stalkColor: '#FFDD00',
    pinBorderColor: '#FFDD00',
    lerpSpeed: 0.04,
  },
};

export function initGlobe(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030303);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 100, 1e9);
  camera.position.set(0, 0, EARTH_RADIUS * 7);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));

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
  const innerSphereMat = new THREE.MeshBasicMaterial({ color: 0x080808 });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS * 0.995, 64, 64), innerSphereMat));

  // Outer textured sphere — depthWrite false so dots stay visible on top
  const sphereMat = new THREE.MeshBasicMaterial({
    color: 0x080808, transparent: true, opacity: 1, depthWrite: false,
  });
  const sphereGeo = new THREE.SphereGeometry(EARTH_RADIUS * 0.997, 96, 96);
  const globeMesh = new THREE.Mesh(sphereGeo, sphereMat);
  globeMesh.rotation.y = -Math.PI / 2;
  globeMesh.renderOrder = 0;
  scene.add(globeMesh);

  // ---- Cloud layer (real texture, additive blending for black bg) ----
  const cloudGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.003, 64, 64);
  const cloudMat = new THREE.MeshBasicMaterial({
    transparent: true, opacity: 0.4, depthWrite: false,
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

  // Stars
  const starGeo = new THREE.BufferGeometry();
  const sp = new Float32Array(400 * 3);
  for (let i = 0; i < 400; i++) {
    const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(4e8);
    sp[i * 3] = v.x; sp[i * 3 + 1] = v.y; sp[i * 3 + 2] = v.z;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0xffffff, size: 600000, transparent: true, opacity: 0.2, depthWrite: false, sizeAttenuation: true,
  })));

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
    dtx.fillStyle = '#ffffff';
    dtx.fill();
    const dotTexture = new THREE.CanvasTexture(dotTexCanvas);

    // Place dots
    const dotGeoFinal = new THREE.BufferGeometry();
    dotGeoFinal.setAttribute('position', new THREE.Float32BufferAttribute(targetArr, 3));
    const dotMat = new THREE.PointsMaterial({
      color: 0xffffff, size: 20000, transparent: true, opacity: 0.45,
      depthWrite: false, depthTest: true, sizeAttenuation: true,
      map: dotTexture, alphaMap: dotTexture,
    });
    const dotPoints = new THREE.Points(dotGeoFinal, dotMat);
    dotPoints.renderOrder = 2; // render on top of textured sphere
    scene.add(dotPoints);

    // ---- Country borders (outline only, no fill) ----
    const borderMat = new THREE.LineBasicMaterial({ color: 0xFFDD00, transparent: true, opacity: 0.06, depthWrite: false });
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

    // ---- Helper: create circular thumbnail texture with yellow border ----
    const PIN_SIZE = 48; // canvas px
    const BORDER_W = 3;  // px (renders as ~1.5px at retina)
    const createPinTexture = (imgUrl) => {
      const canvas2d = document.createElement('canvas');
      canvas2d.width = PIN_SIZE * 2;
      canvas2d.height = PIN_SIZE * 2;
      const c = canvas2d.getContext('2d');
      const r = PIN_SIZE; // radius
      const tex = new THREE.CanvasTexture(canvas2d);
      tex.colorSpace = THREE.SRGBColorSpace;

      // Draw yellow circle border immediately (visible while thumb loads)
      c.beginPath(); c.arc(r, r, r, 0, Math.PI * 2);
      c.fillStyle = '#FFDD00'; c.fill();
      c.beginPath(); c.arc(r, r, r - BORDER_W, 0, Math.PI * 2);
      c.fillStyle = '#222'; c.fill();
      tex.needsUpdate = true;

      // Load thumbnail async
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Redraw border
        c.clearRect(0, 0, PIN_SIZE * 2, PIN_SIZE * 2);
        c.beginPath(); c.arc(r, r, r, 0, Math.PI * 2);
        c.fillStyle = '#FFDD00'; c.fill();

        // Clip to inner circle and draw centered/cover thumbnail
        c.save();
        c.beginPath(); c.arc(r, r, r - BORDER_W, 0, Math.PI * 2); c.clip();
        const aspect = img.width / img.height;
        let sw, sh, sx, sy;
        if (aspect > 1) { sh = img.height; sw = sh; sx = (img.width - sw) / 2; sy = 0; }
        else { sw = img.width; sh = sw; sx = 0; sy = (img.height - sh) / 2; }
        c.drawImage(img, sx, sy, sw, sh, BORDER_W, BORDER_W, (r - BORDER_W) * 2, (r - BORDER_W) * 2);
        c.restore();
        tex.needsUpdate = true;
      };
      img.src = imgUrl;
      return tex;
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

      // Pin sprite at stalk tip
      const pinTex = createPinTexture(ep.thumb);
      const pinMat = new THREE.SpriteMaterial({
        map: pinTex, transparent: true, opacity: 1, depthWrite: false, sizeAttenuation: true,
      });
      const pin = new THREE.Sprite(pinMat);
      pin.scale.setScalar(initCfg.pinSize);
      pin.position.copy(tipPos);
      pin.renderOrder = 4;
      pin.userData = { type: 'episode', data: ep, baseScale: 1, hoverRingScale: 0 };
      scene.add(pin);

      // Hover ring (attached to pin)
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(22000, 23500, 32),
        new THREE.MeshBasicMaterial({ color: 0xFFDD00, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
      );
      ring.position.copy(tipPos);
      ring.lookAt(0, 0, 0);
      ring.renderOrder = 4;
      scene.add(ring);

      markers.push({ dot: pin, ring, type: 'episode', data: ep });
      stalks.push({ line, dir, heightPct: 1, pin, ring, baseAlt });
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

    // Control panel update
    globeState.updateColors = (c) => {
      scene.background.set(c.bg);
      sphereMat.color.set(c.sphereColor);
      dotMat.color.set(c.dotColor);
      dotMat.opacity = c.dotOpacity;
      dotMat.size = c.dotSize || 20000;
      borderGroup.children.forEach((line) => { line.material.color.set(c.borderColor); line.material.opacity = c.borderOpacity; });
      markers.forEach((m) => {
        if (m.type === 'episode') {
          m.dot.material.color.set(c.markerColor);
          const s = (c.pinSize || 29000) / 29000;
          m.dot.userData.baseScale = s;
        }
      });
      // Earth texture toggle
      if (c.showTexture && earthTexture) {
        sphereMat.map = earthTexture;
        sphereMat.color.set('#ffffff');
        sphereMat.opacity = c.textureOpacity ?? 1;
        sphereMat.transparent = c.textureOpacity < 1;
        // Texture offset/rotation to align with TopoJSON dots
        earthTexture.offset.x = (c.textureOffsetX ?? 0);
        earthTexture.offset.y = (c.textureOffsetY ?? 0);
        earthTexture.repeat.set(c.textureScale ?? 1, c.textureScale ?? 1);
        earthTexture.rotation = (c.textureRotation ?? 0) * Math.PI / 180;
        earthTexture.center.set(0.5, 0.5);
      } else {
        sphereMat.map = null;
        sphereMat.color.set(c.sphereColor);
        sphereMat.opacity = 1;
        sphereMat.transparent = false;
      }
      sphereMat.needsUpdate = true;
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

  // ---- Fly to marker ----
  globeState.flyToMarker = (marker) => {
    const d = marker.data;
    const pos = latLngToECEF(d.lat, d.lng, 0).normalize();
    targetRotY = Math.atan2(pos.x, pos.z);
    targetRotX = Math.asin(Math.max(-0.99, Math.min(0.99, pos.y)));
    targetCamDist = EARTH_RADIUS * 2.2;
    autoRotate = false; clearTimeout(autoTimer);
    autoTimer = setTimeout(() => { autoRotate = true; }, 10000);
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

      if (isMobile && (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5)) {
        const angle = Math.atan2(Math.abs(dy), Math.abs(dx)) * 180 / Math.PI;
        if (angle >= 65) {
          zoomVelocity += dy * 0.0003;
        } else if (angle <= 25) {
          targetRotY -= dx * 0.004;
          targetRotX += dy * 0.001;
          targetRotX = Math.max(-1.2, Math.min(1.2, targetRotX));
        } else {
          const rotateWeight = 1 - (angle - 25) / 40;
          const zoomWeight = (angle - 25) / 40;
          targetRotY -= dx * 0.004 * rotateWeight;
          targetRotX += dy * 0.001 * rotateWeight;
          targetRotX = Math.max(-1.2, Math.min(1.2, targetRotX));
          zoomVelocity += dy * 0.0003 * zoomWeight;
        }
      } else {
        targetRotY -= dx * 0.003;
        targetRotX += dy * 0.002;
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
        if (hoveredMarker) { hoveredMarker.userData.baseScale = 1; hoveredMarker.userData.hoverRingScale = 0; }
        hoveredMarker = closestMarker.dot;
        canvas.style.cursor = 'pointer';
      }
      hoveringPin = true; // pause rotation
      targetRotSpeed = 0;
      const t = 1 - closestDist / 60;
      hoveredMarker.userData.baseScale = 1 + t * 0.8;
      hoveredMarker.userData.hoverRingScale = t;
      window.dispatchEvent(new CustomEvent('globe:marker-hover', { detail: { data: closestMarker.data, type: closestMarker.type, x: e.clientX, y: e.clientY } }));
      clearCountryHL();
    } else {
      if (hoveredMarker) { hoveredMarker.userData.baseScale = 1; hoveredMarker.userData.hoverRingScale = 0; hoveredMarker = null; }
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
    if (e.target.closest('.sidebar, .panel, .filters, .hover-card')) return;
    if (hoveredMarker) {
      const m = markers.find((x) => x.dot === hoveredMarker);
      if (m) window.dispatchEvent(new CustomEvent('globe:marker-click', { detail: { marker: m } }));
    }
  });

  // Smooth zoom with accumulated velocity (like Lenis)
  let zoomVelocity = 0;
  canvas.addEventListener('wheel', (e) => {
    zoomVelocity += e.deltaY * 0.00015;
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
  // Zoom range: EARTH_RADIUS * 1.15 (closest, 100%) to EARTH_RADIUS * 7 (farthest, 0%)
  const ZOOM_MIN = EARTH_RADIUS * 1.15;
  const ZOOM_MAX = EARTH_RADIUS * 7;
  let scrollPct = 0; // 0 = zoomed out (far), 100 = zoomed in (close)

  // Dispatch scroll % for UI
  function updateScrollPct() {
    scrollPct = Math.round((1 - (camDist - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN)) * 100);
    scrollPct = Math.max(0, Math.min(100, scrollPct));
    window.dispatchEvent(new CustomEvent('globe:scroll', { detail: { pct: scrollPct } }));
  }

  // ---- Render loop ----
  function animate() {
    requestAnimationFrame(animate);

    // Smooth rotation speed (ease on pause/resume)
    rotSpeed += (targetRotSpeed - rotSpeed) * 0.04;
    if (autoRotate) targetRotY += rotSpeed;

    // More responsive, less momentum
    rotX += (targetRotX - rotX) * 0.12;
    rotY += (targetRotY - rotY) * 0.12;

    // Smooth zoom: apply velocity with friction (no jitter)
    targetCamDist *= 1 - zoomVelocity;
    targetCamDist = Math.max(EARTH_RADIUS * 1.15, Math.min(EARTH_RADIUS * 7, targetCamDist));
    zoomVelocity *= 0.85; // friction decay
    if (Math.abs(zoomVelocity) < 0.000001) zoomVelocity = 0;
    camDist += (targetCamDist - camDist) * 0.06;

    // Clouds drift very slightly relative to globe surface
    cloudMesh.rotation.y += 0.000008;
    globeMesh.rotation.y = -Math.PI / 2;

    camera.position.x = camDist * Math.sin(rotY) * Math.cos(rotX);
    camera.position.y = camDist * Math.sin(rotX);
    camera.position.z = camDist * Math.cos(rotY) * Math.cos(rotX);
    camera.lookAt(0, 0, 0);

    // Update scroll percentage
    updateScrollPct();

    // ---- Texture opacity based on scroll ----
    // 0-85%: texture at 100%
    // 85-93%: ease in-out from 1 to 0.15
    // 93-100%: texture at 0.15
    // Texture + clouds fade: 0-75% full, 75-90% ease to 0.15, 90%+ at 0.15
    if (sphereMat.map) {
      let texOpacity;
      if (scrollPct <= 75) {
        texOpacity = 1;
      } else if (scrollPct <= 90) {
        const t = (scrollPct - 75) / 15;
        const eased = t * t * (3 - 2 * t);
        texOpacity = 1 - eased * 0.85;
      } else {
        texOpacity = 0.15;
      }
      sphereMat.opacity = texOpacity;
      // Clouds fade together with texture
      cloudMat.opacity = texOpacity * 0.4;
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
          s.pin.scale.setScalar(cfg.pinSize);
        }
        if (s.ring) s.ring.position.set(tipX, tipY, tipZ);

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

    markers.forEach((m) => {
      // Scale lerp
      const ts = m.dot.userData.baseScale || 1;
      const cs = m.dot.scale.x;
      m.dot.scale.setScalar(cs + (ts - cs) * 0.15);

      // Back-side culling
      const markerDir = m.dot.position.clone().normalize();
      const facing = camDir.dot(markerDir);
      const frontOpacity = facing > 0.05 ? Math.min(1, (facing - 0.05) * 5) : 0;
      const baseOp = m.type === 'episode' ? 1 : 0.6;
      m.dot.material.opacity = baseOp * frontOpacity;

      // Hover ring: scales with zoom level so it stays visible when zoomed out
      if (m.ring) {
        const targetRing = m.dot.userData.hoverRingScale || 0;
        const curRing = m.ring.scale.x;
        // Ring gets bigger when zoomed out (zoomFactor ~7 at max out, ~1.15 at max in)
        const ringZoomScale = Math.max(1, zoomFactor * 0.6);
        const nextRing = curRing + (targetRing * ringZoomScale * 1.5 - curRing) * 0.12;
        m.ring.scale.setScalar(Math.max(0.01, nextRing));
        m.ring.material.opacity = targetRing * 0.5 * frontOpacity;
        m.ring.position.copy(m.dot.position);
        m.ring.lookAt(camera.position);
      }
    });

    renderer.render(scene, camera);
  }
  animate();
}

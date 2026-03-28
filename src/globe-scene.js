import * as THREE from 'three';
import { feature } from 'topojson-client';
import { latLngToECEF, EARTH_RADIUS } from './tiles-globe.js';
import { episodes, happinessConcepts } from './data.js';

export const globeState = {
  markers: [],
  flyToMarker: null,
  updateColors: null,
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

  // Opaque dark sphere
  const sphereMat = new THREE.MeshBasicMaterial({ color: 0x080808 });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS * 0.997, 64, 64), sphereMat));

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

  // No expansion animation — dots placed directly

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

    // Place dots directly (no expansion animation)
    const dotGeoFinal = new THREE.BufferGeometry();
    dotGeoFinal.setAttribute('position', new THREE.Float32BufferAttribute(targetArr, 3));
    const dotMat = new THREE.PointsMaterial({ color: 0xffffff, size: 20000, transparent: true, opacity: 0.45, depthWrite: false, depthTest: true, sizeAttenuation: true });
    scene.add(new THREE.Points(dotGeoFinal, dotMat));

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

    // ---- Markers with hover ring ----
    episodes.forEach((ep) => {
      const pos = latLngToECEF(ep.lat, ep.lng, 10000);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(14000, 14, 14), new THREE.MeshBasicMaterial({ color: 0xFFDD00, transparent: true, opacity: 1, depthWrite: false }));
      dot.position.copy(pos);
      dot.userData = { type: 'episode', data: ep, baseScale: 1, hoverRingScale: 0 };
      scene.add(dot);

      // Hover ring (thin expanding circle)
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(22000, 23500, 32),
        new THREE.MeshBasicMaterial({ color: 0xFFDD00, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
      );
      ring.position.copy(pos);
      ring.lookAt(0, 0, 0);
      scene.add(ring);

      markers.push({ dot, ring, type: 'episode', data: ep });
    });
    happinessConcepts.forEach((c, i) => {
      const pos = latLngToECEF(c.lat, c.lng, 10000);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(10000, 10, 10), new THREE.MeshBasicMaterial({ color: 0xF6E3D5, transparent: true, opacity: 0.6, depthWrite: false }));
      dot.position.copy(pos);
      dot.userData = { type: 'concept', data: { ...c, id: 100 + i }, baseScale: 1, hoverRingScale: 0 };
      scene.add(dot);
      markers.push({ dot, type: 'concept', data: { ...c, id: 100 + i } });
    });
    clickableDots = markers.map((m) => m.dot);
    globeState.markers = markers;

    // Earth texture (loaded once, toggled via control panel)
    let earthTexture = null;
    new THREE.TextureLoader().load('/earth-blue-marble.jpg', (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      earthTexture = tex;
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
          const s = (c.pinSize || 14000) / 14000;
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

  canvas.addEventListener('pointerdown', (e) => {
    isDragging = true; dragDist = 0; prevX = e.clientX; prevY = e.clientY;
    autoRotate = false; clearTimeout(autoTimer);
    canvas.style.cursor = 'grabbing';
  });

  window.addEventListener('pointermove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    if (isDragging) {
      const dx = e.clientX - prevX, dy = e.clientY - prevY;
      dragDist += Math.abs(dx) + Math.abs(dy);
      targetRotY -= dx * 0.003;
      targetRotX += dy * 0.002;
      targetRotX = Math.max(-1.2, Math.min(1.2, targetRotX));
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
      const t = 1 - closestDist / 60;
      hoveredMarker.userData.baseScale = 1 + t * 0.8;
      hoveredMarker.userData.hoverRingScale = t; // 0→1, drives ring expand
      window.dispatchEvent(new CustomEvent('globe:marker-hover', { detail: { data: closestMarker.data, type: closestMarker.type, x: e.clientX, y: e.clientY } }));
      clearCountryHL();
    } else {
      if (hoveredMarker) { hoveredMarker.userData.baseScale = 1; hoveredMarker.userData.hoverRingScale = 0; hoveredMarker = null; }
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

  canvas.addEventListener('wheel', (e) => {
    targetCamDist *= 1 + e.deltaY * 0.0008;
    targetCamDist = Math.max(EARTH_RADIUS * 1.15, Math.min(EARTH_RADIUS * 7, targetCamDist));
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

  // ---- Render loop ----
  function animate() {
    requestAnimationFrame(animate);

    if (autoRotate) targetRotY += 0.0003;

    // Smooth ease (power4-like lerp)
    rotX += (targetRotX - rotX) * 0.03;
    rotY += (targetRotY - rotY) * 0.03;
    camDist += (targetCamDist - camDist) * 0.03;

    camera.position.x = camDist * Math.sin(rotY) * Math.cos(rotX);
    camera.position.y = camDist * Math.sin(rotX);
    camera.position.z = camDist * Math.cos(rotY) * Math.cos(rotX);
    camera.lookAt(0, 0, 0);

    // ---- Marker animation: scale, ring (zoom-adaptive), backside culling ----
    const camDir = camera.position.clone().normalize();
    // Zoom factor: how far camera is (1 = closest, ~6 = max zoom out)
    const zoomFactor = camDist / EARTH_RADIUS;

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

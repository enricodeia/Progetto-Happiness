// Google 3D Photorealistic Tiles Globe
// Coordinate system matches 3d-tiles-renderer's geo frame

import * as THREE from 'three';
import { TilesRenderer, GlobeControls } from '3d-tiles-renderer';
import {
  GoogleCloudAuthPlugin,
  TilesFadePlugin,
  TileCompressionPlugin,
  UpdateOnChangePlugin,
  UnloadTilesPlugin,
  GLTFExtensionsPlugin,
} from '3d-tiles-renderer/plugins';

export const EARTH_RADIUS = 6371000; // meters

export function createTilesGlobe(scene, camera, renderer) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey || apiKey === 'YOUR_KEY_HERE') {
    console.warn('[Tiles] No API key. Add VITE_GOOGLE_MAPS_API_KEY to .env');
    return null;
  }

  const tiles = new TilesRenderer();
  tiles.registerPlugin(new GoogleCloudAuthPlugin({ apiToken: apiKey }));
  tiles.registerPlugin(new GLTFExtensionsPlugin());
  tiles.registerPlugin(new TileCompressionPlugin());
  tiles.registerPlugin(new UpdateOnChangePlugin());
  tiles.registerPlugin(new UnloadTilesPlugin());
  tiles.registerPlugin(new TilesFadePlugin());

  tiles.setCamera(camera);
  tiles.setResolutionFromRenderer(camera, renderer);
  // Start with tiles hidden — only show on zoom
  tiles.group.visible = false;
  scene.add(tiles.group);

  const controls = new GlobeControls(scene, camera, renderer.domElement, tiles);
  controls.enableDamping = true;

  return {
    tiles,
    controls,
    setVisible(v) { tiles.group.visible = v; },
  };
}

// Convert lat/lng (degrees) to ECEF matching 3d-tiles-renderer's coordinate frame
// Geo frame: X→0°N,0°E  Y→0°N,90°E  Z→NorthPole
// Three.js swap: geoX→Z, geoY→X, geoZ→Y
export function latLngToECEF(latDeg, lngDeg, altitude = 0) {
  const r = EARTH_RADIUS + altitude;
  const lat = latDeg * Math.PI / 180;
  const lng = lngDeg * Math.PI / 180;

  // Standard ECEF (geo frame)
  const geoX = r * Math.cos(lat) * Math.cos(lng);
  const geoY = r * Math.cos(lat) * Math.sin(lng);
  const geoZ = r * Math.sin(lat);

  // Swap to Three.js frame (same swap as GeoUtils.swapToThreeFrame)
  return new THREE.Vector3(geoY, geoZ, geoX);
}

// ---- Atmosphere shader (glow around Earth edge) ----
export function createAtmosphere(scene) {
  const atmosGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.015, 64, 64);
  const atmosMat = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      uniform vec3 uCameraPos;
      void main() {
        vec3 viewDir = normalize(uCameraPos - vWorldPos);
        float rim = 1.0 - max(dot(vNormal, viewDir), 0.0);
        float intensity = pow(rim, 3.0);
        vec3 color = mix(vec3(0.3, 0.6, 1.0), vec3(0.7, 0.9, 1.0), rim);
        gl_FragColor = vec4(color, intensity * 0.4);
      }
    `,
    uniforms: {
      uCameraPos: { value: new THREE.Vector3() },
    },
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const atmos = new THREE.Mesh(atmosGeo, atmosMat);
  scene.add(atmos);
  return { mesh: atmos, material: atmosMat };
}

// ---- Cloud layer (semi-transparent sphere above Earth) ----
export function createCloudLayer(scene) {
  const cloudGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.003, 64, 64);

  // Procedural cloud texture via canvas
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size / 2;
  const ctx = canvas.getContext('2d');

  // Generate simple cloud-like noise pattern
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, size, size / 2);

  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size / 2;
    const r = Math.random() * 20 + 5;
    const alpha = Math.random() * 0.15 + 0.02;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fill();
  }

  // Cluster clouds along typical cloud belt patterns
  const bands = [0.2, 0.35, 0.5, 0.65, 0.8]; // latitude bands
  bands.forEach((band) => {
    for (let i = 0; i < 800; i++) {
      const x = Math.random() * size;
      const y = band * (size / 2) + (Math.random() - 0.5) * 30;
      const r = Math.random() * 25 + 8;
      const alpha = Math.random() * 0.12 + 0.03;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fill();
    }
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;

  const cloudMat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const clouds = new THREE.Mesh(cloudGeo, cloudMat);
  scene.add(clouds);
  return { mesh: clouds, material: cloudMat };
}

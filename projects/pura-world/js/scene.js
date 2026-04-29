/* ═══════════════════════════════════════════════════════════════════════════
   SCENE — Three.js scene, renderer, lighting, sky, post-processing
   ═══════════════════════════════════════════════════════════════════════════ */

const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, 390 / 844, 0.1, 50000);
camera.position.set(0, 500, 0.1);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
  alpha: false
});
renderer.setSize(390, 844);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputEncoding = THREE.sRGBEncoding;
container.appendChild(renderer.domElement);

// ── Post-Processing ───────────────────────────────────────────────────────

let renderTarget;
let postScene, postCamera, postMaterial, postQuad;
let revealProgress = 0;
let revealActive = true;

function initPostProcessing() {
  const pixelRatio = Math.min(window.devicePixelRatio, 2);
  renderTarget = new THREE.WebGLRenderTarget(390 * pixelRatio, 844 * pixelRatio);
  renderTarget.texture.encoding = THREE.sRGBEncoding;

  postScene = new THREE.Scene();
  postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  postMaterial = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(revealShader.uniforms),
    vertexShader: revealShader.vertexShader,
    fragmentShader: revealShader.fragmentShader,
    depthTest: false,
    depthWrite: false
  });

  const postGeometry = new THREE.PlaneGeometry(2, 2);
  postQuad = new THREE.Mesh(postGeometry, postMaterial);
  postScene.add(postQuad);
}

initPostProcessing();

// ── Lighting ──────────────────────────────────────────────────────────────

const ambientLight = new THREE.AmbientLight(0x3d3d47, 0.15);
scene.add(ambientLight);

const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0xc4a882, 0.5);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xfffaf0, 2.0);
sunLight.position.set(150, 200, 100);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 10;
sunLight.shadow.camera.far = 1200;
sunLight.shadow.camera.left = -600;
sunLight.shadow.camera.right = 600;
sunLight.shadow.camera.top = 600;
sunLight.shadow.camera.bottom = -600;
sunLight.shadow.bias = -0.0001;
sunLight.shadow.normalBias = 0.02;
sunLight.shadow.radius = 1.5;
scene.add(sunLight);

// Scale shadow camera to match forest size
function updateShadowCamera(forestRadius) {
  const extent = Math.max(600, forestRadius * 1.2);
  sunLight.shadow.camera.left = -extent;
  sunLight.shadow.camera.right = extent;
  sunLight.shadow.camera.top = extent;
  sunLight.shadow.camera.bottom = -extent;
  sunLight.shadow.camera.far = extent * 2;
  sunLight.position.set(extent * 0.25, extent * 0.35, extent * 0.17);
  sunLight.shadow.camera.updateProjectionMatrix();
}

const skyFillLight = new THREE.DirectionalLight(0x8899aa, 0.3);
skyFillLight.position.set(-50, 150, -30);
scene.add(skyFillLight);

const rimLight = new THREE.DirectionalLight(0xffc9a3, 0.6);
rimLight.position.set(-100, 120, -180);
scene.add(rimLight);

const bounceLight = new THREE.DirectionalLight(0xd4b896, 0.2);
bounceLight.position.set(0, -30, 0);
scene.add(bounceLight);

const fillLight2 = new THREE.DirectionalLight(0xaabbcc, 0.15);
fillLight2.position.set(-120, 40, 80);
scene.add(fillLight2);

// ── Sky Dome + Stars ──────────────────────────────────────────────────────

let skyDome;
let starField;

function createSkyDome(zenithColor, horizonColor, worldRadius) {
  if (skyDome) scene.remove(skyDome);
  if (starField) scene.remove(starField);

  // Sky/stars scale with the world — always 3x the ground radius, minimum 3500
  const skyRadius = Math.max(3500, (worldRadius || 3000) * 3);
  const starRadius = skyRadius * 0.97;

  const skyGeom = new THREE.SphereGeometry(skyRadius, 64, 48);
  const colors = new Float32Array(skyGeom.attributes.position.count * 3);
  const positions = skyGeom.attributes.position.array;

  const zenith = new THREE.Color(zenithColor);
  const horizon = new THREE.Color(horizonColor).multiplyScalar(1.15);
  const moonGlow = new THREE.Color(0x8899aa);
  const moonDir = new THREE.Vector3(-0.3, 0.6, 0.5).normalize();

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i], y = positions[i + 1], z = positions[i + 2];
    const len = Math.sqrt(x * x + y * y + z * z);
    const nx = x / len, ny = y / len, nz = z / len;
    const altitude = Math.max(0, ny);
    const t = 1 - Math.pow(1 - altitude, 1.6);
    let color = horizon.clone().lerp(zenith, t);

    const moonDot = Math.max(0, nx * moonDir.x + ny * moonDir.y + nz * moonDir.z);
    color.lerp(moonGlow, Math.pow(moonDot, 8) * 0.15);

    const hazeAmount = Math.pow(1 - altitude, 3.0) * 0.12;
    color.r = Math.min(1, color.r + hazeAmount * 0.8);
    color.g = Math.min(1, color.g + hazeAmount * 0.9);
    color.b = Math.min(1, color.b + hazeAmount * 1.0);

    if (ny < 0) {
      const groundCol = new THREE.Color(0x1a1c17);
      color.lerp(groundCol, Math.min(1, -ny * 3.0) * 0.95);
    }

    colors[i] = color.r;
    colors[i + 1] = color.g;
    colors[i + 2] = color.b;
  }

  skyGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  skyDome = new THREE.Mesh(skyGeom, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false }));
  scene.add(skyDome);

  // Stars — scale with sky
  const starCount = 2000;
  const starGeometry = new THREE.BufferGeometry();
  const starPositions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);
  const starSizes = new Float32Array(starCount);
  const rng = new SeededRandom(12345);

  for (let i = 0; i < starCount; i++) {
    const theta = rng.next() * Math.PI * 2;
    const phi = rng.next() * Math.PI * 0.5;
    starPositions[i * 3] = starRadius * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = starRadius * Math.cos(phi);
    starPositions[i * 3 + 2] = starRadius * Math.sin(phi) * Math.sin(theta);

    const colorVar = rng.next();
    if (colorVar < 0.7) {
      starColors[i * 3] = 0.95 + rng.next() * 0.05;
      starColors[i * 3 + 1] = 0.92 + rng.next() * 0.08;
      starColors[i * 3 + 2] = 0.85 + rng.next() * 0.15;
    } else if (colorVar < 0.85) {
      starColors[i * 3] = 0.8 + rng.next() * 0.1;
      starColors[i * 3 + 1] = 0.85 + rng.next() * 0.1;
      starColors[i * 3 + 2] = 0.95 + rng.next() * 0.05;
    } else {
      starColors[i * 3] = 0.95 + rng.next() * 0.05;
      starColors[i * 3 + 1] = 0.7 + rng.next() * 0.2;
      starColors[i * 3 + 2] = 0.5 + rng.next() * 0.2;
    }

    starSizes[i] = rng.next() < 0.9 ? 1.0 + rng.next() * 2.0 : 3.0 + rng.next() * 4.0;
  }

  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
  starGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));

  const starMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      attribute float size;
      varying vec3 vColor;
      uniform float uTime;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float twinkle = sin(uTime * 2.0 + position.x * 0.01 + position.z * 0.01) * 0.3 + 0.7;
        gl_PointSize = size * twinkle * (600.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        float dist = length(gl_PointCoord - vec2(0.5));
        float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
        alpha += exp(-dist * 4.0) * 0.5;
        gl_FragColor = vec4(vColor, alpha * 0.8);
      }
    `,
    transparent: true,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  starField = new THREE.Points(starGeometry, starMaterial);
  scene.add(starField);
}

import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';

/* ═══════════════════════════════════════════
   Config
   ═══════════════════════════════════════════ */
const BG_COLOR = 0xfdf4ed;
const RING_COUNT = 3;
const CARDS_PER_RING_UNIT = 10;
const CARD_RADIUS = 0.85;     // bigger cards
const RING_BASE_R = 6;
const RING_GAP = 6;
const EXPAND_FACTOR = 1.6;    // how much rings expand when compose opens

/* ═══════════════════════════════════════════
   Post-processing fragment shader
   ═══════════════════════════════════════════ */
const POST_FRAG = `
  uniform float iTime;
  uniform vec2 iResolution;
  uniform sampler2D tDiffuse;
  uniform vec3 uBgColor;
  uniform float uRGBShift;
  uniform float uGrain;
  uniform float uVignette;
  uniform float uTransition;
  varying vec2 vUv;

  highp float random(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec2 uv = vUv;

    // RGB shift
    float n = random(uv + iTime) * 0.5 + 0.5;
    vec2 off = uRGBShift * vec2(cos(n), sin(n));
    float r = texture2D(tDiffuse, uv + off).r;
    float g = texture2D(tDiffuse, uv + off * 0.5).g;
    float b = texture2D(tDiffuse, uv + off * 0.25).b;
    vec3 col = vec3(r, g, b);

    // Grain
    col += (random(uv + iTime) - 0.5) * uGrain;

    // Vignette
    float d = length(uv - 0.5);
    float mask = smoothstep(0.5, 0.3, d);
    mask = pow(mask, 0.6);
    col = mix(col, uBgColor, (1.0 - mask) * uVignette);

    // Circle transition (intro reveal)
    float ratio = iResolution.x / iResolution.y;
    vec2 p = uv - 0.5;
    p.x *= ratio;
    float cd = length(p) - uTransition * sqrt(2.2);
    float c = smoothstep(-0.2, 0.0, cd);
    col = mix(uBgColor, col, 1.0 - c);

    gl_FragColor = vec4(col, 1.0);
  }
`;

const POST_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/* ═══════════════════════════════════════════
   Generate round card texture with text
   ═══════════════════════════════════════════ */
function createCardTexture(text, author, color, size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const r = size / 2;

  // Circle clip
  ctx.beginPath();
  ctx.arc(r, r, r, 0, Math.PI * 2);
  ctx.clip();

  // Background
  ctx.fillStyle = color || '#F6E3D5';
  ctx.fillRect(0, 0, size, size);

  // Subtle grain
  for (let i = 0; i < 800; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.fillStyle = `rgba(44, 33, 24, ${Math.random() * 0.04})`;
    ctx.fillRect(x, y, 1, 1);
  }

  // Inner shadow
  const grad = ctx.createRadialGradient(r, r, r * 0.5, r, r, r);
  grad.addColorStop(0, 'transparent');
  grad.addColorStop(1, 'rgba(44, 33, 24, 0.08)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Text
  ctx.textAlign = 'center';
  ctx.fillStyle = '#2C2118';

  // Wrap text
  ctx.font = '500 13px Inter, system-ui, sans-serif';
  const words = text.split(' ');
  const lines = [];
  let line = '';
  const maxW = size * 0.65;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  const lineH = 17;
  const totalH = lines.length * lineH;
  const startY = r - totalH / 2 + 4;
  lines.forEach((l, i) => {
    ctx.fillText(l, r, startY + i * lineH);
  });

  // Author
  ctx.font = '700 9px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(44, 33, 24, 0.35)';
  ctx.fillText(`— ${author}`.toUpperCase(), r, r + totalH / 2 + 16);

  // Border
  ctx.beginPath();
  ctx.arc(r, r, r - 1, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(44, 33, 24, 0.06)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ═══════════════════════════════════════════
   Fake messages for ambient cards
   ═══════════════════════════════════════════ */
const FAKE_MESSAGES = [
  { text: 'La felicità è il profumo del caffè al mattino', author: 'Elena' },
  { text: 'Guardare il tramonto con chi ami', author: 'Marco' },
  { text: 'Un abbraccio inaspettato', author: 'Sara' },
  { text: 'Il suono della pioggia sul tetto', author: 'Luca' },
  { text: 'Ridere fino alle lacrime', author: 'Giulia' },
  { text: 'Il primo tuffo in mare d\'estate', author: 'Andrea' },
  { text: 'Tornare a casa dopo un lungo viaggio', author: 'Marta' },
  { text: 'Una passeggiata nel bosco in autunno', author: 'Paolo' },
  { text: 'Il silenzio della montagna', author: 'Chiara' },
  { text: 'Cucinare per le persone che amo', author: 'Francesco' },
  { text: 'Le risate dei bambini', author: 'Valentina' },
  { text: 'Una lettera scritta a mano', author: 'Roberto' },
  { text: 'Svegliarsi senza sveglia', author: 'Laura' },
  { text: 'Il primo fiore di primavera', author: 'Giovanni' },
  { text: 'Ballare sotto la pioggia', author: 'Alessia' },
  { text: 'Il sapore della torta della nonna', author: 'Matteo' },
  { text: 'Una notte piena di stelle', author: 'Federica' },
  { text: 'Trovare un libro che ti cambia la vita', author: 'Simone' },
  { text: 'Il calore del sole sulla pelle', author: 'Claudia' },
  { text: 'Fare qualcosa per la prima volta', author: 'Davide' },
  { text: 'Sentirsi capiti senza dover spiegare', author: 'Anna' },
  { text: 'La musica che ti fa venire i brividi', author: 'Lorenzo' },
  { text: 'Un momento di pace perfetta', author: 'Sofia' },
  { text: 'Giocare con il mio cane al parco', author: 'Tommaso' },
  { text: 'Quando tutto sembra al posto giusto', author: 'Beatrice' },
  { text: 'Il profumo del pane appena sfornato', author: 'Alessandro' },
  { text: 'Guardare le onde del mare', author: 'Elisa' },
  { text: 'Un caffè con un vecchio amico', author: 'Nicola' },
  { text: 'La luce dorata del pomeriggio', author: 'Ilaria' },
  { text: 'Essere in pace con se stessi', author: 'Giacomo' },
  { text: 'Le piccole cose quotidiane', author: 'Francesca' },
  { text: 'Un sorriso da uno sconosciuto', author: 'Pietro' },
  { text: 'Camminare scalzi sull\'erba', author: 'Serena' },
  { text: 'Il suono delle campane la domenica', author: 'Antonio' },
  { text: 'Addormentarsi leggendo', author: 'Michela' },
  { text: 'Fare una foto che racconti tutto', author: 'Filippo' },
];

const CARD_COLORS = ['#FFF3C4', '#FFD6D6', '#D4F0F0', '#D5ECD4', '#FFE0C2', '#E8D5F5', '#FFDAB9', '#C8E6C9'];

/* ═══════════════════════════════════════════
   Component
   ═══════════════════════════════════════════ */
const BachecaRings = ({ visible = false, messages = [], expanded = false, onReady = null, exiting = false, onExitComplete = null }) => {
  const containerRef = useRef(null);
  const sceneRef = useRef({});
  const scrollRef = useRef({ current: 0, target: 0, delta: 0 });
  const dragRef = useRef({ active: false, startX: 0, startY: 0 });
  const animRef = useRef(null);
  const onExitCompleteRef = useRef(onExitComplete);
  onExitCompleteRef.current = onExitComplete;

  const init = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const existing = sceneRef.current;
    if (existing.renderer) return; // already init

    const w = el.clientWidth;
    const h = el.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(BG_COLOR, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);

    // Scene + Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 200);
    camera.position.set(0, 0, 16);

    // Render target for post-processing
    const rt = new THREE.WebGLRenderTarget(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());

    // Post-processing quad
    const postMat = new THREE.ShaderMaterial({
      vertexShader: POST_VERT,
      fragmentShader: POST_FRAG,
      uniforms: {
        tDiffuse: { value: rt.texture },
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(w, h) },
        uBgColor: { value: new THREE.Color(BG_COLOR) },
        uRGBShift: { value: 0.0015 },
        uGrain: { value: 0.02 },
        uVignette: { value: 0.6 },
        uTransition: { value: 0 },
      },
    });
    const postScene = new THREE.Scene();
    const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat);
    postScene.add(postQuad);

    // Build rings of round cards
    const isOdd = (n) => n % 2 === 1;
    const rings = [];
    const allLines = [];

    // Combine fake messages + real messages
    const allMsgs = [...FAKE_MESSAGES];
    messages.forEach(m => {
      allMsgs.push({ text: m.text, author: m.author, color: m.color });
    });

    let msgIdx = 0;

    for (let ring = 0; ring < RING_COUNT; ring++) {
      const ringGroup = new THREE.Group();
      scene.add(ringGroup);
      rings.push(ringGroup);

      const cardCount = CARDS_PER_RING_UNIT * (ring + 1);
      const ringR = RING_BASE_R + ring * RING_GAP;

      for (let j = 0; j < cardCount; j++) {
        const line = new THREE.Group();
        ringGroup.add(line);
        allLines.push(line);

        // Pick message
        const msg = allMsgs[msgIdx % allMsgs.length];
        msgIdx++;

        const color = msg.color || CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)];
        const tex = createCardTexture(msg.text, msg.author, color);

        const scale = CARD_RADIUS * (1 + ring * 0.15);
        const geo = new THREE.CircleGeometry(scale, 48);
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
        const mesh = new THREE.Mesh(geo, mat);

        mesh.position.x = ringR;
        mesh.rotation.z = -Math.PI / 2; // face outward

        const angle = (j / cardCount) * Math.PI * 2;
        line.rotation.z = angle;
        line.add(mesh);
      }
    }

    // Store refs
    Object.assign(existing, {
      renderer, scene, camera, rt, postMat, postScene, postCamera,
      rings, allLines, params: { transition: 0, enter: 0, rotateSpeed: 1 },
    });

    // Intro animation
    const tl = gsap.timeline();
    tl.to(existing.params, { transition: 1, duration: 1.2, ease: 'power2.inOut' });
    tl.fromTo(existing.params,
      { enter: 0, rotateSpeed: 8 },
      { enter: 1, rotateSpeed: 1, duration: 1.8, ease: 'power2.out' },
      '-=0.8',
    );

    if (onReady) setTimeout(onReady, 100);

    // Render loop
    const clock = new THREE.Clock();
    const animate = () => {
      animRef.current = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const time = clock.getElapsedTime();

      // Smooth scroll
      const sc = scrollRef.current;
      sc.current += (sc.target - sc.current) * 0.08;
      sc.delta = sc.target - sc.current;

      // Rotate rings — speed scales with scroll velocity
      const scrollSpeed = 1 + Math.abs(sc.delta) * 0.015;
      rings.forEach((ring, i) => {
        ring.rotation.z +=
          0.0025 *
          (isOdd(i) ? -1 : 1) *
          scrollSpeed *
          existing.params.rotateSpeed;
      });

      // Z-depth from scroll velocity — cards push back dramatically
      const velocityNorm = THREE.MathUtils.clamp(
        THREE.MathUtils.mapLinear(Math.abs(sc.delta), 0, 400, 0, 1), 0, 1
      );
      allLines.forEach((line) => {
        const scrollDepth = -THREE.MathUtils.lerp(0, 100, velocityNorm);
        const enterZ = THREE.MathUtils.lerp(12, 0, existing.params.enter);
        line.position.z = scrollDepth + enterZ;
      });

      // Post-processing uniforms
      postMat.uniforms.iTime.value = time;
      postMat.uniforms.uTransition.value = existing.params.transition;

      // Render scene to RT, then post-process to screen
      renderer.setRenderTarget(rt);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(postScene, postCamera);
    };
    animate();
  }, [messages, onReady]);

  // Mount
  useEffect(() => {
    if (visible) init();
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      const s = sceneRef.current;
      if (s.renderer && containerRef.current) {
        containerRef.current.removeChild(s.renderer.domElement);
        s.renderer.dispose();
        sceneRef.current = {};
      }
    };
  }, [visible, init]);

  // Resize
  useEffect(() => {
    const onResize = () => {
      const s = sceneRef.current;
      const el = containerRef.current;
      if (!s.renderer || !el) return;
      const w = el.clientWidth, h = el.clientHeight;
      s.renderer.setSize(w, h);
      s.camera.aspect = w / h;
      s.camera.updateProjectionMatrix();
      s.rt.setSize(w * s.renderer.getPixelRatio(), h * s.renderer.getPixelRatio());
      s.postMat.uniforms.iResolution.value.set(w, h);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Expand rings when compose opens
  useEffect(() => {
    const s = sceneRef.current;
    if (!s.rings) return;
    s.rings.forEach((ring, i) => {
      const targetScale = expanded ? EXPAND_FACTOR : 1;
      gsap.to(ring.scale, { x: targetScale, y: targetScale, z: targetScale, duration: 1.2, ease: 'power2.inOut' });
    });
  }, [expanded]);

  // Exit animation: scale up + spin faster + fade out
  useEffect(() => {
    const s = sceneRef.current;
    if (!exiting || !s.rings || !s.renderer) return;
    const tl = gsap.timeline({
      onComplete: () => {
        // Stop the render loop
        if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null; }
        if (onExitCompleteRef.current) onExitCompleteRef.current();
      },
    });
    // Spin faster
    tl.to(s.params, { rotateSpeed: 6, duration: 1.0, ease: 'power2.in' }, 0);
    // Scale rings up dramatically
    s.rings.forEach((ring) => {
      tl.to(ring.scale, { x: 3, y: 3, z: 3, duration: 1.2, ease: 'power2.in' }, 0);
    });
    // Fade out the canvas
    tl.to(s.renderer.domElement, { opacity: 0, duration: 1.0, ease: 'power2.in' }, 0.2);
    return () => tl.kill();
  }, [exiting]);

  // Scroll interaction
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e) => {
      e.preventDefault();
      scrollRef.current.target -= e.deltaY;
    };

    const onPointerDown = (e) => {
      dragRef.current = { active: true, startX: e.clientX, startY: e.clientY };
    };
    const onPointerMove = (e) => {
      if (!dragRef.current.active) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      scrollRef.current.target -= (dx || dy) * 2;
      dragRef.current.startX = e.clientX;
      dragRef.current.startY = e.clientY;
    };
    const onPointerUp = () => { dragRef.current.active = false; };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointerleave', onPointerUp);

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointerleave', onPointerUp);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        zIndex: 1,
        touchAction: 'none',
      }}
    />
  );
};

export default BachecaRings;

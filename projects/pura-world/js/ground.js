/* ═══════════════════════════════════════════════════════════════════════════
   GROUND — Terrain, milestone circles, oasis shader
   ═══════════════════════════════════════════════════════════════════════════ */

let ground;
let groundMaterial;
let oasisRadius = 0;
let milestoneLabels = [];

// ── Milestone Labels ──────────────────────────────────────────────────────

function createMilestoneLabel(milestone, radius, currentFollowers) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 512;
  canvas.height = 160;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 15;
  ctx.shadowOffsetY = 2;

  ctx.font = 'bold 56px "Space Grotesk", system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(`LV.${milestone.level}`, 256, 55);

  ctx.font = 'bold 42px "Space Grotesk", system-ui, sans-serif';
  ctx.fillStyle = '#e8e8e0';
  const formattedCount = milestone.followers >= 1000000
    ? (milestone.followers / 1000000) + 'M'
    : milestone.followers >= 1000
      ? (milestone.followers / 1000) + 'K'
      : milestone.followers.toString();
  ctx.fillText(formattedCount, 256, 110);

  ctx.font = '22px "Space Grotesk", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(220, 215, 200, 0.9)';
  ctx.fillText('followers', 256, 145);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0.15,
    depthTest: false,
    depthWrite: false
  });

  const sprite = new THREE.Sprite(material);
  sprite.userData.milestoneRadius = radius;

  const labelScale = Math.max(55, radius * 0.3);
  sprite.scale.set(labelScale * 3.0, labelScale * 1.0, 1);
  const labelOffset = labelScale * 0.5;
  sprite.position.set(0, 4, radius + labelOffset);

  return sprite;
}

function updateMilestoneLabelsOpacity(animatedRadius) {
  milestoneLabels.forEach(label => {
    const milestoneRadius = label.userData.milestoneRadius;
    const transitionStart = milestoneRadius * 0.9;
    const t = Math.min(1, Math.max(0, (animatedRadius - transitionStart) / (milestoneRadius - transitionStart)));
    label.material.opacity = 0.15 + t * 0.85;
  });
}

function createMilestoneLabels(currentFollowers) {
  milestoneLabels.forEach(label => scene.remove(label));
  milestoneLabels = [];

  const maxRadius = Math.sqrt(MILESTONES[MILESTONES.length - 1].followers) * 4.5 * 1.2;

  MILESTONES.forEach(milestone => {
    const radius = getRadiusForFollowers(milestone.followers);
    if (radius < maxRadius) {
      const label = createMilestoneLabel(milestone, radius, currentFollowers);
      scene.add(label);
      milestoneLabels.push(label);
    }
  });
}

// ── Ground Mesh + Shader ──────────────────────────────────────────────────

function createGround(radius, skyColor) {
  if (ground) scene.remove(ground);

  const groundRadius = Math.max(3000, radius * 1.3);
  const segments = Math.min(256, Math.max(128, Math.round(groundRadius / 20)));
  const geometry = new THREE.CircleGeometry(groundRadius, segments);
  const vertices = geometry.attributes.position.array;
  const rng = new SeededRandom(seed + 999);

  function terrainNoise(x, z, scale, octaves) {
    let value = 0, amplitude = 1, frequency = scale, maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      value += amplitude * (Math.sin(x * frequency) * Math.cos(z * frequency * 1.3) +
                           Math.sin(x * frequency * 0.7 + 50) * Math.cos(z * frequency * 0.9 + 30));
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    return value / maxValue;
  }

  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i], y = vertices[i + 1];
    vertices[i + 2] = terrainNoise(x, y, 0.002, 2) * 2 + terrainNoise(x + 500, y + 500, 0.03, 1) * 0.3;
  }
  geometry.computeVertexNormals();

  const milestoneRadii = getMilestoneRadii();
  const milestoneUniforms = {};
  const followerUniforms = {};

  for (let i = 0; i < 25; i++) {
    milestoneUniforms[`uMilestone${i}`] = { value: milestoneRadii[i] || 0.0 };
    followerUniforms[`uFollower${i}`] = { value: MILESTONES[i]?.followers || 0.0 };
  }

  groundMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uOasisRadius: { value: 0.0 },
      uForestRadius: { value: radius },
      uTime: { value: 0.0 },
      uSkyColor: { value: new THREE.Color(skyColor) },
      uGroundRadius: { value: groundRadius },
      uCurrentFollowers: { value: 0.0 },
      ...milestoneUniforms,
      ...followerUniforms
    },
    vertexShader: `
      varying vec2 vWorldPos;
      varying vec3 vNormal;
      varying float vHeight;
      varying float vDistFromCenter;
      uniform float uGroundRadius;

      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xz;
        vNormal = normalMatrix * normal;
        vHeight = position.z;
        vDistFromCenter = length(position.xy) / uGroundRadius;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      precision highp float;

      uniform float uOasisRadius;
      uniform float uForestRadius;
      uniform float uTime;
      uniform vec3 uSkyColor;
      uniform float uGroundRadius;
      uniform float uCurrentFollowers;

      uniform float uMilestone0, uMilestone1, uMilestone2, uMilestone3, uMilestone4;
      uniform float uMilestone5, uMilestone6, uMilestone7, uMilestone8, uMilestone9;
      uniform float uMilestone10, uMilestone11, uMilestone12, uMilestone13, uMilestone14;
      uniform float uMilestone15, uMilestone16, uMilestone17, uMilestone18, uMilestone19;
      uniform float uMilestone20, uMilestone21, uMilestone22, uMilestone23, uMilestone24;

      uniform float uFollower0, uFollower1, uFollower2, uFollower3, uFollower4;
      uniform float uFollower5, uFollower6, uFollower7, uFollower8, uFollower9;
      uniform float uFollower10, uFollower11, uFollower12, uFollower13, uFollower14;
      uniform float uFollower15, uFollower16, uFollower17, uFollower18, uFollower19;
      uniform float uFollower20, uFollower21, uFollower22, uFollower23, uFollower24;

      varying vec2 vWorldPos;
      varying vec3 vNormal;
      varying float vHeight;
      varying float vDistFromCenter;

      float hash(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }

      float noise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }

      float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 4; i++) { v += a * noise(p); a *= 0.5; p *= 2.0; }
        return v;
      }

      float fbmWarped(vec2 p, float time) {
        vec2 q = vec2(fbm(p), fbm(p + vec2(5.2, 1.3)));
        vec2 r = vec2(fbm(p + 4.0 * q + vec2(1.7, 9.2) + 0.1 * time),
                      fbm(p + 4.0 * q + vec2(8.3, 2.8) + 0.08 * time));
        return fbm(p + 3.0 * r);
      }

      float voronoi(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p);
        float minDist = 1.0;
        for (int x = -1; x <= 1; x++)
          for (int y = -1; y <= 1; y++) {
            vec2 nb = vec2(float(x), float(y));
            vec2 pt = vec2(hash(i + nb), hash(i + nb + 100.0));
            minDist = min(minDist, length(nb + pt - f));
          }
        return minDist;
      }

      float milestoneCircle(float dist, float radius, float thickness) {
        if (radius <= 0.0) return 0.0;
        return 1.0 - smoothstep(0.0, thickness, abs(dist - radius));
      }

      void main() {
        float dist = length(vWorldPos);
        vec2 pos = vWorldPos;

        vec3 bgColor = vec3(0.169, 0.176, 0.149);
        vec3 circleColor = vec3(1.0, 1.0, 0.97);

        vec3 grassDark = vec3(0.12, 0.28, 0.08);
        vec3 grassMid = vec3(0.20, 0.40, 0.14);
        vec3 grassLight = vec3(0.28, 0.50, 0.18);
        vec3 grassFresh = vec3(0.35, 0.60, 0.25);

        // Milestone circles
        float lineThickness = 1.1;
        vec3 gridColor = bgColor;
        float currentAnimatedRadius = uOasisRadius * uForestRadius;

        float milestones[25];
        milestones[0] = uMilestone0; milestones[1] = uMilestone1;
        milestones[2] = uMilestone2; milestones[3] = uMilestone3;
        milestones[4] = uMilestone4; milestones[5] = uMilestone5;
        milestones[6] = uMilestone6; milestones[7] = uMilestone7;
        milestones[8] = uMilestone8; milestones[9] = uMilestone9;
        milestones[10] = uMilestone10; milestones[11] = uMilestone11;
        milestones[12] = uMilestone12; milestones[13] = uMilestone13;
        milestones[14] = uMilestone14; milestones[15] = uMilestone15;
        milestones[16] = uMilestone16; milestones[17] = uMilestone17;
        milestones[18] = uMilestone18; milestones[19] = uMilestone19;
        milestones[20] = uMilestone20; milestones[21] = uMilestone21;
        milestones[22] = uMilestone22; milestones[23] = uMilestone23;
        milestones[24] = uMilestone24;

        for (int i = 0; i < 25; i++) {
          float mRadius = milestones[i];
          if (mRadius > 0.0 && mRadius < 50000.0) {
            float circle = milestoneCircle(dist, mRadius, lineThickness);
            if (circle > 0.01) {
              float transitionStart = mRadius * 0.9;
              float opacity = smoothstep(transitionStart, mRadius, currentAnimatedRadius);
              opacity = mix(0.15, 1.0, opacity);
              gridColor = mix(gridColor, circleColor, circle * opacity);
            }
          }
        }

        // Rotating radial lines
        float rotationOffset = uTime * 0.015;
        float angle = atan(pos.y, pos.x) + rotationOffset;
        float radialLine = abs(fract(angle / (6.28318 / 12.0) + 0.5) - 0.5);
        radialLine = 1.0 - smoothstep(0.0, 0.015, radialLine);
        radialLine *= smoothstep(30.0, 80.0, dist);
        radialLine *= 1.0 - smoothstep(1200.0, 2000.0, dist);
        float dashPattern = sin(dist * 0.008 * 3.14159 + uTime * 0.5) * 0.5 + 0.5;
        radialLine *= mix(0.3, 1.0, smoothstep(0.3, 0.7, dashPattern));
        gridColor = mix(gridColor, vec3(0.4, 0.38, 0.32), radialLine * 0.35);

        // Grass texture
        float noiseSmall = fbm(pos * 0.1);
        float noiseMed = fbm(pos * 0.04 + 100.0);
        float grassClumps = voronoi(pos * 0.06);
        vec3 grassColor = mix(grassMid, grassLight, noiseMed);
        grassColor = mix(grassColor, grassDark, noiseSmall * 0.5);
        grassColor = mix(grassDark * 0.8, grassColor, smoothstep(0.0, 0.25, grassClumps));

        // Oasis edge
        float baseRadius = uOasisRadius * uForestRadius;
        float growthPhase = uOasisRadius * 10.0;
        float warpedNoise = fbmWarped(pos * 0.008, growthPhase);
        float edgeVariation = warpedNoise * baseRadius * 0.2;
        float tendrilAngle = atan(pos.y, pos.x);
        float tendrilNoise = fbm(vec2(tendrilAngle * 2.5, dist * 0.008) + growthPhase * 0.3);
        float tendrils = pow(sin(tendrilAngle * 6.0 + tendrilNoise * 5.0) * 0.5 + 0.5, 2.0) * baseRadius * 0.15;
        float oasisEdge = baseRadius + (edgeVariation - baseRadius * 0.1) + tendrils * 0.6;
        float transitionWidth = baseRadius * 0.12;
        float grassMask = 1.0 - smoothstep(oasisEdge - transitionWidth, oasisEdge + transitionWidth * 0.3, dist);

        float scatterNoise = fbm(pos * 0.04 + 500.0 + growthPhase);
        float scatteredGrass = smoothstep(0.55, 0.8, scatterNoise) * smoothstep(oasisEdge + transitionWidth * 2.0, oasisEdge - transitionWidth, dist) * 0.5 * uOasisRadius;
        float finalGrassMask = smoothstep(0.0, 0.08, max(grassMask, scatteredGrass));

        float edgeFreshness = exp(-pow((dist - oasisEdge) / (transitionWidth * 0.5), 2.0)) * uOasisRadius;
        grassColor = mix(grassColor, grassFresh, edgeFreshness * 0.5);

        // Lighting
        vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
        grassColor *= 0.4 + max(dot(vNormal, lightDir), 0.0) * 0.6;

        float edgeGlow = exp(-abs(dist - oasisEdge) / (transitionWidth * 0.5)) * 0.35 * uOasisRadius;
        grassColor += vec3(0.15, 0.25, 0.1) * edgeGlow * finalGrassMask;

        vec3 groundColor = mix(gridColor, grassColor, finalGrassMask);

        // Horizon fade
        float edgeFade = 1.0 - smoothstep(0.5 - fbm(pos * 0.005) * 0.05, 0.92 + fbm(pos * 0.005) * 0.05, vDistFromCenter);
        groundColor = mix(bgColor * 0.85, groundColor, edgeFade);
        groundColor *= 1.0 - smoothstep(0.5, 1.0, vDistFromCenter) * 0.25;

        gl_FragColor = vec4(groundColor, 1.0);
      }
    `,
    transparent: false,
    side: THREE.DoubleSide
  });

  ground = new THREE.Mesh(geometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const fogDensity = Math.max(0.00002, 0.00008 * (3000 / Math.max(groundRadius, 3000)));
  scene.fog = new THREE.FogExp2(new THREE.Color(0x2B2D26), fogDensity);
}

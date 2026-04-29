import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { Environment, OrbitControls, Center, Bounds } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import helvetikerJson from 'three/examples/fonts/helvetiker_regular.typeface.json';
import * as THREE from 'three';
import './Scene.css';

// Parse the bundled font once and reuse for every TextGeometry.
const HELVETIKER = new FontLoader().parse(helvetikerJson);


const useCanvasTexture = (canvas, { colorSpace = THREE.NoColorSpace } = {}) => {
  const [tex, setTex] = useState(null);
  useEffect(() => {
    if (!canvas) {
      setTex(null);
      return undefined;
    }
    // Best-practice texture setup for web PBR:
    //  - RepeatWrapping so material.repeat works
    //  - Anisotropy 16 (effectively max on every modern GPU) so glancing
    //    angles look sharp on the sphere/torus
    //  - LinearMipmapLinear filtering for clean minification
    //  - Trilinear sampling + auto-generated mipmaps
    //  - Color-space MUST be sRGB for diffuse, linear (NoColorSpace) for
    //    normal/roughness/AO/displacement (Khronos glTF spec)
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 16;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = true;
    t.colorSpace = colorSpace;
    t.needsUpdate = true;
    setTex(t);
    return () => t.dispose();
  }, [canvas, colorSpace]);
  return tex;
};

const applyRepeat = (tex, repeat) => {
  if (!tex) return;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.needsUpdate = true;
};

// Single MeshPhysicalMaterial shared by every mesh in the scene.
// Updates flow through 3 effects: textures, scalar PBR params, physical params.
const useSharedMaterial = (maps, material) => {
  const mat = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial();
    m.normalScale = new THREE.Vector2(1, 1);
    m.attenuationColor = new THREE.Color(1, 1, 1);
    m.sheenColor = new THREE.Color(1, 1, 1);
    m.emissive = new THREE.Color(0, 0, 0);
    m.specularColor = new THREE.Color(1, 1, 1);
    return m;
  }, []);

  const diffuse = useCanvasTexture(maps?.diffuse, { colorSpace: THREE.SRGBColorSpace });
  const normal = useCanvasTexture(maps?.normal);
  const roughness = useCanvasTexture(maps?.roughness);
  const bump = useCanvasTexture(maps?.height);
  const ao = useCanvasTexture(maps?.ao);
  const displacement = useCanvasTexture(maps?.displacement);

  useEffect(() => {
    mat.map = diffuse ?? null;
    mat.normalMap = normal ?? null;
    mat.roughnessMap = roughness ?? null;
    mat.bumpMap = bump ?? null;
    mat.aoMap = ao ?? null;
    mat.displacementMap = material.displacementScale > 0 ? (displacement ?? null) : null;
    [diffuse, normal, roughness, bump, ao, displacement].forEach((t) =>
      applyRepeat(t, material.repeat)
    );
    mat.needsUpdate = true;
  }, [mat, diffuse, normal, roughness, bump, ao, displacement, material.repeat, material.displacementScale]);

  // Standard PBR scalars
  useEffect(() => {
    mat.roughness = material.roughness;
    mat.metalness = material.metalness;
    mat.bumpScale = material.bumpScale;
    mat.displacementScale = material.displacementScale;
    mat.displacementBias = -material.displacementScale * 0.5;
    mat.normalScale.set(material.normalScale, material.normalScale);
    mat.envMapIntensity = material.envIntensity;
  }, [mat, material.roughness, material.metalness, material.bumpScale,
      material.displacementScale, material.normalScale, material.envIntensity]);

  // Physical extensions — transmission, clearcoat, sheen, anisotropy,
  // iridescence, specular intensity/color, emissive.
  useEffect(() => {
    mat.transmission = material.transmission ?? 0;
    mat.thickness = material.thickness ?? 0;
    mat.ior = material.ior ?? 1.5;
    mat.clearcoat = material.clearcoat ?? 0;
    mat.clearcoatRoughness = material.clearcoatRoughness ?? 0;
    mat.sheen = material.sheen ?? 0;
    mat.sheenRoughness = material.sheenRoughness ?? 0;
    mat.sheenColor.set(material.sheenColor || '#ffffff');
    if ('anisotropy' in mat) {
      mat.anisotropy = material.anisotropy ?? 0;
      mat.anisotropyRotation = material.anisotropyRotation ?? 0;
    }
    if ('iridescence' in mat) {
      mat.iridescence = material.iridescence ?? 0;
      mat.iridescenceIOR = material.iridescenceIOR ?? 1.3;
      mat.iridescenceThicknessRange = [
        material.iridescenceThicknessMin ?? 100,
        material.iridescenceThicknessMax ?? 400
      ];
    }
    if ('specularIntensity' in mat) {
      mat.specularIntensity = material.specularIntensity ?? 1;
      mat.specularColor.set(material.specularColor || '#ffffff');
    }
    mat.attenuationDistance = material.attenuationDistance > 0
      ? material.attenuationDistance : Infinity;
    mat.attenuationColor.set(material.attenuationColor || '#ffffff');
    mat.emissive.set(material.emissiveColor || '#000000');
    mat.emissiveIntensity = material.emissiveIntensity ?? 0;
    mat.needsUpdate = true;
  }, [mat,
    material.transmission, material.thickness, material.ior,
    material.clearcoat, material.clearcoatRoughness,
    material.sheen, material.sheenRoughness, material.sheenColor,
    material.anisotropy, material.anisotropyRotation,
    material.iridescence, material.iridescenceIOR,
    material.iridescenceThicknessMin, material.iridescenceThicknessMax,
    material.specularIntensity, material.specularColor,
    material.attenuationDistance, material.attenuationColor,
    material.emissiveColor, material.emissiveIntensity
  ]);

  return mat;
};

const PrimitiveMesh = ({ material, geometry, rotate }) => {
  const meshRef = useRef();
  useFrame((_, dt) => {
    if (meshRef.current && rotate) meshRef.current.rotation.y += dt * 0.15;
  });

  const geo =
    geometry === 'box' ? (
      <boxGeometry args={[1.3, 1.3, 1.3, 256, 256, 256]} />
    ) : geometry === 'torus' ? (
      <torusKnotGeometry args={[0.7, 0.22, 320, 48]} />
    ) : geometry === 'plane' ? (
      <planeGeometry args={[2, 2, 256, 256]} />
    ) : (
      <sphereGeometry args={[1, 256, 256]} />
    );

  return (
    <mesh ref={meshRef} castShadow receiveShadow>
      {geo}
      <primitive attach="material" object={material} />
    </mesh>
  );
};

// 3D extruded text. Rebuilds geometry whenever the text string or settings
// change. Auto-centers, generates uv2, and disposes the previous geometry.
const TextMesh = ({ material, rotate, text, settings }) => {
  const groupRef = useRef();
  const meshRef = useRef();

  const geometry = useMemo(() => {
    const safe = (text && text.length > 0 ? text : ' ').slice(0, 60);
    const g = new TextGeometry(safe, {
      font: HELVETIKER,
      size: settings.size,
      depth: settings.depth,
      curveSegments: 8,
      bevelEnabled: settings.bevel > 0,
      bevelThickness: settings.bevel * 0.4,
      bevelSize: settings.bevel,
      bevelSegments: 4,
      bevelOffset: 0
    });
    g.center();
    if (!g.getAttribute('uv2')) {
      const uv = g.getAttribute('uv');
      if (uv) g.setAttribute('uv2', uv);
    }
    return g;
  }, [text, settings.size, settings.depth, settings.bevel]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((_, dt) => {
    if (groupRef.current && rotate) groupRef.current.rotation.y += dt * 0.15;
  });

  return (
    <Bounds fit clip observe margin={1.25}>
      <Center>
        <group ref={groupRef}>
          <mesh
            ref={meshRef}
            geometry={geometry}
            castShadow
            receiveShadow
          >
            <primitive attach="material" object={material} />
          </mesh>
        </group>
      </Center>
    </Bounds>
  );
};

// Per-mesh material assignments. `assignments` is a Map<meshUuid, assetId>.
// `materialCache` is a Map<assetId, THREE.MeshPhysicalMaterial>. When a mesh
// has an entry in `assignments`, that material is used instead of the shared
// fallback `material`.
const GLBMesh = ({
  url,
  material,
  rotate,
  assignments,
  materialCache,
  onSceneReady,
  highlightUuid,
  bumpVersion
}) => {
  const gltf = useLoader(GLTFLoader, url);
  const groupRef = useRef();
  const cloned = useMemo(() => gltf.scene.clone(true), [gltf]);

  // Tag each mesh with stable info + register a useful name. We also build a
  // small "default" map so user can clear an assignment and revert.
  useEffect(() => {
    cloned.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.geometry && !child.geometry.getAttribute('uv2')) {
          const uv = child.geometry.getAttribute('uv');
          if (uv) child.geometry.setAttribute('uv2', uv);
        }
        if (!child.userData.tssOriginalName) {
          child.userData.tssOriginalName = child.name || `Mesh_${child.uuid.slice(0, 6)}`;
        }
      }
    });
    onSceneReady?.(cloned);
  }, [cloned, onSceneReady]);

  // Apply per-mesh materials whenever assignments / cache changes.
  useEffect(() => {
    cloned.traverse((child) => {
      if (!child.isMesh) return;
      const assetId = assignments?.get?.(child.uuid);
      const customMat = assetId ? materialCache?.get?.(assetId) : null;
      child.material = customMat || material;
      // Highlight selected/hovered mesh with a subtle emissive flash.
      if (child.uuid === highlightUuid && child.material) {
        child.material = child.material.clone();
        child.material.emissive = new THREE.Color('#ffd658');
        child.material.emissiveIntensity = 0.25;
      }
    });
  }, [cloned, material, assignments, materialCache, highlightUuid, bumpVersion]);

  useFrame((_, dt) => {
    if (groupRef.current && rotate) groupRef.current.rotation.y += dt * 0.15;
  });

  return (
    <Bounds fit clip observe margin={1.15}>
      <Center>
        <group ref={groupRef}>
          <primitive object={cloned} />
        </group>
      </Center>
    </Bounds>
  );
};


// Lighting rigs. Each entry defines two directional lights + ambient level.
const LIGHTING_PRESETS = {
  studio: {
    key: { position: [4, 5, 3], intensity: 1.1, color: '#ffffff' },
    fill: { position: [-4, -2, -3], intensity: 0.35, color: '#6b8bff' },
    ambient: 0.15
  },
  dramatic: {
    key: { position: [6, 2, 3], intensity: 2.1, color: '#fff5e8' },
    fill: { position: [-3, -4, -2], intensity: 0.08, color: '#ff6060' },
    ambient: 0.04
  },
  moonlight: {
    key: { position: [2, 8, 2], intensity: 0.85, color: '#c2d8ff' },
    fill: { position: [-3, -1, 2], intensity: 0.3, color: '#4055aa' },
    ambient: 0.06
  },
  backlit: {
    key: { position: [-3, 3, -6], intensity: 1.8, color: '#ffd4b0' },
    fill: { position: [2, -1, 4], intensity: 0.4, color: '#ffa070' },
    ambient: 0.08
  }
};

// Live 2×2 tiled preview of the diffuse map, painted into an overlay canvas.
const TilePreview = ({ canvas }) => {
  const ref = useRef(null);
  useEffect(() => {
    const target = ref.current;
    if (!target || !canvas) return;
    const ctx = target.getContext('2d');
    const size = target.width;
    const half = size / 2;
    ctx.imageSmoothingEnabled = true;
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
        ctx.drawImage(canvas, x * half, y * half, half, half);
      }
    }
  }, [canvas]);
  return (
    <div className="scene__tile-preview">
      <canvas ref={ref} className="scene__tile-canvas" width={144} height={144} />
      <span className="scene__tile-label">Tile 2×2</span>
    </div>
  );
};

// Apply tone-mapping exposure live (it lives on the renderer, not the
// material, so it has to flow in via a small helper component).
const ExposureSync = ({ value }) => {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMappingExposure = value;
  }, [gl, value]);
  return null;
};

// Bridge that exposes a `pickMeshAt(clientX, clientY)` function via a ref so
// outer drag-drop handlers (which fire on the DOM) can find which 3D mesh
// the cursor is over.
const PickerBridge = ({ pickerRef }) => {
  const { scene, camera, gl } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);

  useEffect(() => {
    if (!pickerRef) return undefined;
    pickerRef.current = (clientX, clientY) => {
      const rect = gl.domElement.getBoundingClientRect();
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const meshes = [];
      scene.traverse((o) => { if (o.isMesh) meshes.push(o); });
      const hits = raycaster.intersectObjects(meshes, false);
      return hits[0]?.object || null;
    };
    return () => { pickerRef.current = null; };
  }, [pickerRef, scene, camera, gl, raycaster, ndc]);

  return null;
};

const Scene = ({
  maps,
  material,
  geometry = 'sphere',
  rotate = true,
  environment = 'studio',
  lighting = 'studio',
  glbUrl,
  text3d = { text: 'PBR', size: 0.7, depth: 0.2, bevel: 0.02 },
  showTilePreview = true,
  customHdrUrl = null,
  cubemapId = null,
  showBackground = false,
  bgBlur = 0,
  pickerRef = null,
  assignments = null,
  materialCache = null,
  onGlbSceneReady = null,
  highlightUuid = null,
  assignmentsVersion = 0,
  hdrRotationY = 0,
  envIntensity = 1,
  bgIntensity = 1
}) => {
  const mat = useSharedMaterial(maps, material);
  const rig = LIGHTING_PRESETS[lighting] ?? LIGHTING_PRESETS.studio;

  return (
    <div className="scene">
      <Canvas
        className="scene__canvas"
        shadows={{ type: THREE.PCFSoftShadowMap, enabled: true }}
        camera={{ position: [0, 0, 3], fov: 42 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          // Khronos / three.js best-practice render pipeline:
          //   • output sRGB (so colors match the design)
          //   • ACES Filmic tone mapping (filmic highlight roll-off, no clipping)
          //   • premultipliedAlpha keeps blending correct
          toneMapping: THREE.ACESFilmicToneMapping,
          outputColorSpace: THREE.SRGBColorSpace,
          premultipliedAlpha: true
        }}
      >
        <color attach="background" args={['#0a0a0b']} />
        <ExposureSync value={material.exposure ?? 1} />
        <ambientLight intensity={rig.ambient} />
        <directionalLight
          position={rig.key.position}
          intensity={rig.key.intensity}
          color={rig.key.color}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-bias={-0.0002}
          shadow-normalBias={0.02}
        />
        <directionalLight
          position={rig.fill.position}
          intensity={rig.fill.intensity}
          color={rig.fill.color}
        />
        <Suspense fallback={null}>
          {cubemapId ? (
            <Environment
              files={[
                `${import.meta.env.BASE_URL}envmaps/${cubemapId}/px.png`,
                `${import.meta.env.BASE_URL}envmaps/${cubemapId}/nx.png`,
                `${import.meta.env.BASE_URL}envmaps/${cubemapId}/py.png`,
                `${import.meta.env.BASE_URL}envmaps/${cubemapId}/ny.png`,
                `${import.meta.env.BASE_URL}envmaps/${cubemapId}/pz.png`,
                `${import.meta.env.BASE_URL}envmaps/${cubemapId}/nz.png`
              ]}
              background={showBackground}
              blur={bgBlur}
              backgroundBlurriness={bgBlur}
              environmentIntensity={envIntensity}
              backgroundIntensity={bgIntensity}
              environmentRotation={[0, hdrRotationY, 0]}
              backgroundRotation={[0, hdrRotationY, 0]}
            />
          ) : customHdrUrl ? (
            <Environment
              files={customHdrUrl}
              background={showBackground}
              blur={bgBlur}
              backgroundBlurriness={bgBlur}
              environmentIntensity={envIntensity}
              backgroundIntensity={bgIntensity}
              environmentRotation={[0, hdrRotationY, 0]}
              backgroundRotation={[0, hdrRotationY, 0]}
            />
          ) : (
            <Environment
              preset={environment}
              background={showBackground}
              blur={bgBlur}
              backgroundBlurriness={bgBlur}
              environmentIntensity={envIntensity}
              backgroundIntensity={bgIntensity}
              environmentRotation={[0, hdrRotationY, 0]}
              backgroundRotation={[0, hdrRotationY, 0]}
            />
          )}
          {glbUrl ? (
            <GLBMesh
              url={glbUrl}
              material={mat}
              rotate={rotate}
              assignments={assignments}
              materialCache={materialCache}
              onSceneReady={onGlbSceneReady}
              highlightUuid={highlightUuid}
              bumpVersion={assignmentsVersion}
            />
          ) : geometry === 'text' ? (
            <TextMesh material={mat} rotate={rotate} text={text3d.text} settings={text3d} />
          ) : (
            <PrimitiveMesh material={mat} geometry={geometry} rotate={rotate} />
          )}
        <PickerBridge pickerRef={pickerRef} />
        </Suspense>
        <OrbitControls enablePan={false} minDistance={1.2} maxDistance={8} />
      </Canvas>
      {showTilePreview && maps?.diffuse && <TilePreview canvas={maps.diffuse} />}
    </div>
  );
};

export default Scene;

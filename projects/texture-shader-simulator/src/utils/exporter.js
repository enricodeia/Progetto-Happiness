// Exporters: download maps as PNG, bundle as a ZIP-less sequence, and produce
// a code snippet that another agent can drop into a three.js / R3F project.

import { imageDataToDataURL } from './textureMaps.js';

const downloadDataURL = (dataURL, filename) => {
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

export const downloadMap = (imageData, name) => {
  downloadDataURL(imageDataToDataURL(imageData), `${name}.png`);
};

export const downloadAllMaps = (maps, prefix = 'texture') => {
  Object.entries(maps).forEach(([key, img]) => {
    if (!img) return;
    downloadMap(img, `${prefix}_${key}`);
  });
};

// ---------------------------------------------------------------------------
// Code-snippet generation
// ---------------------------------------------------------------------------

const paramLines = (params) =>
  Object.entries(params)
    .map(([k, v]) => `  ${k}: ${typeof v === 'number' ? Number(v.toFixed(3)) : JSON.stringify(v)}`)
    .join(',\n');

export const buildThreeSnippet = ({ prefix = 'texture', params = {} } = {}) => `// three.js vanilla snippet
import * as THREE from 'three';

const loader = new THREE.TextureLoader();
const ${prefix} = {
  map: loader.load('${prefix}_diffuse.png'),
  normalMap: loader.load('${prefix}_normal.png'),
  roughnessMap: loader.load('${prefix}_roughness.png'),
  bumpMap: loader.load('${prefix}_height.png'),
  aoMap: loader.load('${prefix}_ao.png'),
  displacementMap: loader.load('${prefix}_displacement.png')
};

Object.values(${prefix}).forEach((t) => {
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
});
${prefix}.map.colorSpace = THREE.SRGBColorSpace;

const material = new THREE.MeshPhysicalMaterial({
  map: ${prefix}.map,
  normalMap: ${prefix}.normalMap,
  roughnessMap: ${prefix}.roughnessMap,
  bumpMap: ${prefix}.bumpMap,
  aoMap: ${prefix}.aoMap,
  displacementMap: ${prefix}.displacementMap,
  displacementScale: ${(params.displacementScale ?? 0).toFixed(3)},
  displacementBias: ${(-(params.displacementScale ?? 0) * 0.5).toFixed(3)},
  normalScale: new THREE.Vector2(${(params.normalScale ?? 1).toFixed(2)}, ${(params.normalScale ?? 1).toFixed(2)}),
  roughness: ${(params.roughness ?? 1).toFixed(2)},
  metalness: ${(params.metalness ?? 0).toFixed(2)},
  bumpScale: ${(params.bumpScale ?? 0.05).toFixed(3)},
  // Physical extensions
  transmission: ${(params.transmission ?? 0).toFixed(3)},
  thickness: ${(params.thickness ?? 0).toFixed(3)},
  ior: ${(params.ior ?? 1.5).toFixed(2)},
  clearcoat: ${(params.clearcoat ?? 0).toFixed(2)},
  clearcoatRoughness: ${(params.clearcoatRoughness ?? 0).toFixed(2)},
  sheen: ${(params.sheen ?? 0).toFixed(2)},
  sheenRoughness: ${(params.sheenRoughness ?? 0).toFixed(2)},
  sheenColor: new THREE.Color(${JSON.stringify(params.sheenColor ?? '#ffffff')}),
  anisotropy: ${(params.anisotropy ?? 0).toFixed(2)},
  iridescence: ${(params.iridescence ?? 0).toFixed(2)},
  iridescenceIOR: ${(params.iridescenceIOR ?? 1.3).toFixed(2)},
  attenuationDistance: ${(params.attenuationDistance ?? 0) > 0 ? params.attenuationDistance.toFixed(2) : 'Infinity'},
  attenuationColor: new THREE.Color(${JSON.stringify(params.attenuationColor ?? '#ffffff')}),
  // Specular F0
  specularIntensity: ${(params.specularIntensity ?? 1).toFixed(2)},
  specularColor: new THREE.Color(${JSON.stringify(params.specularColor ?? '#ffffff')}),
  // Emissive
  emissive: new THREE.Color(${JSON.stringify(params.emissiveColor ?? '#000000')}),
  emissiveIntensity: ${(params.emissiveIntensity ?? 0).toFixed(2)},
  // Anisotropy rotation (radians)
  anisotropyRotation: ${(params.anisotropyRotation ?? 0).toFixed(3)},
  // Iridescence thickness (nm)
  iridescenceThicknessRange: [${Math.round(params.iridescenceThicknessMin ?? 100)}, ${Math.round(params.iridescenceThicknessMax ?? 400)}]
});
// Renderer side:
//   renderer.toneMapping = THREE.ACESFilmicToneMapping;
//   renderer.toneMappingExposure = ${(params.exposure ?? 1).toFixed(2)};
// Use a high-poly geometry (e.g. SphereGeometry(1, 256, 256)) for displacement.
`;

export const buildR3FSnippet = ({ prefix = 'texture', params = {} } = {}) => `// React Three Fiber snippet
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

export function ${capitalize(prefix)}Material(props) {
  const maps = useTexture({
    map: '/${prefix}_diffuse.png',
    normalMap: '/${prefix}_normal.png',
    roughnessMap: '/${prefix}_roughness.png',
    bumpMap: '/${prefix}_height.png',
    aoMap: '/${prefix}_ao.png',
    displacementMap: '/${prefix}_displacement.png'
  });

  Object.values(maps).forEach((t) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
  });
  maps.map.colorSpace = THREE.SRGBColorSpace;

  return (
    <meshPhysicalMaterial
      {...maps}
      displacementScale={${(params.displacementScale ?? 0).toFixed(3)}}
      displacementBias={${(-(params.displacementScale ?? 0) * 0.5).toFixed(3)}}
      normalScale={[${(params.normalScale ?? 1).toFixed(2)}, ${(params.normalScale ?? 1).toFixed(2)}]}
      roughness={${(params.roughness ?? 1).toFixed(2)}}
      metalness={${(params.metalness ?? 0).toFixed(2)}}
      bumpScale={${(params.bumpScale ?? 0.05).toFixed(3)}}
      transmission={${(params.transmission ?? 0).toFixed(3)}}
      thickness={${(params.thickness ?? 0).toFixed(3)}}
      ior={${(params.ior ?? 1.5).toFixed(2)}}
      clearcoat={${(params.clearcoat ?? 0).toFixed(2)}}
      clearcoatRoughness={${(params.clearcoatRoughness ?? 0).toFixed(2)}}
      sheen={${(params.sheen ?? 0).toFixed(2)}}
      sheenRoughness={${(params.sheenRoughness ?? 0).toFixed(2)}}
      sheenColor={${JSON.stringify(params.sheenColor ?? '#ffffff')}}
      anisotropy={${(params.anisotropy ?? 0).toFixed(2)}}
      iridescence={${(params.iridescence ?? 0).toFixed(2)}}
      iridescenceIOR={${(params.iridescenceIOR ?? 1.3).toFixed(2)}}
      attenuationColor={${JSON.stringify(params.attenuationColor ?? '#ffffff')}}
      specularIntensity={${(params.specularIntensity ?? 1).toFixed(2)}}
      specularColor={${JSON.stringify(params.specularColor ?? '#ffffff')}}
      emissive={${JSON.stringify(params.emissiveColor ?? '#000000')}}
      emissiveIntensity={${(params.emissiveIntensity ?? 0).toFixed(2)}}
      anisotropyRotation={${(params.anisotropyRotation ?? 0).toFixed(3)}}
      iridescenceThicknessRange={[${Math.round(params.iridescenceThicknessMin ?? 100)}, ${Math.round(params.iridescenceThicknessMax ?? 400)}]}
      {...props}
    />
  );
}
// Tip: in your <Canvas gl={{ toneMapping: THREE.ACESFilmicToneMapping }} />
// also set toneMappingExposure on the renderer for matching look.
`;

export const buildJSONManifest = ({ prefix = 'texture', params = {}, source = null } = {}) =>
  JSON.stringify(
    {
      name: prefix,
      source,
      maps: {
        diffuse: `${prefix}_diffuse.png`,
        normal: `${prefix}_normal.png`,
        roughness: `${prefix}_roughness.png`,
        height: `${prefix}_height.png`,
        ao: `${prefix}_ao.png`,
        displacement: `${prefix}_displacement.png`
      },
      material: {
        roughness: Number((params.roughness ?? 1).toFixed(3)),
        metalness: Number((params.metalness ?? 0).toFixed(3)),
        normalScale: Number((params.normalScale ?? 1).toFixed(3)),
        bumpScale: Number((params.bumpScale ?? 0.05).toFixed(3)),
        displacementScale: Number((params.displacementScale ?? 0).toFixed(3))
      },
      generation: Object.fromEntries(
        Object.entries(params).map(([k, v]) => [
          k,
          typeof v === 'number' ? Number(v.toFixed(3)) : v
        ])
      )
    },
    null,
    2
  );

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export { paramLines };

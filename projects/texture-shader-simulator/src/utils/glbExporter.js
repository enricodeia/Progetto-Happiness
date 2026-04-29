// Export a three.js Object3D (typically the GLB scene with assigned
// materials) as a binary .glb file. Uses three's GLTFExporter under the hood.

import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

export const exportSceneAsGlb = (object3d, filename = 'scene') => {
  if (!object3d) return Promise.reject(new Error('No scene object to export'));

  const exporter = new GLTFExporter();
  return new Promise((resolve, reject) => {
    exporter.parse(
      object3d,
      (result) => {
        try {
          if (result instanceof ArrayBuffer) {
            const blob = new Blob([result], { type: 'model/gltf-binary' });
            triggerDownload(blob, `${filename}.glb`);
          } else {
            const blob = new Blob([JSON.stringify(result, null, 2)], {
              type: 'model/gltf+json'
            });
            triggerDownload(blob, `${filename}.gltf`);
          }
          resolve();
        } catch (err) {
          reject(err);
        }
      },
      reject,
      {
        binary: true,
        embedImages: true,
        // Only KHR extensions that are part of the official spec; physical
        // material fields (transmission/clearcoat/sheen/etc.) export as
        // KHR_materials_* automatically.
        includeCustomExtensions: false
      }
    );
  });
};

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};

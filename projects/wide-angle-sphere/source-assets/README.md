# source-assets

The originals the page's shipped assets are DERIVED from. Nothing in here is
served or bundled (it is outside `public/`), it is kept so the derivation can
be redone.

- `models/bowl-option-c.glb` — BOWL_OPTION C as exported from Cinema 4D
  (61.8 MB, 1.1 M vertices, uncompressed). What ships is the SAME geometry
  Draco-compressed to 2.2 MB: `npx @gltf-transform/cli draco source-assets/models/bowl-option-c.glb public/models/bowl-option-c.glb`.
  The decoder lives in `public/draco/` (copied from `three/examples/jsm/libs/draco/gltf/`).
- `fonts/ExposureTrialVAR.ttf` — the variable Exposure trial, raw TrueType
  (440 kB). What ships is the woff2 (217 kB), made with `wawoff2`.

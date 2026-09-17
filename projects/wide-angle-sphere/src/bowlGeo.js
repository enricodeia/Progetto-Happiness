import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import META from "./assets/studio-bowl.json";
import BIN_URL from "./assets/studio-bowl.bin?url";

// Where the bowl's geometry comes from. `bowl.model.source` picks one:
//
//   "glb"    — a GLB in public/models/ (BOWL_OPTION C). It exports as ONE mesh
//              with ONE material, but the geometry is a real hollow solid: an
//              outer shell and an inner one, welded at the rim. `splitShell`
//              separates them again so they can carry the two materials the
//              bowl has always had — A outside, B inside.
//   "studio" — the bowl studio's own pair of welded shells
//              (bowl-studio-source 2), decoded with that project's decoder so
//              the mesh is the same vertex for vertex: positions quantised to
//              uint16 against each mesh's bounding box, normals octahedral-
//              encoded to int16, real UVs from the GLB.
//                0 · "Bowl - Wooden-Setup C"        → slot A, the outer shell
//                1 · "Bowl - Wooden-Setup G Inside" → slot B, the inner surface
//
// Either way it arrives raw: `bowl.js` normalises it (widest span 1, centred).

function octDecode(x, y) {
  const nx = x / 32767;
  const ny = y / 32767;
  let vx = nx;
  let vy = ny;
  const vz = 1 - Math.abs(nx) - Math.abs(ny);
  if (vz < 0) {
    const tx = (1 - Math.abs(vy)) * (vx >= 0 ? 1 : -1);
    const ty = (1 - Math.abs(vx)) * (vy >= 0 ? 1 : -1);
    vx = tx;
    vy = ty;
  }
  const l = Math.hypot(vx, vy, vz) || 1;
  return [vx / l, vy / l, vz / l];
}

const SLOTS = ["A", "B"];
const cache = {};

/**
 * Separate an outer surface from an inner one inside a single welded mesh.
 *
 * The two are not separate connected components — the export welds them at the
 * rim — so connectivity cannot do it. What does: for a HOLLOW solid the mean of
 * its surface points lands inside the cavity, and from there the outer shell's
 * normals point away (`dot(n, p - c) > 0`) while the inner shell's point back
 * towards it. That holds at the base too, where both normals are vertical and a
 * radial test gives up, and it puts the rim annulus — where the dot is ~0 — on
 * the outside, which is where it reads.
 *
 * The two halves SHARE their vertex buffers and differ only by index, so this
 * costs an index array and not another 35 MB of positions.
 *
 * → [outer, inner], or null when the mesh really is a single surface.
 */
function splitShell(g) {
  const pos = g.getAttribute("position");
  const nor = g.getAttribute("normal");
  const index = g.getIndex();
  if (!index || !nor) return null;

  const n = pos.count;
  let cx = 0, cy = 0, cz = 0;
  for (let i = 0; i < n; i++) { cx += pos.getX(i); cy += pos.getY(i); cz += pos.getZ(i); }
  cx /= n; cy /= n; cz /= n;

  const src = index.array;
  const tris = src.length / 3;
  const Arr = n > 65535 ? Uint32Array : Uint16Array;
  const outer = new Arr(src.length);
  const inner = new Arr(src.length);
  let oi = 0, ii = 0;
  for (let t = 0; t < src.length; t += 3) {
    const a = src[t], b = src[t + 1], c = src[t + 2];
    const mx = (pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3 - cx;
    const my = (pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3 - cy;
    const mz = (pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3 - cz;
    const nx = (nor.getX(a) + nor.getX(b) + nor.getX(c)) / 3;
    const ny = (nor.getY(a) + nor.getY(b) + nor.getY(c)) / 3;
    const nz = (nor.getZ(a) + nor.getZ(b) + nor.getZ(c)) / 3;
    const dst = nx * mx + ny * my + nz * mz >= 0 ? outer : inner;
    const k = dst === outer ? (oi += 3) - 3 : (ii += 3) - 3;
    dst[k] = a; dst[k + 1] = b; dst[k + 2] = c;
  }
  // one lopsided side means it was never two surfaces
  const least = Math.min(oi, ii) / 3;
  if (least < tris * 0.1) return null;

  const half = (arr, count) => {
    const h = new THREE.BufferGeometry();
    for (const [name, attr] of Object.entries(g.attributes)) h.setAttribute(name, attr);
    h.setIndex(new THREE.BufferAttribute(arr.slice(0, count), 1));
    h.computeBoundingBox();
    h.computeBoundingSphere();
    return h;
  };
  return [half(outer, oi), half(inner, ii)];
}

/** The GLB. One mesh in the file is not necessarily one surface — see above. */
async function fromGlb(url) {
  // The file is Draco-compressed (perf pass, 2026-09-17: the same 1.1 M
  // vertices at 2.2 MB instead of 61.8 MB — the download used to gate the
  // hero's opening). The decoder is served from public/draco/ and decodes to
  // plain Float32 attributes, so the two applyMatrix4 passes below are exact.
  const draco = new DRACOLoader();
  draco.setDecoderPath("/draco/");
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);
  const gltf = await loader.loadAsync(url);
  draco.dispose();
  const out = [];
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    const g = o.geometry.clone();
    // bake the node's own transform in — the export can carry one
    g.applyMatrix4(o.matrixWorld);
    if (!g.getAttribute("normal")) g.computeVertexNormals();
    if (!g.getAttribute("uv")) {
      // the relief is evaluated in object space, so a missing UV set is not
      // fatal; the material only needs the attribute to exist
      const n = g.getAttribute("position").count;
      g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    }
    g.deleteAttribute("tangent");
    g.computeBoundingBox();
    g.computeBoundingSphere();
    out.push({ name: o.name || "bowl", geometry: g });
  });

  // Normalise to the SAME convention the studio bin arrives in — widest XZ
  // span 2 (radius 1), sitting on y = 0, centred on its own box.
  //
  // This is not cosmetic. The relief is procedural noise sampled in OBJECT
  // space, so `noiseSpace` and the noise's own `oscale` are read against these
  // units: a model authored at 28 cm instead of 2 would get a relief seven
  // times finer and read as glitter rather than as a hammered surface.
  const box = new THREE.Box3();
  for (const part of out) box.union(part.geometry.boundingBox);
  const size = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());
  const k = 2 / (Math.max(size.x, size.z) || 1);
  const m = new THREE.Matrix4()
    .makeTranslation(-centre.x * k, -box.min.y * k, -centre.z * k)
    .multiply(new THREE.Matrix4().makeScale(k, k, k));
  for (const part of out) {
    // before the split, so the shared vertex buffer is transformed ONCE
    part.geometry.applyMatrix4(m);
    part.geometry.computeBoundingBox();
    part.geometry.computeBoundingSphere();
  }

  // ...and only now does a welded solid become its two shells
  const shells = [];
  for (const part of out) {
    const pair = out.length === 1 ? splitShell(part.geometry) : null;
    const halves = pair
      ? [
          { name: `${part.name} · outside`, geometry: pair[0] },
          { name: `${part.name} · inside`, geometry: pair[1] },
        ]
      : [part];
    for (const h of halves) shells.push(h);
  }
  return shells.map((h, i) => ({
    name: h.name,
    slot: SLOTS[i] || "A",
    geometry: h.geometry,
    verts: h.geometry.getAttribute("position").count,
    tris: (h.geometry.index ? h.geometry.index.count : h.geometry.getAttribute("position").count) / 3,
  }));
}

/**
 * → [{ name, slot, geometry, verts, tris }] — decoded once per source, then
 * shared. `cfg` is `bowl.model`.
 */
export async function bowlGeometries(model = {}) {
  const key = model.source === "glb" ? `glb:${model.glb}` : "studio";
  if (cache[key]) return cache[key];
  if (model.source === "glb") {
    cache[key] = await fromGlb(model.glb);
    return cache[key];
  }
  const buf = await fetch(BIN_URL).then((r) => r.arrayBuffer());
  let off = 0;
  const out = [];

  META.meta.forEach((m, i) => {
    const nv = m.count;
    const qp = new Uint16Array(buf.slice(off, off + nv * 6)); off += nv * 6;
    const qn = new Int16Array(buf.slice(off, off + nv * 4)); off += nv * 4;
    const qu = new Uint16Array(buf.slice(off, off + nv * 4)); off += nv * 4;
    const idx =
      m.itype === 2
        ? new Uint16Array(buf.slice(off, off + m.icount * 2))
        : new Uint32Array(buf.slice(off, off + m.icount * 4));
    off += m.icount * m.itype;

    const P = new Float32Array(nv * 3);
    const N = new Float32Array(nv * 3);
    const U = new Float32Array(nv * 2);
    for (let v = 0; v < nv; v++) {
      P[v * 3]     = m.bmin[0] + (qp[v * 3]     / 65535) * m.bext[0];
      P[v * 3 + 1] = m.bmin[1] + (qp[v * 3 + 1] / 65535) * m.bext[1];
      P[v * 3 + 2] = m.bmin[2] + (qp[v * 3 + 2] / 65535) * m.bext[2];
      const n = octDecode(qn[v * 2], qn[v * 2 + 1]);
      N[v * 3] = n[0]; N[v * 3 + 1] = n[1]; N[v * 3 + 2] = n[2];
      U[v * 2]     = m.uvmin[0] + (qu[v * 2]     / 65535) * m.uvext[0];
      U[v * 2 + 1] = m.uvmin[1] + (qu[v * 2 + 1] / 65535) * m.uvext[1];
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(P, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(N, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(U, 2));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.name = m.name;
    g.computeBoundingBox();
    g.computeBoundingSphere();

    out.push({
      name: m.name,
      slot: SLOTS[i] || "A",
      geometry: g,
      verts: nv,
      tris: m.icount / 3,
    });
  });

  cache[key] = out;
  return out;
}

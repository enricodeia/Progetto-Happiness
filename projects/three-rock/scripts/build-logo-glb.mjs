/**
 * Bake the 4-arm Metalab logo into a high-poly GLB suitable for PBR + displacement.
 *
 * Run:   node scripts/build-logo-glb.mjs
 * Output: public/models/metalab-logo.glb
 *
 * What this does that the runtime ExtrudeGeometry can't:
 *   - extrudes the SVG arm with many bevel + curve segments
 *   - tessellates each face into ~maxEdgeLength sub-triangles, so a
 *     displacementMap actually has thousands of vertices to push
 *   - bakes the 4 rotated arms into one mesh
 *   - writes plane-projected UVs (X/Y of world position) so a tiling
 *     texture maps consistently across all four arms
 *   - exports as a single binary .glb via @gltf-transform/core
 *
 * The geometry density is ~150–250k triangles depending on
 * MAX_EDGE_LENGTH. Drop that to 0.04 for ~600k tris if you really
 * want the dispMap to sing.
 */

import { Document, NodeIO } from '@gltf-transform/core'
import * as THREE from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { TessellateModifier } from 'three/examples/jsm/modifiers/TessellateModifier.js'
// SVGLoader needs DOMParser (browser-only). The arm is a 6-point polygon
// with no curves, so we build the THREE.Shape by hand from the raw points.
const ARM_POINTS = [
  [265.582, 266.189],
  [352.398, 0],
  [271.002, 0],
  [203.251, 203.366],
  [0,       270.131],
  [0,       353.156],
]
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(__dirname, '..')

// ---------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------
const SVG_W = 353
const SVG_H = 354
const TARGET_SIZE = 1.45            // matches Rock.jsx default
const ARM_PATH = 'M265.582 266.189L352.398 0H271.002L203.251 203.366L0 270.131V353.156L265.582 266.189Z'

const EXTRUDE = {
  depth: 0.16,                      // world-space, scaled to fit the small logo
  bevelEnabled: true,
  bevelSize: 0.012,
  bevelThickness: 0.012,
  bevelSegments: 6,                 // smooth chamfer
  curveSegments: 8,
  steps: 1,
}

// Per-arm placement (world space, post-scale).
const ARMS = [
  { x: 0,    y:  0,    rotZ:   0 },
  { x: 0,    y: -1.43, rotZ:  90 },
  { x: 1.44, y: -1.43, rotZ: 180 },
  { x: 1.44, y:  0,    rotZ: 270 },
]

const MAX_EDGE_LENGTH = 0.05        // smaller = more triangles

// ---------------------------------------------------------------------
// Build one arm
// ---------------------------------------------------------------------
function buildArmGeometry() {
  const shape = new THREE.Shape()
  ARM_POINTS.forEach(([x, y], i) => {
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  })
  shape.closePath()
  const geo = new THREE.ExtrudeGeometry(shape, EXTRUDE)
  geo.translate(-SVG_W / 2, -SVG_H / 2, 0)
  geo.rotateX(Math.PI)
  const scale = TARGET_SIZE / SVG_W
  geo.scale(scale, scale, scale)
  geo.computeBoundingBox()
  const bb = geo.boundingBox
  geo.translate(0, 0, -(bb.max.z + bb.min.z) / 2)
  return geo
}

// ---------------------------------------------------------------------
// Compose 4 arms into one merged BufferGeometry
// ---------------------------------------------------------------------
function buildLogoGeometry() {
  const armGeo = buildArmGeometry()
  const positions = []
  const indices = []
  let vertOffset = 0

  for (const arm of ARMS) {
    const g = armGeo.clone()
    g.rotateZ((arm.rotZ * Math.PI) / 180)
    g.translate(arm.x, arm.y, 0)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i))
    }
    if (g.index) {
      const idx = g.index
      for (let i = 0; i < idx.count; i++) {
        indices.push(idx.getX(i) + vertOffset)
      }
    } else {
      // non-indexed → emit triangle indices in order
      for (let i = 0; i < pos.count; i++) indices.push(i + vertOffset)
    }
    vertOffset += pos.count
    g.dispose()
  }
  armGeo.dispose()

  let geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)

  // Weld duplicate verts at the seams between arms so the displacement
  // doesn't tear at the joins.
  geo = mergeVertices(geo, 1e-5)
  geo.computeVertexNormals()

  // Tessellate to add subdivisions inside each triangle. Multiple passes
  // because TessellateModifier only splits triangles whose longest edge
  // exceeds maxEdgeLength.
  const tess = new TessellateModifier(MAX_EDGE_LENGTH, 6)
  geo = tess.modify(geo)
  // TessellateModifier emits a non-indexed geometry; re-index it so
  // mergeVertices + GLB export can use the index buffer.
  if (!geo.index) {
    const fakeIndex = new Uint32Array(geo.attributes.position.count)
    for (let i = 0; i < fakeIndex.length; i++) fakeIndex[i] = i
    geo.setIndex(new THREE.BufferAttribute(fakeIndex, 1))
  }
  geo = mergeVertices(geo, 1e-5)
  geo.computeVertexNormals()

  // Plane-project UVs from world XY so a tiling map shares orientation
  // across the 4 arms. Y is flipped so the texture isn't upside-down.
  geo.computeBoundingBox()
  const bb = geo.boundingBox
  const sx = bb.max.x - bb.min.x
  const sy = bb.max.y - bb.min.y
  const pos = geo.attributes.position
  const uvArr = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i++) {
    uvArr[i * 2]     = (pos.getX(i) - bb.min.x) / sx
    uvArr[i * 2 + 1] = 1 - (pos.getY(i) - bb.min.y) / sy
  }
  geo.setAttribute('uv',  new THREE.BufferAttribute(uvArr, 2))
  geo.setAttribute('uv2', new THREE.BufferAttribute(uvArr, 2))

  return geo
}

// ---------------------------------------------------------------------
// Write to GLB via @gltf-transform/core
// ---------------------------------------------------------------------
async function exportGLB(geometry, outPath) {
  const doc = new Document()
  doc.getRoot().getAsset().generator = 'metalab-logo build-logo-glb.mjs'
  const buffer = doc.createBuffer()

  const positionsRaw = geometry.attributes.position.array
  const normalsRaw   = geometry.attributes.normal.array
  const uvsRaw       = geometry.attributes.uv.array
  const indicesRaw   = geometry.index.array

  // Make plain Float32 / Uint32 typed arrays (gltf-transform requires
  // them to be standalone, not three.js subtype shells).
  const positions = new Float32Array(positionsRaw)
  const normals   = new Float32Array(normalsRaw)
  const uvs       = new Float32Array(uvsRaw)
  const indices   = (positions.length / 3) > 65535
    ? new Uint32Array(indicesRaw)
    : new Uint16Array(indicesRaw)

  const positionAccessor = doc.createAccessor()
    .setType('VEC3').setBuffer(buffer).setArray(positions)
  const normalAccessor = doc.createAccessor()
    .setType('VEC3').setBuffer(buffer).setArray(normals)
  const uvAccessor = doc.createAccessor()
    .setType('VEC2').setBuffer(buffer).setArray(uvs)
  const indexAccessor = doc.createAccessor()
    .setType('SCALAR').setBuffer(buffer).setArray(indices)

  const primitive = doc.createPrimitive()
    .setIndices(indexAccessor)
    .setAttribute('POSITION', positionAccessor)
    .setAttribute('NORMAL',   normalAccessor)
    .setAttribute('TEXCOORD_0', uvAccessor)
    .setAttribute('TEXCOORD_1', uvAccessor)

  const mesh = doc.createMesh('metalab').addPrimitive(primitive)
  const node = doc.createNode('metalab').setMesh(mesh)
  doc.createScene('default').addChild(node)

  const io = new NodeIO()
  const glb = await io.writeBinary(doc)
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, glb)

  return { tris: indices.length / 3, verts: positions.length / 3, bytes: glb.byteLength }
}

// ---------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------
const outPath = resolve(PROJECT_ROOT, 'public/models/metalab-logo.glb')
console.log('Building Metalab logo GLB →', outPath)
const geo = buildLogoGeometry()
const stats = await exportGLB(geo, outPath)
console.log(`✓ wrote ${(stats.bytes / 1024).toFixed(1)} KB · ${stats.tris.toLocaleString()} tris · ${stats.verts.toLocaleString()} verts`)

/* ═══════════════════════════════════════════════════════════════════════════
   TREES — Tree generation, LOD system, cluster rendering
   ═══════════════════════════════════════════════════════════════════════════ */

const trees = [];
const treePositions = [];
const treeGroup = new THREE.Group();
scene.add(treeGroup);

const treeGeoCache = {};
let instancedTrunk = null;
let instancedLeaves = null;
let clusterMeshes = [];
let usingLOD = false;
let currentLODTier = 'detailed';

// ── Cluster Geometry Cache ────────────────────────────────────────────────

const clusterGeoCache = { cluster25: null, cluster100: null, cluster500: null };

function getClusterGeometry(size) {
  const key = `cluster${size}`;
  if (!clusterGeoCache[key]) {
    console.log(`Creating cluster geometry for ${size} trees...`);
    clusterGeoCache[key] = createClusterGeometry(size);
  }
  return clusterGeoCache[key];
}

// ── LOD Tier 1 & 2: Individual/Instanced ──────────────────────────────────

function createLODTreeGeometry() {
  const trunkGeom = new THREE.CylinderGeometry(0.3, 0.5, 3.5, 3);
  trunkGeom.translate(0, 1.75, 0);
  const canopyGeom = new THREE.ConeGeometry(2.8, 9, 4);
  canopyGeom.translate(0, 7.5, 0);
  return { trunk: trunkGeom, leaves: canopyGeom };
}

// ── LOD Tier 3-5: Cluster Geometries ──────────────────────────────────────

function createClusterGeometry(treesPerCluster) {
  const clusterRadius = Math.sqrt(treesPerCluster) * 1.8;
  const trunkPositions = [], trunkIndices = [];
  const canopyPositions = [], canopyIndices = [];
  let trunkVertexOffset = 0, canopyVertexOffset = 0;

  const baseTrunk = new THREE.CylinderGeometry(0.25, 0.4, 3, 3);
  const baseCanopy = new THREE.ConeGeometry(2.2, 7, 4);
  const trunkPosAttr = baseTrunk.attributes.position;
  const trunkIdxAttr = baseTrunk.index;
  const canopyPosAttr = baseCanopy.attributes.position;
  const canopyIdxAttr = baseCanopy.index;

  for (let i = 0; i < treesPerCluster; i++) {
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const angle = i * goldenAngle;
    const radius = Math.sqrt(i / treesPerCluster) * clusterRadius;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const scale = 0.55 + Math.random() * 0.5;
    const yRotation = Math.random() * Math.PI * 2;

    for (let v = 0; v < trunkPosAttr.count; v++) {
      const vx = trunkPosAttr.getX(v) * scale;
      const vy = (trunkPosAttr.getY(v) + 1.5) * scale;
      const vz = trunkPosAttr.getZ(v) * scale;
      trunkPositions.push(
        vx * Math.cos(yRotation) - vz * Math.sin(yRotation) + x,
        vy,
        vx * Math.sin(yRotation) + vz * Math.cos(yRotation) + z
      );
    }
    for (let idx = 0; idx < trunkIdxAttr.count; idx++) trunkIndices.push(trunkIdxAttr.getX(idx) + trunkVertexOffset);
    trunkVertexOffset += trunkPosAttr.count;

    for (let v = 0; v < canopyPosAttr.count; v++) {
      const vx = canopyPosAttr.getX(v) * scale;
      const vy = (canopyPosAttr.getY(v) + 3.5 + 2.5) * scale;
      const vz = canopyPosAttr.getZ(v) * scale;
      canopyPositions.push(
        vx * Math.cos(yRotation) - vz * Math.sin(yRotation) + x,
        vy,
        vx * Math.sin(yRotation) + vz * Math.cos(yRotation) + z
      );
    }
    for (let idx = 0; idx < canopyIdxAttr.count; idx++) canopyIndices.push(canopyIdxAttr.getX(idx) + canopyVertexOffset);
    canopyVertexOffset += canopyPosAttr.count;
  }

  const trunkGeom = new THREE.BufferGeometry();
  trunkGeom.setAttribute('position', new THREE.Float32BufferAttribute(trunkPositions, 3));
  trunkGeom.setIndex(trunkIndices);
  trunkGeom.computeVertexNormals();

  const canopyGeom = new THREE.BufferGeometry();
  canopyGeom.setAttribute('position', new THREE.Float32BufferAttribute(canopyPositions, 3));
  canopyGeom.setIndex(canopyIndices);
  canopyGeom.computeVertexNormals();

  baseTrunk.dispose();
  baseCanopy.dispose();

  return { trunk: trunkGeom, leaves: canopyGeom, radius: clusterRadius, treesPerCluster };
}

// ── Cluster Forest ────────────────────────────────────────────────────────

function createClusterForest(treeCount, forestRadius, treesPerCluster) {
  clusterMeshes.forEach(mesh => { treeGroup.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); });
  clusterMeshes = [];

  const clusterGeo = getClusterGeometry(treesPerCluster);
  const clusterCount = Math.ceil(treeCount / treesPerCluster);

  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x2d1810, flatShading: true });
  const leavesMat = new THREE.MeshLambertMaterial({ color: 0x3d8b3d, flatShading: true });

  const instancedClusterTrunk = new THREE.InstancedMesh(clusterGeo.trunk, trunkMat, clusterCount);
  const instancedClusterLeaves = new THREE.InstancedMesh(clusterGeo.leaves, leavesMat, clusterCount);
  instancedClusterTrunk.castShadow = true;
  instancedClusterLeaves.castShadow = true;

  const dummy = new THREE.Object3D();
  const rng = new SeededRandom(seed);
  const densityFactor = 0.7;
  const clusterForestRadius = forestRadius * densityFactor;

  for (let i = 0; i < clusterCount; i++) {
    const treeIndexCenter = (i + 0.5) * treesPerCluster;
    const pos = fibonacciSpiral(treeIndexCenter, treeCount, clusterForestRadius);
    const x = pos.x + rng.range(-1.5, 1.5);
    const z = pos.z + rng.range(-1.5, 1.5);
    const rotation = rng.range(0, Math.PI * 2);
    const scale = 0.8 + rng.range(0, 0.35);

    dummy.position.set(x, 0, z);
    dummy.rotation.set(0, rotation, 0);
    dummy.scale.set(0, 0, 0);
    dummy.updateMatrix();
    instancedClusterTrunk.setMatrixAt(i, dummy.matrix);
    instancedClusterLeaves.setMatrixAt(i, dummy.matrix);

    treePositions.push({
      x, z, isNew: true, scale, rotation, index: i,
      isCluster: true, treesInCluster: treesPerCluster,
      distanceFromCenter: Math.sqrt(x * x + z * z)
    });
  }

  treePositions.sort((a, b) => a.distanceFromCenter - b.distanceFromCenter);
  treePositions.forEach((pos, idx) => { pos.sortedIndex = idx; });

  instancedClusterTrunk.instanceMatrix.needsUpdate = true;
  instancedClusterLeaves.instanceMatrix.needsUpdate = true;
  treeGroup.add(instancedClusterTrunk);
  treeGroup.add(instancedClusterLeaves);
  clusterMeshes.push(instancedClusterTrunk, instancedClusterLeaves);

  instancedTrunk = instancedClusterTrunk;
  instancedLeaves = instancedClusterLeaves;
  currentLODTier = `cluster${treesPerCluster}`;
  usingLOD = true;

  return { trunk: instancedClusterTrunk, leaves: instancedClusterLeaves };
}

// ── Instanced Forest ──────────────────────────────────────────────────────

function createInstancedForest(treeData, previousCount) {
  if (instancedTrunk) { treeGroup.remove(instancedTrunk); instancedTrunk.geometry.dispose(); instancedTrunk.material.dispose(); }
  if (instancedLeaves) { treeGroup.remove(instancedLeaves); instancedLeaves.geometry.dispose(); instancedLeaves.material.dispose(); }

  const count = treeData.length;
  const lodGeo = createLODTreeGeometry();
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x2d1810, flatShading: true });
  const leavesMat = new THREE.MeshLambertMaterial({ color: 0x3d8b3d, flatShading: true });

  instancedTrunk = new THREE.InstancedMesh(lodGeo.trunk, trunkMat, count);
  instancedLeaves = new THREE.InstancedMesh(lodGeo.leaves, leavesMat, count);
  instancedTrunk.castShadow = true;
  instancedLeaves.castShadow = true;

  const dummy = new THREE.Object3D();
  treeData.forEach((data, i) => {
    dummy.position.set(data.x, 0, data.z);
    dummy.rotation.set(0, data.rotation, 0);
    dummy.scale.set(0, 0, 0);
    dummy.updateMatrix();
    instancedTrunk.setMatrixAt(i, dummy.matrix);
    instancedLeaves.setMatrixAt(i, dummy.matrix);
    treePositions.push({ x: data.x, z: data.z, isNew: data.index >= previousCount, scale: data.scale, rotation: data.rotation, index: i });
  });

  instancedTrunk.instanceMatrix.needsUpdate = true;
  instancedLeaves.instanceMatrix.needsUpdate = true;
  treeGroup.add(instancedTrunk);
  treeGroup.add(instancedLeaves);
  usingLOD = true;

  return { trunk: instancedTrunk, leaves: instancedLeaves };
}

// ── Instanced Animation ──────────────────────────────────────────────────

function animateAllInstancedTrees(startIndex, endIndex, duration, stagger) {
  if (!instancedTrunk || !instancedLeaves) return;

  const dummy = new THREE.Object3D();
  const animState = { progress: 0 };

  let maxDist = 1;
  for (let i = startIndex; i < endIndex; i++) {
    const td = treePositions[i];
    if (td) {
      const d = td.distanceFromCenter || Math.sqrt(td.x * td.x + td.z * td.z);
      if (d > maxDist) maxDist = d;
    }
  }

  gsap.to(animState, {
    progress: 1, duration, ease: 'power1.inOut',
    onUpdate() {
      const progress = animState.progress;
      for (let i = startIndex; i < endIndex; i++) {
        const td = treePositions[i];
        if (!td) continue;
        const dist = td.distanceFromCenter || Math.sqrt(td.x * td.x + td.z * td.z);
        const normalizedDist = dist / maxDist;
        const waveWidth = 0.6;
        const treeProgress = Math.max(0, Math.min(1, (progress - normalizedDist * (1 - waveWidth)) / waveWidth));
        const scale = td.scale * easeOutBack(treeProgress);

        dummy.position.set(td.x, 0, td.z);
        dummy.rotation.set(0, td.rotation, 0);
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        instancedTrunk.setMatrixAt(td.index, dummy.matrix);
        instancedLeaves.setMatrixAt(td.index, dummy.matrix);
      }
      instancedTrunk.instanceMatrix.needsUpdate = true;
      instancedLeaves.instanceMatrix.needsUpdate = true;
    }
  });
}

// ── Individual Tree Creation ──────────────────────────────────────────────

function createMergedTreeGeometry(scale) {
  const trunkGeom = new THREE.CylinderGeometry(0.25 * scale, 0.45 * scale, 3.5 * scale, 4);
  trunkGeom.translate(0, 1.75 * scale, 0);
  const canopy1 = new THREE.ConeGeometry(3.0 * scale, 5 * scale, 5);
  canopy1.translate(0, 5.5 * scale, 0);
  const canopy2 = new THREE.ConeGeometry(2.0 * scale, 4 * scale, 5);
  canopy2.translate(0, 8.5 * scale, 0);

  if (typeof THREE.BufferGeometryUtils !== 'undefined') {
    return { trunk: trunkGeom, leaves: THREE.BufferGeometryUtils.mergeBufferGeometries([canopy1, canopy2]) };
  }
  return { trunk: trunkGeom, canopy1, canopy2 };
}

function createTree(scale, leafColor, isNew) {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x2d1810, flatShading: true });
  const leafMatProps = { color: leafColor, flatShading: true };
  if (isNew) { leafMatProps.emissive = leafColor; leafMatProps.emissiveIntensity = 0.08; }
  const leafMat = new THREE.MeshLambertMaterial(leafMatProps);

  const cacheKey = Math.round(scale * 10);
  if (!treeGeoCache[cacheKey]) treeGeoCache[cacheKey] = createMergedTreeGeometry(scale);
  const geos = treeGeoCache[cacheKey];

  const trunk = new THREE.Mesh(geos.trunk, trunkMat);
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  if (geos.leaves) {
    const leaves = new THREE.Mesh(geos.leaves, leafMat);
    leaves.castShadow = true;
    leaves.receiveShadow = true;
    group.add(leaves);
  } else {
    [geos.canopy1, geos.canopy2].forEach(g => { const m = new THREE.Mesh(g, leafMat); m.castShadow = true; group.add(m); });
  }
  return group;
}

function generateTreeData(count) {
  const data = [];
  const rng = new SeededRandom(seed);
  const radius = Math.sqrt(count) * 4.5;
  for (let i = 0; i < count; i++) {
    const pos = fibonacciSpiral(i, count, radius);
    data.push({ x: pos.x + rng.range(-1.2, 1.2), z: pos.z + rng.range(-1.2, 1.2), scale: rng.range(0.7, 1.2), rotation: rng.range(0, Math.PI * 2), index: i });
  }
  return data;
}

function createTreeFromData(data, isNewGrowth) {
  const tree = createTree(data.scale, 0x3d8b3d, isNewGrowth);
  tree.position.set(data.x, 0, data.z);
  tree.rotation.y = data.rotation;
  tree.userData.index = data.index;
  tree.userData.originalScale = data.scale;
  tree.scale.set(0, 0, 0);
  return tree;
}

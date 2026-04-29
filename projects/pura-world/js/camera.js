/* ═══════════════════════════════════════════════════════════════════════════
   CAMERA — Camera state, composition calculator
   ═══════════════════════════════════════════════════════════════════════════ */

let targetRotation = { x: 0, y: 0.35 };
let currentRotation = { x: 0, y: 0.35 };
let cameraDistance = 160;
let targetDistance = 160;
let cameraTarget = new THREE.Vector3(0, 0, 0);
let cameraHeight = 20;
let targetCameraHeight = 20;
let introAnimating = false;
let introComplete = false;

// Camera composition — calculates optimal camera for a given forest
function calculateCameraComposition(treeCount, forestRadius) {
  const fovDegrees = 75;
  const fovRad = (fovDegrees * Math.PI) / 180;
  const aspect = 390 / 844;
  const viewportFill = 0.95;

  const pitchMin = 0.28;
  const pitchMax = 0.48;
  const pitchScale = Math.min(1, Math.log10(Math.max(1, treeCount)) / 3);
  const pitch = pitchMin + (pitchMax - pitchMin) * pitchScale;

  const halfVFov = fovRad / 2;
  const halfHFov = Math.atan(Math.tan(halfVFov) * aspect);
  const diameter = forestRadius * 2;

  let distance = (diameter / 2) / Math.tan(halfHFov) / viewportFill;
  let height = distance * Math.tan(pitch * (Math.PI / 2));

  // Minimum values for small counts
  if (treeCount <= 1) { distance = Math.max(distance, 28); height = Math.max(height, 16); }
  else if (treeCount <= 5) { distance = Math.max(distance, 32); height = Math.max(height, 18); }
  else if (treeCount <= 15) { distance = Math.max(distance, 38); height = Math.max(height, 22); }
  else if (treeCount <= 30) { distance = Math.max(distance, 45); height = Math.max(height, 26); }

  // Maximum clamps — scaled for massive forests
  const clusterBoost = treeCount > 50000 ? 1.5 : 1.0;
  const megaBoost = treeCount > 200000 ? 2.0 : clusterBoost;
  const ultraBoost = treeCount > 1000000 ? 4.0 : treeCount > 500000 ? 3.0 : megaBoost;
  distance = Math.min(distance, 2500 * ultraBoost);
  height = Math.min(height, 1800 * ultraBoost);

  return { distance, height, pitch, orbitAngle: Math.PI * 0.28 };
}

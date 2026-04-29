/* ═══════════════════════════════════════════════════════════════════════════
   APP — Main entry point, event handlers, animation loop
   ═══════════════════════════════════════════════════════════════════════════ */

// ── Event Handlers ────────────────────────────────────────────────────────

const setupPlay = document.getElementById('setup-play');
const setupRecord = document.getElementById('setup-record');

setupPlay.addEventListener('click', () => startExperience(false));
setupRecord.addEventListener('click', () => startExperience(true));

function startExperience(shouldRecord) {
  dayNumber = parseInt(document.getElementById('setup-day').value) || 1;
  monthName = document.getElementById('setup-month').value || 'January';
  previousCount = parseInt(document.getElementById('setup-previous').value) || 0;
  followersCount = parseInt(document.getElementById('setup-current').value) || 0;
  streakCount = parseInt(document.getElementById('setup-streak').value) || 1;

  if (followersCount < previousCount) followersCount = previousCount;
  const growth = followersCount - previousCount;

  // ── Reset state ─────────────────────────────────────────────────────────
  trees.forEach(tree => treeGroup.remove(tree));
  trees.length = 0;
  treePositions.length = 0;

  if (instancedTrunk) { treeGroup.remove(instancedTrunk); instancedTrunk.geometry.dispose(); instancedTrunk.material.dispose(); instancedTrunk = null; }
  if (instancedLeaves) { treeGroup.remove(instancedLeaves); instancedLeaves.geometry.dispose(); instancedLeaves.material.dispose(); instancedLeaves = null; }

  clusterMeshes.forEach(mesh => { treeGroup.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); });
  clusterMeshes.length = 0;

  Object.keys(clusterGeoCache).forEach(key => {
    if (clusterGeoCache[key]) {
      clusterGeoCache[key].trunk.dispose();
      clusterGeoCache[key].leaves.dispose();
      clusterGeoCache[key] = null;
    }
  });

  usingLOD = false;
  currentLODTier = 'detailed';

  // ── Setup scene ─────────────────────────────────────────────────────────
  revealProgress = 0;
  revealActive = true;
  if (groundMaterial?.uniforms) groundMaterial.uniforms.uOasisRadius.value = 0;

  currentZoneIndex = 0;
  forestRadius = Math.sqrt(followersCount) * 4.5;
  const groundRadius = Math.max(3000, forestRadius * 1.3);
  createSkyDome(new THREE.Color(0x2B2D26), new THREE.Color(0x3a3d32), groundRadius);
  createGround(forestRadius, 0xd4c4a8);
  updateShadowCamera(forestRadius);
  createMilestoneLabels(followersCount);

  if (groundMaterial?.uniforms) {
    groundMaterial.uniforms.uOasisRadius.value = 0;
    groundMaterial.uniforms.uCurrentFollowers.value = followersCount;
  }

  document.getElementById('intro-day-month').textContent = monthName;
  document.getElementById('setup-panel').classList.add('setup--hidden');
  document.getElementById('intro').classList.add('intro--active');

  // ── Pre-render warm-up ──────────────────────────────────────────────────
  revealProgress = 0;
  postMaterial.uniforms.uReveal.value = 0;
  postMaterial.uniforms.uMaskOpacity.value = 1.0;
  postMaterial.uniforms.uTime.value = 0;

  function preRender() {
    renderer.setRenderTarget(renderTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    postMaterial.uniforms.tDiffuse.value = renderTarget.texture;
    postMaterial.uniforms.uReveal.value = 0;
    postMaterial.uniforms.uMaskOpacity.value = 1.0;
    const prevTM = renderer.toneMapping;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.render(postScene, postCamera);
    renderer.toneMapping = prevTM;
  }

  preRender();
  requestAnimationFrame(() => {
    preRender();
    requestAnimationFrame(() => {
      preRender();
      requestAnimationFrame(() => {
        const canvasContainer = document.getElementById('canvas-container');
        canvasContainer.style.visibility = 'visible';
        canvasContainer.style.opacity = '1';
        if (shouldRecord) startRecording();
        setTimeout(() => playIntroSequence(growth, shouldRecord), 50);
      });
    });
  });
}

// ── Animation Loop ────────────────────────────────────────────────────────

let time = 0;

function animate() {
  requestAnimationFrame(animate);
  time += 0.005;

  const smoothFactor = 0.06;
  currentRotation.x += (targetRotation.x - currentRotation.x) * smoothFactor;
  currentRotation.y += (targetRotation.y - currentRotation.y) * smoothFactor;
  cameraDistance += (targetDistance - cameraDistance) * smoothFactor;
  cameraHeight += (targetCameraHeight - cameraHeight) * smoothFactor;

  camera.position.set(
    Math.sin(currentRotation.x) * cameraDistance,
    cameraHeight,
    Math.cos(currentRotation.x) * cameraDistance
  );
  camera.lookAt(0, 0, 0);

  // Tree sway (standard mode only)
  if (!usingLOD) {
    trees.forEach((tree, i) => {
      if (tree.scale.x > 0.1) {
        tree.rotation.z = Math.sin(time + i * 0.05) * 0.006;
        tree.rotation.x = Math.cos(time * 0.4 + i * 0.08) * 0.003;
      }
    });
  }

  if (groundMaterial?.uniforms) groundMaterial.uniforms.uTime.value = time * 5;
  if (starField?.material?.uniforms) starField.material.uniforms.uTime.value = time * 5;

  // Render
  if (revealActive) {
    renderer.setRenderTarget(renderTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    postMaterial.uniforms.tDiffuse.value = renderTarget.texture;
    postMaterial.uniforms.uReveal.value = revealProgress;
    postMaterial.uniforms.uTime.value = time * 5;
    const prevTM = renderer.toneMapping;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.render(postScene, postCamera);
    renderer.toneMapping = prevTM;
  } else {
    renderer.render(scene, camera);
  }
}

animate();

// ── Resize Handler ────────────────────────────────────────────────────────

function handleResize() {
  const frame = document.getElementById('frame');
  const isFullscreen = frame.classList.contains('frame--fullscreen');
  const width = isFullscreen ? window.innerWidth : 390;
  const height = isFullscreen ? window.innerHeight : 844;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);

  if (renderTarget) {
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    renderTarget.setSize(width * pixelRatio, height * pixelRatio);
    postMaterial.uniforms.uResolution.value.set(width, height);
  }
}

window.addEventListener('resize', handleResize);

// ── Auto-start with URL params ────────────────────────────────────────────

if (autoRecord || (paramDay && paramCurrent)) {
  document.getElementById('setup-day').value = dayNumber;
  document.getElementById('setup-month').value = monthName;
  document.getElementById('setup-previous').value = previousCount;
  document.getElementById('setup-current').value = followersCount;
  document.getElementById('setup-streak').value = streakCount;

  if (autoRecord) {
    document.getElementById('frame').classList.add('frame--fullscreen');
    handleResize();
  }

  setTimeout(() => setupPlay.click(), 500);
}

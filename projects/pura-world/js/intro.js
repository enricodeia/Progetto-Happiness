/* ═══════════════════════════════════════════════════════════════════════════
   INTRO — Cinematic intro sequence + CTA closing animation
   ═══════════════════════════════════════════════════════════════════════════ */

let currentZoneIndex = 0;
let maxGrownIndex = 0;
let growthStartTime = 0;
let forestRadius = 0;

function playIntroSequence(growth, shouldRecord) {
  const tl = gsap.timeline();

  // === PART 1: DAY INTRO ===
  tl.to('#intro-day-section', { opacity: 1, duration: 0.6, ease: 'power2.out' });
  tl.to({ val: 0 }, {
    val: dayNumber, duration: 1.0, ease: 'elastic.out(1, 0.6)',
    onUpdate: function() { document.getElementById('intro-day-number').textContent = Math.round(this.targets()[0].val); }
  }, '-=0.3');
  tl.to({}, { duration: 0.8 });
  tl.to('#intro-day-section', { opacity: 0, scale: 0.95, duration: 0.5, ease: 'power2.in' });

  // === PART 2: FOLLOWER COUNT ===
  tl.to('#intro-count-section', { opacity: 1, duration: 0.4, ease: 'power2.out' });
  tl.to({ val: 0 }, {
    val: previousCount, duration: 0.5, ease: 'power2.out',
    onUpdate: function() { document.getElementById('intro-count-number').textContent = Math.round(this.targets()[0].val).toLocaleString(); }
  }, '-=0.2');
  tl.to({}, { duration: 0.2 });

  tl.to('#intro-count-number', { className: 'intro__count-number intro__count-number--highlight', duration: 0.2 });
  tl.addLabel('countUp');
  tl.to({ val: previousCount }, {
    val: followersCount, duration: 1.0, ease: 'power2.inOut',
    onUpdate: function() { document.getElementById('intro-count-number').textContent = Math.round(this.targets()[0].val).toLocaleString(); }
  }, 'countUp');
  tl.add(animateGrowthBadge(growth), 'countUp');
  tl.to({}, { duration: 0.4 });

  // === PART 3: FOREST REVEAL ===
  tl.to('#intro-count-section', { opacity: 0, scale: 1.02, duration: 0.5, ease: 'power2.in' });

  const allTreeData = generateTreeData(followersCount);
  const finalForestRadius = Math.sqrt(followersCount) * 4.5;
  const lodTier = determineLODTier(followersCount);

  if (lodTier.method === 'cluster') {
    createClusterForest(followersCount, finalForestRadius, lodTier.treesPerUnit);
  } else if (lodTier.method === 'instanced') {
    createInstancedForest(allTreeData, previousCount);
  } else {
    allTreeData.forEach(data => {
      const tree = createTreeFromData(data, data.index >= previousCount);
      trees.push(tree);
      treeGroup.add(tree);
      treePositions.push({ x: data.x, z: data.z, isNew: data.index >= previousCount });
    });
  }

  const finalComposition = calculateCameraComposition(followersCount, finalForestRadius);
  const startComposition = {
    distance: Math.max(15, finalComposition.distance * 0.15),
    height: Math.max(8, finalComposition.height * 0.2),
    pitch: 0.2,
    orbitAngle: -Math.PI * 0.15
  };

  // Tree distances for radial growth
  let treeDistances = [];
  let maxTreeDistance = 1;

  if (usingLOD) {
    treeDistances = treePositions.map((data, idx) => ({ data, index: idx, distance: Math.sqrt(data.x ** 2 + data.z ** 2) }));
  } else {
    treeDistances = trees.map((tree, idx) => ({ tree, index: idx, distance: Math.sqrt(tree.position.x ** 2 + tree.position.z ** 2) }));
  }
  treeDistances.sort((a, b) => a.distance - b.distance);
  if (treeDistances.length > 0) maxTreeDistance = treeDistances[treeDistances.length - 1].distance;

  // Initialize camera
  tl.call(() => {
    cameraDistance = startComposition.distance;
    targetDistance = startComposition.distance;
    cameraHeight = startComposition.height;
    targetCameraHeight = startComposition.height;
    targetRotation = { x: startComposition.orbitAngle, y: startComposition.pitch };
    currentRotation = { x: startComposition.orbitAngle, y: startComposition.pitch };
    cameraTarget.set(0, 0, 0);
    growthStartTime = performance.now() / 1000;
    maxGrownIndex = 0;
    introAnimating = true;
    introComplete = false;
    revealProgress = 0;
    revealActive = true;
    postMaterial.uniforms.uReveal.value = 0;
    postMaterial.uniforms.uMaskOpacity.value = 1.0;
  });

  tl.to({}, { duration: 0.08 });

  // Synchronized fade-from-black
  tl.to('#intro', { backgroundColor: 'transparent', duration: 0.4, ease: 'power2.out' });
  tl.to(postMaterial.uniforms.uMaskOpacity, { value: 0, duration: 0.5, ease: 'power2.out' }, '<');
  tl.to({}, { duration: 0.05 });

  // Animation timing
  const totalDuration = Math.max(5, Math.min(8, 4 + followersCount / 200));
  const revealDuration = totalDuration * 0.85;
  const growthDuration = totalDuration * 0.95;
  const treeGrowTime = 1.5;
  const cameraDuration = totalDuration;

  tl.addLabel('growthStart');

  // Tree growth animation
  tl.call(() => {
    if (usingLOD) {
      animateAllInstancedTrees(0, treePositions.length, growthDuration, treeGrowTime);
    } else {
      treeDistances.forEach(({ tree, distance }) => {
        const normalizedDist = maxTreeDistance > 0 ? distance / maxTreeDistance : 0;
        const delay = Math.pow(normalizedDist, 0.85) * (growthDuration - treeGrowTime);
        const originalScale = tree.userData.originalScale || 1;

        tree.scale.set(0, 0, 0);
        tree.position.y = -0.5;

        const treeTl = gsap.timeline({ delay });
        treeTl.to(tree.position, { y: 0, duration: treeGrowTime * 0.3, ease: 'power2.out' }, 0);
        treeTl.to(tree.scale, { x: originalScale, y: originalScale * 1.12, z: originalScale, duration: treeGrowTime * 0.6, ease: 'back.out(1.4)' }, 0);
        treeTl.to(tree.scale, { y: originalScale, duration: treeGrowTime * 0.4, ease: 'elastic.out(1, 0.5)' }, treeGrowTime * 0.5);
        treeTl.fromTo(tree.rotation, { z: (Math.random() - 0.5) * 0.1 }, { z: 0, duration: treeGrowTime * 0.7, ease: 'power2.out' }, 0);
      });
    }
  });

  // Mask reveal
  tl.to({ progress: 0.005 }, {
    progress: 1, duration: revealDuration, ease: 'power2.out',
    onStart() { revealActive = true; },
    onUpdate: function() { revealProgress = this.targets()[0].progress; },
    onComplete() { revealProgress = 1; }
  }, 'growthStart');

  // Oasis growth
  tl.to({ oasis: 0 }, {
    oasis: 1, duration: growthDuration, ease: 'power1.inOut',
    onUpdate: function() {
      const val = this.targets()[0].oasis;
      if (groundMaterial?.uniforms) groundMaterial.uniforms.uOasisRadius.value = val;
      updateMilestoneLabelsOpacity(val * forestRadius);
    },
    onComplete() {
      if (groundMaterial?.uniforms) groundMaterial.uniforms.uOasisRadius.value = 1;
      updateMilestoneLabelsOpacity(forestRadius);
    }
  }, 'growthStart');

  // Camera pullback
  const camState = {
    dist: startComposition.distance, height: startComposition.height,
    pitch: startComposition.pitch, orbit: startComposition.orbitAngle
  };
  tl.to(camState, {
    dist: finalComposition.distance, height: finalComposition.height,
    pitch: finalComposition.pitch, orbit: finalComposition.orbitAngle,
    duration: cameraDuration, ease: 'power2.inOut',
    onUpdate: () => {
      targetDistance = camState.dist;
      targetCameraHeight = camState.height;
      targetRotation.x = camState.orbit;
      targetRotation.y = camState.pitch;
    }
  }, 'growthStart');

  tl.to({}, { duration: 0.6 });

  // === PART 4: FADE TO CTA ===
  tl.to('#intro', { opacity: 0, duration: 0.3, onComplete: () => { document.getElementById('intro').style.display = 'none'; } });
  tl.call(() => { introComplete = true; introAnimating = false; });

  // === PART 5: CTA SCREEN ===
  tl.add(buildCTATimeline(shouldRecord));
}

// ── CTA Timeline Builder ──────────────────────────────────────────────────

function buildCTATimeline(shouldRecord) {
  const ctaTl = gsap.timeline();
  const level = calculateLevel(followersCount);
  const progress = calculateProgress(followersCount);
  const toNextLevel = getFollowersToNextLevel(followersCount);
  const nextLevelInfo = getNextLevelInfo(followersCount);
  const acres = calculateAcres(followersCount);

  document.getElementById('cta-acres').textContent = '0';
  document.getElementById('cta-trees').textContent = '0';
  document.getElementById('cta-level').textContent = '0';
  document.getElementById('cta-streak-value').textContent = streakCount;

  if (nextLevelInfo) {
    document.getElementById('progress-highlight').textContent = `+${toNextLevel.toLocaleString()}`;
    document.querySelector('#cta-progress-text .cta__progress-label').textContent = `to Level ${nextLevelInfo.level}`;
  } else {
    document.getElementById('progress-highlight').textContent = 'MAX';
    document.querySelector('#cta-progress-text .cta__progress-label').textContent = 'LEVEL!';
  }

  const circumference = 2 * Math.PI * 120;
  const offset = circumference * (1 - progress / 100);

  gsap.set('#cta-level-badge', { opacity: 0, scale: 0.8, y: 20 });
  gsap.set('#cta-button', { opacity: 0, scale: 0.95 });
  gsap.set('#cta-stats', { opacity: 0, y: 15 });
  gsap.set('#cta-streak', { opacity: 0, scale: 0.8, y: -10, xPercent: -50 });
  gsap.set('#progress-ring', { opacity: 0, scale: 0.95 });
  document.getElementById('progress-ring-fill').style.strokeDashoffset = circumference;
  gsap.set('#cta-progress-text', { opacity: 0, y: 15 });
  gsap.set('#cta-text-logo', { y: '0%' });
  gsap.set('#cta-text-cta', { y: '100%' });
  gsap.set('#cta-text-handle', { y: '200%' });

  // Mask back in
  ctaTl.to({ mask: 0 }, {
    mask: 0.75, duration: 2.0, ease: 'power2.inOut',
    onUpdate: function() { if (postMaterial?.uniforms) postMaterial.uniforms.uMaskOpacity.value = this.targets()[0].mask; }
  });

  ctaTl.to('#cta-overlay', { opacity: 1, duration: 0.3, ease: 'power2.out' }, '-=0.5');
  ctaTl.to('#cta-level-badge', { opacity: 1, scale: 1, y: 0, duration: 0.8, ease: 'back.out(1.8)', onStart: () => createConfetti() }, '-=0.3');
  ctaTl.to({ val: 0 }, { val: level, duration: 0.6, ease: 'power2.out', onUpdate: function() { document.getElementById('cta-level').textContent = Math.round(this.targets()[0].val); } }, '-=0.6');
  ctaTl.to('#cta-streak', { opacity: 1, scale: 1, y: 0, xPercent: -50, duration: 0.5, ease: 'back.out(1.5)' }, '-=0.3');
  ctaTl.to('#cta-button', { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.5)' }, '-=0.3');
  ctaTl.to('#progress-ring', { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' }, '-=0.4');
  ctaTl.to('#cta-progress-text', { opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.2)' }, '-=0.4');

  const progressFillEl = document.getElementById('progress-ring-fill');
  ctaTl.to({ dashOffset: circumference }, {
    dashOffset: offset, duration: 1.5, ease: 'power2.out',
    onUpdate: function() { progressFillEl.style.strokeDashoffset = this.targets()[0].dashOffset; }
  }, '-=0.3');

  ctaTl.to('#cta-stats', { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, '-=0.6');

  ctaTl.add(() => createDigitRevealTimeline(document.getElementById('cta-acres'), acres, { staggerDelay: 0.06 }), '-=0.5');
  ctaTl.add(() => createDigitRevealTimeline(document.getElementById('cta-trees'), followersCount.toLocaleString(), { staggerDelay: 0.05 }), '-=0.4');

  ctaTl.to({}, { duration: 0.8 });

  // Text rotation: logo -> CTA -> handle (scale + opacity for polish)
  ctaTl.to('#cta-text-logo', { y: '-100%', scale: 0.9, opacity: 0, duration: 0.5, ease: 'power2.inOut' });
  ctaTl.to('#cta-text-cta', { y: '0%', scale: 1, opacity: 1, duration: 0.5, ease: 'power2.inOut' }, '-=0.4');
  ctaTl.to({}, { duration: 1.5 });
  ctaTl.to('#cta-text-cta', { y: '-100%', scale: 0.9, opacity: 0, duration: 0.5, ease: 'power2.inOut' });
  ctaTl.to('#cta-text-handle', { y: '0%', scale: 1, opacity: 1, duration: 0.5, ease: 'power2.inOut' }, '-=0.4');
  ctaTl.to({}, { duration: 3 });

  if (shouldRecord) {
    ctaTl.call(() => setTimeout(() => stopRecording(), 500));
  }

  return ctaTl;
}

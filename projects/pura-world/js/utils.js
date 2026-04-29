/* ═══════════════════════════════════════════════════════════════════════════
   UTILS — Seeded random, math helpers, milestone calculations
   ═══════════════════════════════════════════════════════════════════════════ */

class SeededRandom {
  constructor(seed) {
    this.seed = seed;
  }

  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  range(min, max) {
    return min + this.next() * (max - min);
  }
}

// Radius for a follower count
function getRadiusForFollowers(count) {
  return Math.sqrt(count) * 4.5;
}

// Milestone radii array
function getMilestoneRadii() {
  return MILESTONES.map(m => getRadiusForFollowers(m.followers));
}

// Fibonacci spiral positioning
function fibonacciSpiral(index, total, maxRadius) {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const theta = index * goldenAngle;
  const r = maxRadius * Math.sqrt(index / Math.max(total, 1));
  return { x: r * Math.cos(theta), z: r * Math.sin(theta) };
}

// Easing
function easeOutBack(x) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

// Acres covered (25 trees per acre)
function calculateAcres(treeCount) {
  return (treeCount / 25).toFixed(1);
}

// Current level
function calculateLevel(followers) {
  for (let i = MILESTONES.length - 1; i >= 0; i--) {
    if (followers >= MILESTONES[i].followers) return MILESTONES[i].level;
  }
  return 1;
}

// Next level info
function getNextLevelInfo(followers) {
  for (let i = 0; i < MILESTONES.length; i++) {
    if (followers < MILESTONES[i].followers) {
      return { level: MILESTONES[i].level, followers: MILESTONES[i].followers, name: MILESTONES[i].name };
    }
  }
  return null;
}

// Progress percentage to next level
function calculateProgress(followers) {
  let currentMilestone = MILESTONES[0];
  let nextMilestone = MILESTONES[1];

  for (let i = 0; i < MILESTONES.length; i++) {
    if (followers >= MILESTONES[i].followers) {
      currentMilestone = MILESTONES[i];
      nextMilestone = MILESTONES[i + 1] || null;
    }
  }

  if (!nextMilestone) return 100;

  const progress = ((followers - currentMilestone.followers) / (nextMilestone.followers - currentMilestone.followers)) * 100;
  return Math.min(100, Math.max(0, progress));
}

// Followers needed for next level
function getFollowersToNextLevel(followers) {
  const nextLevel = getNextLevelInfo(followers);
  return nextLevel ? nextLevel.followers - followers : 0;
}

// LOD tier detection
function determineLODTier(treeCount) {
  if (treeCount <= LOD_CONFIG.DETAILED_MAX)     return { tier: 'detailed',   treesPerUnit: 1,   method: 'individual' };
  if (treeCount <= LOD_CONFIG.INSTANCED_MAX)    return { tier: 'instanced',  treesPerUnit: 1,   method: 'instanced' };
  if (treeCount <= LOD_CONFIG.CLUSTER_25_MAX)   return { tier: 'cluster25',  treesPerUnit: 25,  method: 'cluster' };
  if (treeCount <= LOD_CONFIG.CLUSTER_100_MAX)  return { tier: 'cluster100', treesPerUnit: 100, method: 'cluster' };
  return { tier: 'cluster500', treesPerUnit: 500, method: 'cluster' };
}

// Font size scaling for digit display
function getScaledFontSize(value, baseSize = 32, minSize = 18) {
  const charCount = String(value).length;
  let scale = 1;
  if (charCount <= 4) scale = 1;
  else if (charCount <= 6) scale = 0.85;
  else if (charCount <= 8) scale = 0.70;
  else scale = 0.60;
  return Math.max(minSize, Math.round(baseSize * scale));
}

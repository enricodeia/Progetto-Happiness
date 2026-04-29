/* ═══════════════════════════════════════════════════════════════════════════
   CONFIG — Constants, milestones, zones, quality presets
   ═══════════════════════════════════════════════════════════════════════════ */

// URL Parameters
const urlParams = new URLSearchParams(window.location.search);
const autoRecord = urlParams.get('record') === '1';
const paramDay = urlParams.get('day');
const paramMonth = urlParams.get('month');
const paramPrev = urlParams.get('prev');
const paramCurrent = urlParams.get('current');
const paramStreak = urlParams.get('streak');

// State
let dayNumber = paramDay ? parseInt(paramDay) : 15;
let monthName = paramMonth || 'January';
let previousCount = paramPrev ? parseInt(paramPrev) : 1200;
let followersCount = paramCurrent ? parseInt(paramCurrent) : 1450;
let streakCount = paramStreak ? parseInt(paramStreak) : 15;
const seed = 42;

// Zone Configuration
const zones = [
  { name: 'Emerald Grove', trees: 500, fogColor: 0x8ac08a, skyColor: 0x9ad09a, leafColor: 0x3d7a3d },
  { name: 'Twilight Canopy', trees: 1000, fogColor: 0x7a9ab8, skyColor: 0x8aaac8, leafColor: 0x3a6a7a },
  { name: 'Golden Sanctuary', trees: 2500, fogColor: 0xb8b088, skyColor: 0xc8c098, leafColor: 0x787840 },
  { name: 'Violet Wilderness', trees: 5000, fogColor: 0xa888a8, skyColor: 0xb898b8, leafColor: 0x7a4a7a },
  { name: 'Aurora Forest', trees: 10000, fogColor: 0x80a890, skyColor: 0x90b8a0, leafColor: 0x4a7a6a },
];

function getCurrentZone(count) {
  for (let i = zones.length - 1; i >= 0; i--) {
    if (count >= zones[i].trees) return { zone: zones[i], index: i };
  }
  return { zone: zones[0], index: 0 };
}

function getZoneForTree(treeIndex) {
  for (let i = zones.length - 1; i >= 0; i--) {
    if (treeIndex >= zones[i].trees) return zones[Math.min(i + 1, zones.length - 1)];
  }
  return zones[0];
}

// Milestone System — 25 Levels from 100 to 50M
const MILESTONES = [
  { level: 1,  followers: 100,      name: 'Seed' },
  { level: 2,  followers: 250,      name: 'Sprout' },
  { level: 3,  followers: 500,      name: 'Seedling' },
  { level: 4,  followers: 1000,     name: 'Sapling' },
  { level: 5,  followers: 2000,     name: 'Young Tree' },
  { level: 6,  followers: 3500,     name: 'Grove' },
  { level: 7,  followers: 5000,     name: 'Thicket' },
  { level: 8,  followers: 7500,     name: 'Copse' },
  { level: 9,  followers: 10000,    name: 'Woods' },
  { level: 10, followers: 15000,    name: 'Woodland' },
  { level: 11, followers: 25000,    name: 'Forest' },
  { level: 12, followers: 40000,    name: 'Deep Woods' },
  { level: 13, followers: 60000,    name: 'Timberland' },
  { level: 14, followers: 85000,    name: 'Wildwood' },
  { level: 15, followers: 120000,   name: 'Greenwood' },
  { level: 16, followers: 175000,   name: 'Heartwood' },
  { level: 17, followers: 250000,   name: 'Great Forest' },
  { level: 18, followers: 400000,   name: 'Wilderness' },
  { level: 19, followers: 650000,   name: 'Old Growth' },
  { level: 20, followers: 1000000,  name: 'World Tree' },
  { level: 21, followers: 2000000,  name: 'Ancient Forest' },
  { level: 22, followers: 5000000,  name: 'Primeval' },
  { level: 23, followers: 10000000, name: 'Mythic Grove' },
  { level: 24, followers: 25000000, name: 'Eternal Canopy' },
  { level: 25, followers: 50000000, name: 'Yggdrasil' }
];

// LOD Tiers aligned with milestones
const LOD_CONFIG = {
  DETAILED_MAX: 10000,
  INSTANCED_MAX: 40000,
  CLUSTER_25_MAX: 85000,
  CLUSTER_100_MAX: 250000,
};

// Export Quality Presets
const PREVIEW_ASPECT = 390 / 844;

const QUALITY_PRESETS = {
  high:    { width: 1080, height: Math.round(1080 / PREVIEW_ASPECT), bitrate: 20000000 },
  medium:  { width: 720,  height: Math.round(720 / PREVIEW_ASPECT),  bitrate: 12000000 },
  tiktok:  { width: 1080, height: 1920,                              bitrate: 20000000 },
  preview: { width: 390,  height: 844,                               bitrate: 8000000 }
};

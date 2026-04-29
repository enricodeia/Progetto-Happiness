// Real PBR material presets (drive THREE.MeshPhysicalMaterial).
//
// Each entry is a partial state — only the fields it cares about. Loading a
// preset spreads it onto the current `material` so the user can keep their
// repeat / textures and just swap the SURFACE TYPE.

export const MATERIAL_TYPES = [
  {
    id: 'standard',
    label: 'Standard',
    icon: '◼',
    state: {
      metalness: 0,
      roughness: 0.7,
      transmission: 0,
      thickness: 0,
      ior: 1.5,
      clearcoat: 0,
      clearcoatRoughness: 0.1,
      sheen: 0,
      sheenRoughness: 0.5,
      sheenColor: '#ffffff',
      anisotropy: 0,
      iridescence: 0,
      iridescenceIOR: 1.3,
      attenuationDistance: 0,
      attenuationColor: '#ffffff'
    }
  },
  {
    id: 'glass',
    label: 'Glass',
    icon: '◇',
    state: {
      metalness: 0,
      roughness: 0.05,
      transmission: 1,
      thickness: 0.5,
      ior: 1.5,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      sheen: 0,
      anisotropy: 0,
      iridescence: 0,
      attenuationDistance: 1.5,
      attenuationColor: '#ffffff'
    }
  },
  {
    id: 'frosted-glass',
    label: 'Frosted Glass',
    icon: '◈',
    state: {
      metalness: 0,
      roughness: 0.45,
      transmission: 0.95,
      thickness: 0.6,
      ior: 1.45,
      clearcoat: 0.4,
      clearcoatRoughness: 0.6,
      attenuationDistance: 0.8,
      attenuationColor: '#ffffff'
    }
  },
  {
    id: 'ice',
    label: 'Ice',
    icon: '❄',
    state: {
      metalness: 0,
      roughness: 0.18,
      transmission: 0.85,
      thickness: 0.7,
      ior: 1.31,
      clearcoat: 0.6,
      clearcoatRoughness: 0.15,
      attenuationDistance: 0.6,
      attenuationColor: '#cfe7ff'
    }
  },
  {
    id: 'water',
    label: 'Water',
    icon: '~',
    state: {
      metalness: 0,
      roughness: 0,
      transmission: 1,
      thickness: 0.4,
      ior: 1.33,
      clearcoat: 1,
      clearcoatRoughness: 0,
      attenuationDistance: 0.8,
      attenuationColor: '#a5d8f5'
    }
  },
  {
    id: 'rubber',
    label: 'Rubber',
    icon: '●',
    state: {
      metalness: 0,
      roughness: 0.92,
      transmission: 0,
      sheen: 0.25,
      sheenRoughness: 0.5,
      sheenColor: '#222222',
      clearcoat: 0.15,
      clearcoatRoughness: 0.6
    }
  },
  {
    id: 'car-paint',
    label: 'Car Paint',
    icon: '◐',
    state: {
      metalness: 0.8,
      roughness: 0.35,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      transmission: 0,
      anisotropy: 0
    }
  },
  {
    id: 'lacquer',
    label: 'Lacquer',
    icon: '⦿',
    state: {
      metalness: 0,
      roughness: 0.4,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      sheen: 0,
      transmission: 0
    }
  },
  {
    id: 'velvet',
    label: 'Velvet',
    icon: '※',
    state: {
      metalness: 0,
      roughness: 0.85,
      sheen: 1,
      sheenRoughness: 0.3,
      sheenColor: '#ffe0c4',
      clearcoat: 0
    }
  },
  {
    id: 'silk',
    label: 'Silk',
    icon: '∽',
    state: {
      metalness: 0,
      roughness: 0.5,
      sheen: 0.9,
      sheenRoughness: 0.2,
      sheenColor: '#ffffff',
      anisotropy: 0.5,
      clearcoat: 0
    }
  },
  {
    id: 'brushed-metal',
    label: 'Brushed Metal',
    icon: '▦',
    state: {
      metalness: 1,
      roughness: 0.4,
      anisotropy: 0.85,
      clearcoat: 0,
      transmission: 0
    }
  },
  {
    id: 'mercury',
    label: 'Mercury',
    icon: '◯',
    state: {
      metalness: 1,
      roughness: 0.04,
      clearcoat: 0,
      anisotropy: 0
    }
  },
  {
    id: 'gold',
    label: 'Gold',
    icon: '◉',
    state: {
      metalness: 1,
      roughness: 0.18,
      clearcoat: 0
    }
  },
  {
    id: 'pearl',
    label: 'Pearl',
    icon: '○',
    state: {
      metalness: 0,
      roughness: 0.3,
      clearcoat: 0.6,
      clearcoatRoughness: 0.15,
      iridescence: 0.55,
      iridescenceIOR: 1.4,
      sheen: 0.3,
      sheenRoughness: 0.4
    }
  },
  {
    id: 'soap-bubble',
    label: 'Soap Bubble',
    icon: '◌',
    state: {
      metalness: 0,
      roughness: 0,
      transmission: 1,
      thickness: 0.05,
      ior: 1.05,
      iridescence: 1,
      iridescenceIOR: 1.45,
      clearcoat: 1,
      clearcoatRoughness: 0
    }
  },
  {
    id: 'wax',
    label: 'Wax / Skin',
    icon: '◍',
    state: {
      metalness: 0,
      roughness: 0.45,
      transmission: 0.4,
      thickness: 1.2,
      ior: 1.4,
      clearcoat: 0.3,
      clearcoatRoughness: 0.3,
      attenuationDistance: 1.2,
      attenuationColor: '#ffd0b0'
    }
  },
  {
    id: 'porcelain',
    label: 'Porcelain',
    icon: '◖',
    state: {
      metalness: 0,
      roughness: 0.25,
      clearcoat: 0.4,
      clearcoatRoughness: 0.1,
      transmission: 0.15,
      thickness: 0.4,
      ior: 1.5,
      attenuationColor: '#ffffff'
    }
  },
  {
    id: 'iridescent',
    label: 'Iridescent',
    icon: '✦',
    state: {
      metalness: 0.5,
      roughness: 0.25,
      iridescence: 1,
      iridescenceIOR: 1.6,
      clearcoat: 0.4,
      clearcoatRoughness: 0.1
    }
  }
];

export const getMaterialType = (id) =>
  MATERIAL_TYPES.find((m) => m.id === id) || MATERIAL_TYPES[0];

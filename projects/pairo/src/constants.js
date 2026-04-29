export const SPRING_CONFIG = { stiffness: 300, damping: 24 }

export const C = {
  // Core
  bg: '#131313',
  surface: '#111111',
  surface2: '#181818',
  surface3: '#222222',
  // Brand
  orange: '#FF6B35',
  orangeLight: '#FF8F5E',
  orangeDim: 'rgba(255,107,53,.12)',
  orangeBorder: 'rgba(255,107,53,.2)',
  // Semantic
  green: '#34D399',
  red: '#F87171',
  blue: '#60A5FA',
  // Neutrals
  white: '#FAFAFA',
  text: '#E8E8E8',
  textSecondary: 'rgba(255,255,255,.55)',
  textTertiary: 'rgba(255,255,255,.3)',
  border: 'rgba(255,255,255,.07)',
  borderLight: 'rgba(255,255,255,.12)',
}

// Typography scale (matches DesignSystem.jsx)
export const TYPE = {
  display: { fontSize: 52, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.05 },
  h1: { fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15 },
  h2: { fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 },
  h3: { fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.25 },
  h4: { fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.3 },
  body: { fontSize: 14, fontWeight: 400, lineHeight: 1.5 },
  bodySmall: { fontSize: 13, fontWeight: 400, lineHeight: 1.5 },
  caption: { fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' },
  micro: { fontSize: 9.5, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' },
}

// Spacing scale (4px base)
export const SPACE = [0, 4, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64]
// Usage: SPACE[1] = 4, SPACE[6] = 16, etc.

// Border radius scale
export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  pill: 50,
  full: '50%',
}

// Motion presets
export const SPRINGS = {
  default: { type: 'spring', stiffness: 300, damping: 24 },
  gentle: { type: 'spring', stiffness: 120, damping: 14 },
  snappy: { type: 'spring', stiffness: 350, damping: 35 },
  exit: { type: 'spring', stiffness: 400, damping: 40 },
  modal: { type: 'spring', stiffness: 300, damping: 28 },
  card: { type: 'spring', stiffness: 260, damping: 26 },
}

export const DURATION = {
  instant: 0.15,
  fast: 0.2,
  normal: 0.3,
  slow: 0.6,
}

// Shadows
export const SHADOW = {
  sm: '0 2px 8px rgba(0,0,0,.3)',
  md: '0 8px 24px rgba(0,0,0,.4)',
  lg: '0 16px 48px rgba(0,0,0,.5)',
  xl: '0 32px 100px rgba(0,0,0,.6)',
  glow: `0 0 24px rgba(255,107,53,.15)`,
  glowStrong: `0 8px 32px rgba(255,107,53,.35)`,
}

export const SWIPE_THRESHOLD = 100
export const EXIT_SPRING = { type: 'spring', stiffness: 400, damping: 40 }

export const ALL_ROLE_TYPES = ['Designer', 'Developer', 'Product', 'Marketing', 'Founder', 'Strategist', 'Writer', 'Researcher']
export const ALL_INDUSTRIES = ['Tech', 'Design', 'Finance', 'Healthcare', 'Education', 'Creative', 'Media', 'E-commerce']

export const DEMO_PROFILES = [
  {
    id: 1, name: 'Mara Solano', verified: true, role: 'Senior Product Designer', company: 'Figma', years: 6,
    location: 'Barcelona', distance: '2 km', availability: 'Open to work', type: 'Full-time', compatibility: 94,
    photo_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face',
    photos: [
      'url(https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=900&fit=crop&crop=face)',
      'url(https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&h=900&fit=crop)',
      'url(https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&h=900&fit=crop&crop=face)',
    ],
    skills: ['Product Design', 'Design Systems', 'Prototyping', 'User Research', 'Figma'],
    bio: 'Design lead passionate about building systems that scale. Previously shaped design culture at two YC startups before joining Figma. I believe the best products feel invisible.',
    prompts: [
      { q: 'A project I\'m proud of', a: 'Led the redesign of Figma\'s component library, reducing adoption friction by 40% across enterprise teams.' },
      { q: 'What I look for in a team', a: 'Craft-obsessed people who ship. I want to argue about kerning and still hit the deadline.' },
    ],
    work: [
      { label: 'Figma Components', color: '#6C5CE7', role: 'Lead Designer', year: '2024', desc: 'Redesigned Figma\'s core component library serving 4M+ users. Reduced design-to-dev handoff friction by 40% through better token architecture and interactive documentation.' },
      { label: 'Design System', color: '#00B894', role: 'System Architect', year: '2023', desc: 'Built a cross-platform design system from scratch for a Series B startup. 200+ components, dark mode, accessibility-first. Adopted by 3 product teams in the first month.' },
      { label: 'Mobile App', color: '#E17055', role: 'Product Designer', year: '2023', desc: 'End-to-end redesign of a fintech mobile app. Simplified onboarding from 12 steps to 4, increasing completion rate by 65%.' },
      { label: 'Brand Identity', color: '#0984E3', role: 'Brand Lead', year: '2022', desc: 'Full brand identity for a climate-tech startup. Logo, type system, color architecture, motion guidelines. The brand won a European Design Award.' },
    ],
  },
  {
    id: 2, name: 'Kai Andersen', verified: true, role: 'Full-Stack Engineer', company: 'Stripe', years: 8,
    location: 'Copenhagen', distance: '5 km', availability: 'Exploring', type: 'Remote', compatibility: 91,
    photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
    photos: [
      'url(https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=900&fit=crop&crop=face)',
      'url(https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&h=900&fit=crop&crop=face)',
      'url(https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=600&h=900&fit=crop&crop=face)',
    ],
    skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'System Design'],
    bio: 'Building payment infrastructure at scale. Former game developer turned fintech engineer. I care about APIs that developers actually enjoy using.',
    prompts: [
      { q: 'My working style', a: 'Deep focus blocks in the morning, collaborative sessions after lunch. I protect my flow state fiercely.' },
      { q: 'Best career advice I got', a: 'Write code that your future self won\'t curse at. Clarity beats cleverness every time.' },
    ],
    work: [
      { label: 'Payment API', color: '#635BFF', role: 'Tech Lead', year: '2024', desc: 'Architected Stripe\'s next-gen payment processing API. Handles 10M+ daily transactions with 99.999% uptime. Reduced integration time for developers by 50%.' },
      { label: 'Dashboard', color: '#00D4AA', role: 'Full-Stack', year: '2023', desc: 'Built a real-time analytics dashboard for merchant insights. React + D3 + WebSocket. Processes and visualizes 2TB of transaction data daily.' },
      { label: 'CLI Tools', color: '#FF6B6B', role: 'Developer', year: '2023', desc: 'Created Stripe CLI v2 with improved DX. Auto-completion, webhook testing, local dev environment. 100K+ monthly active users.' },
      { label: 'Open Source', color: '#FFA502', role: 'Maintainer', year: '2022', desc: 'Open-source React component library for payment UIs. 15K GitHub stars, used by 2,000+ companies. Fully typed, accessible, themeable.' },
    ],
  },
  {
    id: 3, name: 'Aisha Mensah', verified: false, role: 'Brand Designer', company: 'Freelance', years: 4,
    location: 'London', distance: '12 km', availability: 'Open to work', type: 'Contract', compatibility: 87,
    photo_url: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=400&fit=crop&crop=face',
    photos: [
      'url(https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=600&h=900&fit=crop&crop=face)',
      'url(https://images.unsplash.com/photo-1523824921871-d6f1a15151f1?w=600&h=900&fit=crop)',
      'url(https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&h=900&fit=crop&crop=face)',
    ],
    skills: ['Brand Identity', 'Typography', 'Art Direction', 'Illustration', 'Motion'],
    bio: 'Independent brand designer working with startups and cultural institutions. Every brand is a story, and I obsess over how that story looks at every touchpoint.',
    prompts: [
      { q: 'What excites me right now', a: 'The intersection of generative art and brand systems. I\'m exploring how algorithms can create living identities.' },
      { q: 'A hill I\'ll die on', a: 'Logos should work in monochrome first. If it needs color to be recognizable, it\'s not done yet.' },
    ],
    work: [
      { label: 'Startup Brand', color: '#E84393', role: 'Brand Designer', year: '2024', desc: 'Complete brand identity for a health-tech startup. Strategy, visual identity, brand book, and launch campaign. Raised $12M Series A post-rebrand.' },
      { label: 'Exhibition ID', color: '#FDCB6E', role: 'Art Director', year: '2023', desc: 'Identity system for the Serpentine Gallery\'s summer exhibition. Generative typography that changes based on real-time weather data.' },
      { label: 'Packaging', color: '#6C5CE7', role: 'Designer', year: '2023', desc: 'Sustainable packaging design for a DTC skincare brand. Minimalist, biodegradable materials. Won a Dieline Award for Best Sustainable Packaging.' },
      { label: 'Type Specimen', color: '#00CEC9', role: 'Type Designer', year: '2022', desc: 'Designed a variable typeface inspired by West African textile patterns. Released on Future Fonts with 500+ licenses sold in the first quarter.' },
    ],
  },
]

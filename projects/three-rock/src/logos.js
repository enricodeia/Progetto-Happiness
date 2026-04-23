// Curated 20 Metalab client logos (Sanity CDN, dark variants).
// Intrinsic dimensions are encoded in the filename (e.g. "-453x80.svg").
export const LOGOS = [
  { name: 'Midjourney',          url: 'https://cdn.sanity.io/images/nuxb3jim/production-july-2025/86ace95aa5031e4c4d984ee6a46f651421d620a9-210x38.svg' },
  { name: 'Apple',               url: 'https://cdn.sanity.io/images/nuxb3jim/production-july-2025/a360549331cf2a63f8cce2f8dc65e637a7db0ec8-40x48.svg' },
  { name: 'Meta',                url: 'https://cdn.sanity.io/images/nuxb3jim/production-july-2025/66844ff8cb5b3149f37b6e8e057c857bd30a1ea9-81x17.svg' },
  { name: 'YouTube',             url: 'https://cdn.sanity.io/images/nuxb3jim/production-july-2025/ee37aae556e8203b9d16f38bc94b2048466b5b4f-118x27.svg' },
  { name: 'Slack',               url: 'https://cdn.sanity.io/images/nuxb3jim/production-july-2025/a805afd82b51af28b4fb1811b20db320274502f3-130x33.svg' },
  { name: 'Coinbase',            url: 'https://cdn.sanity.io/images/nuxb3jim/production-july-2025/49d9e756fe55d5fd4dc7291d11c6a26b4c4df9ea-146x27.svg' },
  { name: 'Calvin Klein',        url: 'https://cdn.sanity.io/images/nuxb3jim/production-july-2025/7e6bdc24ee9f856ad0cf1efcf61dd42b3acd9f48-154x24.svg' },
  { name: 'Walmart',             url: 'https://cdn.sanity.io/images/nuxb3jim/production-july-2025/434ec0870a5f1bbe7a3244bb7c9a41ea9cbdd5fc-134x32.svg' },
  { name: 'Patreon',             url: 'https://cdn.sanity.io/images/nuxb3jim/production-july-2025/1d030e272d49b4fbfbe8b6c201ae7c33574845f2-485x80.svg' },
  { name: 'TED',                 url: 'https://cdn.sanity.io/images/nuxb3jim/production-july-2025/0a127043c25d952d3342388bbe0137955f5e7313-250x92.svg' },
  { name: 'The Atlantic',        url: 'https://cdn.sanity.io/images/nuxb3jim/production-july-2025/03f9fd4bbcfde8d4b5ae555f1905600d00ed0101-516x80.svg' },
  { name: 'Vimeo',               url: 'https://cdn.sanity.io/images/nuxb3jim/production-july-2025/3b2a07ce0901943abcbd221cc6353d6beecb66f5-100x30.svg' },
  { name: 'National Geographic', url: 'https://cdn.sanity.io/images/nuxb3jim/production-july-2025/3452995a050fe00b1f1be7471480f1131aa16939-404x120.svg' },
  { name: 'Threads',             url: 'https://cdn.sanity.io/images/nuxb3jim/production-july-2025/15b185ebb045e6ff3e49a23396d138bbc583c180-125x26.svg' },
  { name: 'Converse',            url: 'https://cdn.sanity.io/images/nuxb3jim/production-july-2025/3d4f7130749a470d3e71d6bf6562bb5d7074b562-184x23.svg' },
  { name: 'SiriusXM',            url: 'https://cdn.sanity.io/images/nuxb3jim/production-july-2025/e4907424917a3150d147bdc251205bb4e640c0fb-493x94.svg' },
  { name: 'Suno',                url: 'https://cdn.sanity.io/images/nuxb3jim/production-july-2025/169cbe10c2aa82f24b7e91e2fce29f9127c82701-470x117.svg' },
  { name: 'Upwork',              url: 'https://cdn.sanity.io/images/nuxb3jim/production-july-2025/ae4b01bb9aa5f1c9330feea664da2ba35b5356c3-671x181.svg' },
  { name: 'Neuralink',           url: 'https://cdn.sanity.io/images/nuxb3jim/production-july-2025/f08e9a36e6d6becbedfbb30486c5a4b96da42182-506x165.svg' },
]

export const parseLogoDims = (url) => {
  const m = url.match(/-(\d+)x(\d+)\.svg/)
  return m ? { w: +m[1], h: +m[2] } : null
}

// Clients for Version B pill list. image/video paths live under /public/Projects/<Brand>/.
// Spaces in folder/file names are URL-encoded.
// Display order here IS the order shown in the pill list (no more DnD panel).
const P = '/Projects'
export const CLIENTS = [
  { id: 'midjourney',  name: 'Midjourney',   description: 'Shipping the interface that redefined how creatives work with generative AI.',
    image: `${P}/Midjourney/Midjourney-Desktop.webp`,
    video: `${P}/Midjourney/Midjourney_Desktop-video.mp4` },
  { id: 'windsurf',    name: 'Windsurf',     description: 'A rebrand for the world’s leading AI code assistant.',
    image: `${P}/Windsurf/Windsurf.webp`,
    video: `${P}/Windsurf/Windsurf-Desktop-video.mp4` },
  { id: 'suno',        name: 'Suno',         description: 'A music studio in your browser: compose full tracks from a single text prompt.',
    image: `${P}/Suno/Suno.webp`,
    video: `${P}/Suno/Suno-Desktop-video.mp4` },
  { id: 'upwork',      name: 'Upwork',       description: 'Transforming the job board into the world’s marketplace for work.',
    image: `${P}/Upwork/Upwork.webp`,
    video: `${P}/Upwork/Upwork-Desktop-video.mp4` },
  { id: 'pitch',       name: 'Pitch',        description: 'Collaborative presentation software that’s easy to use.',
    image: `${P}/Pitch/Pitch.webp`,
    video: `${P}/Pitch/Pitch-Desktop-video.mp4` },
  { id: 'calvinklein', name: 'Calvin Klein', description: 'A digital flagship for one of fashion’s most iconic wordmarks.',
    image: `${P}/Calvin%20Klein/Calvin%20Klein.webp`,
    video: `${P}/Calvin%20Klein/CalvinKlein-Desktop-video.mp4` },
  { id: 'atoms',       name: 'Atoms',        description: 'E-commerce for a shoe brand that lives or dies on feel, fit and restraint.',
    image: `${P}/Atoms/Atoms.webp`,
    video: `${P}/Atoms/Atoms-Desktop-video.mp4` },
  { id: 'uber',        name: 'Uber',         description: 'The rider app launch that helped turn a local startup into a global verb.',
    image: `${P}/Uber/Uber.webp`,
    video: `${P}/Uber/Uber-Desktop-video.mp4` },
  { id: 'headspace',   name: 'Headspace',    description: 'Meditation, but make it a friendly daily ritual. 70M+ downloads, still going.',
    image: `${P}/Headspace/Headspace.webp`,
    video: `${P}/Headspace/Headspace-Desktop-video.mp4` },
  { id: 'robinhood',   name: 'Robinhood',    description: 'A fintech experience that moved millions from Wall Street to everyone’s phone.',
    image: `${P}/Robinhood/Robinhood-Desktop.webp`,
    video: `${P}/Robinhood/Robinhood-Desktop-%20Video.mp4` },
  { id: 'theathletic', name: 'The Athletic', description: 'Redesigning sports reporting to serve every fan.',
    image: `${P}/The%20Athletic/The%20Athetic.webp`,
    video: `${P}/The%20Athletic/Theathletic-Desktop-video.mp4` },
  { id: 'ro',          name: 'Ro',           description: 'Direct-to-patient telehealth platform built for privacy, trust and scale.',
    image: `${P}/Ro/Ro.webp`,
    video: `${P}/Ro/Ro-Desktop-video.mp4` },
  { id: 'atlantic',    name: 'The Atlantic', description: '162-year-old magazine, reimagined for the modern web reader.',
    image: `${P}/The%20Atlantic/theantlantic.webp`,
    video: `${P}/The%20Atlantic/Atlantic-Desktop-video.mp4` },
  { id: 'genies',      name: 'Genies',       description: 'A digital identity platform for authentic self-expression.',
    image: `${P}/Genies/Genies.webp`,
    video: `${P}/Genies/Genies-Desktop-video.mp4` },
  { id: 'allwork',     name: 'All Work',     description: 'See the full case study index — twelve years of shipping high-craft software.',
    image: null, video: null },
]

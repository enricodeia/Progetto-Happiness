import { describe, it, expect } from 'vitest'

// Inline the normalizeProfile function for testing
const normalizeProfile = (p) => {
  const rawPhotos = p.photos || []
  const photoUrls = rawPhotos.map(url =>
    url.startsWith('url(') ? url : `url(${url})`
  )
  if (p.photo_url && !rawPhotos.includes(p.photo_url)) {
    photoUrls.unshift(`url(${p.photo_url})`)
  }
  const photos = photoUrls.length > 0
    ? photoUrls
    : ['#2D1B4E', '#1B3A4E', '#4E3B1B', '#1B4E3A']

  return {
    id: p.id,
    name: p.name || 'Anonymous',
    verified: p.is_pro || false,
    role: p.role || '',
    company: p.company || '',
    years: p.years_experience || null,
    location: p.location || '',
    distance: '',
    availability: p.availability || '',
    type: '',
    compatibility: null,
    photo_url: p.photo_url || null,
    photos,
    skills: p.skills || [],
    bio: p.bio || '',
    prompts: p.prompts || [],
    work: [],
    looking_for: p.looking_for || '',
  }
}

describe('normalizeProfile', () => {
  it('returns fallback photos when no photos provided', () => {
    const result = normalizeProfile({ id: '1' })
    expect(result.photos).toEqual(['#2D1B4E', '#1B3A4E', '#4E3B1B', '#1B4E3A'])
  })

  it('wraps photo URLs in url() format', () => {
    const result = normalizeProfile({ id: '1', photos: ['https://example.com/photo.jpg'] })
    expect(result.photos[0]).toBe('url(https://example.com/photo.jpg)')
  })

  it('preserves already-wrapped urls', () => {
    const result = normalizeProfile({ id: '1', photos: ['url(https://example.com/photo.jpg)'] })
    expect(result.photos[0]).toBe('url(https://example.com/photo.jpg)')
  })

  it('adds photo_url as first photo', () => {
    const result = normalizeProfile({
      id: '1',
      photo_url: 'https://example.com/avatar.jpg',
      photos: ['https://example.com/other.jpg']
    })
    expect(result.photos[0]).toBe('url(https://example.com/avatar.jpg)')
    expect(result.photos[1]).toBe('url(https://example.com/other.jpg)')
  })

  it('defaults name to Anonymous', () => {
    expect(normalizeProfile({ id: '1' }).name).toBe('Anonymous')
  })

  it('maps is_pro to verified', () => {
    expect(normalizeProfile({ id: '1', is_pro: true }).verified).toBe(true)
    expect(normalizeProfile({ id: '1' }).verified).toBe(false)
  })

  it('maps years_experience to years', () => {
    expect(normalizeProfile({ id: '1', years_experience: 5 }).years).toBe(5)
  })
})

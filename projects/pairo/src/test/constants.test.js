import { describe, it, expect } from 'vitest'
import { C, DEMO_PROFILES, SPRING_CONFIG, SWIPE_THRESHOLD } from '../constants'

describe('Constants', () => {
  it('C has all required color values', () => {
    expect(C.bg).toBeDefined()
    expect(C.orange).toBe('#FF6B35')
    expect(C.white).toBe('#FAFAFA')
  })

  it('DEMO_PROFILES has 3 profiles', () => {
    expect(DEMO_PROFILES).toHaveLength(3)
    DEMO_PROFILES.forEach(p => {
      expect(p.name).toBeDefined()
      expect(p.skills).toBeInstanceOf(Array)
      expect(p.photos).toBeInstanceOf(Array)
    })
  })

  it('SPRING_CONFIG has stiffness and damping', () => {
    expect(SPRING_CONFIG.stiffness).toBe(300)
    expect(SPRING_CONFIG.damping).toBe(24)
  })

  it('SWIPE_THRESHOLD is a positive number', () => {
    expect(SWIPE_THRESHOLD).toBeGreaterThan(0)
  })
})

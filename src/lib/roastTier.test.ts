import { describe, expect, it } from 'vitest'
import { getRoastTier, roastTierLabel, roastTierPillTone } from '@/lib/roastTier'

describe('getRoastTier', () => {
  it('maps 0-2 to clear', () => {
    expect(getRoastTier(0)).toBe('clear')
    expect(getRoastTier(2)).toBe('clear')
  })
  it('maps 3-6 to flagged', () => {
    expect(getRoastTier(3)).toBe('flagged')
    expect(getRoastTier(6)).toBe('flagged')
  })
  it('maps 7-10 to roasted', () => {
    expect(getRoastTier(7)).toBe('roasted')
    expect(getRoastTier(10)).toBe('roasted')
  })
})

describe('roastTierPillTone', () => {
  it('maps each tier to the matching Pill tone', () => {
    expect(roastTierPillTone('clear')).toBe('success')
    expect(roastTierPillTone('flagged')).toBe('warn')
    expect(roastTierPillTone('roasted')).toBe('danger')
  })
})

describe('roastTierLabel', () => {
  it('gives a human label for each tier', () => {
    expect(roastTierLabel('clear')).toBe('Clear')
    expect(roastTierLabel('flagged')).toBe('Flagged')
    expect(roastTierLabel('roasted')).toBe('Roasted')
  })
})

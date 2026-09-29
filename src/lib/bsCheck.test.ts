import { describe, expect, it } from 'vitest'
import { runBsCheck, isSensitiveContent } from '@/lib/bsCheck'

describe('runBsCheck', () => {
  it('scores empty text as clean with no matches', () => {
    const result = runBsCheck('')
    expect(result.score).toBe(0)
    expect(result.matches).toEqual([])
  })

  it('scores a specific, concrete post as clean', () => {
    const result = runBsCheck(
      'We ran the numbers across three verticals this spring. Referral traffic from AI assistants is up 340% since January, and it converts at nearly the same rate as organic search.',
    )
    expect(result.score).toBe(0)
    expect(result.matches).toEqual([])
  })

  it('flags a classic inauthenticity opener', () => {
    const result = runBsCheck('Excited to announce my new chapter at a company I have officially joined.')
    const ids = result.matches.map((m) => m.id)
    expect(ids).toContain('excited-to-announce')
    expect(ids).toContain('new-chapter')
    expect(ids).toContain('officially')
    expect(result.byCategory.inauthenticity.length).toBeGreaterThan(0)
  })

  it('flags humble-brag phrasing under the humbleBrag category', () => {
    const result = runBsCheck('Humbled and honored to share I landed my dream job after being rejected 47 times.')
    expect(result.byCategory.humbleBrag.length).toBeGreaterThan(0)
  })

  it('flags engagement bait closers', () => {
    const result = runBsCheck('Great news today. Comment below if you agree, and follow for more like this.')
    expect(result.byCategory.engagementBait.length).toBeGreaterThan(0)
  })

  it('flags emoji abuse and repeated emoji', () => {
    const result = runBsCheck('🔥🔥🔥 Big news 🎉🎉🎉 today 🚀🚀🚀 for everyone 💯💯')
    const ids = result.matches.map((m) => m.id)
    expect(ids).toContain('emoji-abuse')
    expect(ids).toContain('repeated-emoji')
  })

  it('declines to score sensitive content instead of flagging it', () => {
    const result = runBsCheck('My father passed away last week and I want to share what that taught me.')
    expect(result.declined).toBe(true)
    expect(result.score).toBe(0)
    expect(result.matches).toEqual([])
  })

  it('caps the score at 10 even with many matches', () => {
    const overloaded = [
      'Excited to announce my new chapter, officially joining!',
      'Thank you to everyone who believed in me — shout-out to my mentor, shout-out to my team.',
      'Humbled and honored, this is my dream job, rejected 47 times before this.',
      'Comment below, follow for more, let that sink in.',
      '🔥🔥🔥🎉🎉🎉🚀🚀🚀 #blessed #grateful #humbled #grind #hustle #win',
    ].join(' ')
    const result = runBsCheck(overloaded)
    expect(result.score).toBe(10)
  })
})

describe('isSensitiveContent', () => {
  it('matches serious-topic keywords', () => {
    expect(isSensitiveContent('after the miscarriage we went through')).toBe(true)
    expect(isSensitiveContent('just a normal update about my week')).toBe(false)
  })
})

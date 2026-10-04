import { describe, expect, it } from 'vitest'
import { voiceCardToMarkdown } from '@/lib/voiceCardMarkdown'
import type { SynthesizedVoiceCard } from '@/data/types'

const card: SynthesizedVoiceCard = {
  positioningStatement: 'Alex is a partnerships lead who believes buyers decide before the call.',
  identity: { roleCompany: 'Partnerships, Acme', industry: 'Martech', coreExpertise: 'Channel deals', linkedinGoal: 'Inbound' },
  persona: {
    primary: { name: 'The Practitioner', description: 'Shows the work.' },
    secondary: { name: 'The Contrarian', description: 'Pushes back.' },
  },
  voiceTone: {
    adjectives: ['dry', 'direct'],
    communicationStyle: 'Plain.',
    corePrinciple: 'Voice is constant.',
    whatToAvoid: ['Corporate polish'],
    signaturePatterns: ['Opens with a number'],
  },
  contentPillars: [{ title: 'Buyer reality', description: 'What buyers do.', quote: 'Buyers lurk.' }],
  formatPreferences: { lengths: 'Short', structure: 'Detail then point', formatting: 'Line breaks', cta: 'Real questions' },
  opinions: ['Attribution is theatre.'],
  signatureQuotes: ['Buyers lurk.'],
  trustedSources: [],
  audience: { primary: 'Marketers', secondary: 'Founders' },
  memorySummary: 'Alex writes plainly.',
}

describe('voiceCardToMarkdown', () => {
  it('writes sections in template order and skips empty optional ones', () => {
    const md = voiceCardToMarkdown(card, 'Alex Example', '2026-06-18T00:00:00Z')
    expect(md).toContain('# LinkedIn Voice Card: Alex Example')
    expect(md.indexOf('## Personal Positioning Statement')).toBeLessThan(md.indexOf('## Identity Snapshot'))
    expect(md.indexOf('## Opinions & POV')).toBeLessThan(md.indexOf('## Audience'))
    expect(md).not.toContain('## Trusted Sources')
    expect(md).not.toContain('Location:')
    expect(md).toContain('## Memory Summary')
  })
})

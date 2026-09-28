import { describe, expect, it } from 'vitest'
import { parseVoiceCardImport } from '@/lib/voiceCardImport'

describe('parseVoiceCardImport', () => {
  it('extracts the positioning statement and opinion bullets, defaulting to personal_brand', () => {
    const text = `# Voice Card

## Personal Positioning Statement
I help performance marketers make sense of AI-driven attribution shifts.

## Opinions & POV
- "Attribution modeling is mostly theater."
- "Most 'AI strategy' decks are a reskinned 2019 slide."
`
    const result = parseVoiceCardImport(text)
    expect(result.povFingerprint).toBe(
      'I help performance marketers make sense of AI-driven attribution shifts.',
    )
    expect(result.opinions).toEqual([
      'Attribution modeling is mostly theater.',
      "Most 'AI strategy' decks are a reskinned 2019 slide.",
    ])
    expect(result.contentOrientation).toBe('personal_brand')
    expect(result.orientationDetected).toBe(false)
    expect(result.completenessPct).toBe(60)
  })

  it('detects Social Seller orientation from an Audience section', () => {
    const text = `## Personal Positioning Statement
I help RevOps leaders trust automation with their pipeline.

## Audience
Primarily a Social Seller motion — selling into mid-market RevOps teams.

## Opinions & POV
- "Most automation pitches skip the trust problem entirely."
`
    const result = parseVoiceCardImport(text)
    expect(result.contentOrientation).toBe('audience_sales')
    expect(result.orientationDetected).toBe(true)
  })

  it('does not misclassify a mention of "social seller" outside the audience/orientation/positioning sections', () => {
    const text = `## Personal Positioning Statement
I write about backend infra.

## Sources
I read a lot of social seller newsletters for fun, unrelated to my own content.

## Opinions & POV
- "Kubernetes is oversold for teams under 20 engineers."
`
    const result = parseVoiceCardImport(text)
    expect(result.contentOrientation).toBe('personal_brand')
    expect(result.orientationDetected).toBe(false)
  })

  it('caps extracted opinions at 5 even when more bullets are present', () => {
    const text = `## Opinions & POV
- One
- Two
- Three
- Four
- Five
- Six
- Seven
`
    const result = parseVoiceCardImport(text)
    expect(result.opinions).toHaveLength(5)
    expect(result.opinions).toEqual(['One', 'Two', 'Three', 'Four', 'Five'])
  })

  it('strips leading bullet markers and surrounding quote characters', () => {
    const text = `## Opinions & POV
* "Quoted opinion with asterisk bullet."
- 'Single-quoted opinion with dash bullet.'
`
    const result = parseVoiceCardImport(text)
    expect(result.opinions).toEqual([
      'Quoted opinion with asterisk bullet.',
      'Single-quoted opinion with dash bullet.',
    ])
  })

  it('falls back to a low completeness and a placeholder fingerprint when nothing recognizable is found', () => {
    const result = parseVoiceCardImport('Just some random pasted text with no headings at all.')
    expect(result.opinions).toEqual([])
    expect(result.completenessPct).toBe(15)
    expect(result.povFingerprint).toBe('Imported — refine by finishing a few interview questions.')
    expect(result.contentOrientation).toBe('personal_brand')
  })

  it('gives partial completeness when only one of positioning/opinions is found', () => {
    const onlyPositioning = parseVoiceCardImport('## Personal Positioning Statement\nJust this.')
    expect(onlyPositioning.completenessPct).toBe(35)

    const onlyOpinions = parseVoiceCardImport('## Opinions & POV\n- One real opinion here.')
    expect(onlyOpinions.completenessPct).toBe(35)
  })

  it('is deterministic — the same text always produces the same result', () => {
    const text = `## Personal Positioning Statement\nSame every time.\n\n## Opinions & POV\n- Stable opinion.`
    expect(parseVoiceCardImport(text)).toEqual(parseVoiceCardImport(text))
  })
})

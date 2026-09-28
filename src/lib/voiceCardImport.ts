// Heuristic, deterministic parser for the "upload an existing Voice Card"
// flow — no AI call. Reads the standard Voice Card markdown template's
// section headings (e.g. `## Personal Positioning Statement`,
// `## Opinions & POV`, `## Audience`) and pulls out just enough structure
// to pre-fill `voice_cards`/`voice_card_opinions` before the user is routed
// into the real interview to fill in whatever this couldn't infer.
import type { ContentOrientation } from '@/data/onboardingCatalog'

export interface ParsedVoiceCardImport {
  contentOrientation: ContentOrientation
  /** Whether the orientation above was actually detected in the text
   * (vs. just defaulted to `'personal_brand'`) — callers use this to
   * decide whether the interview still needs to ask the orientation
   * question or can treat it as already answered. */
  orientationDetected: boolean
  opinions: string[]
  completenessPct: number
  completenessNote: string
  povFingerprint: string
}

const MAX_OPINIONS = 5

interface Section {
  heading: string
  body: string
}

const HEADING_LINE = /^#{1,6}\s*(.+?)\s*$/

/** Splits the raw text into heading -> body sections. Text before the
 * first heading is dropped — the template always opens with a heading. */
function splitSections(text: string): Section[] {
  const lines = text.split(/\r?\n/)
  const sections: { heading: string; body: string[] }[] = []
  let current: { heading: string; body: string[] } | null = null
  for (const line of lines) {
    const match = line.match(HEADING_LINE)
    if (match) {
      if (current) sections.push(current)
      current = { heading: match[1], body: [] }
    } else if (current) {
      current.body.push(line)
    }
  }
  if (current) sections.push(current)
  return sections.map((s) => ({ heading: s.heading, body: s.body.join('\n').trim() }))
}

function findSection(sections: Section[], pattern: RegExp): Section | undefined {
  return sections.find((s) => pattern.test(s.heading))
}

const BULLET_LINE = /^\s*[-*]\s*(.+)$/

/** Strips a leading `-`/`*` bullet marker and surrounding quote characters
 * off a single line, e.g. `- "Attribution is a myth."` -> `Attribution is
 * a myth.`. */
function cleanBulletText(raw: string): string {
  return raw
    .trim()
    .replace(/^["'“]+/, '')
    .replace(/["'”]+$/, '')
    .trim()
}

function extractBullets(body: string, cap: number): string[] {
  const bullets: string[] = []
  for (const line of body.split(/\r?\n/)) {
    const match = line.match(BULLET_LINE)
    if (!match) continue
    const cleaned = cleanBulletText(match[1])
    if (cleaned) bullets.push(cleaned)
    if (bullets.length >= cap) break
  }
  return bullets
}

const SOCIAL_SELLER = /social seller/i

export function parseVoiceCardImport(rawText: string): ParsedVoiceCardImport {
  const sections = splitSections(rawText)

  const positioningSection = findSection(sections, /positioning/i)
  const opinionsSection =
    findSection(sections, /opinions?\s*&?\s*pov/i) ?? findSection(sections, /opinions/i)
  const audienceSection = findSection(sections, /audience/i)
  const orientationSection = findSection(sections, /orientation/i)

  const povFingerprintSource = positioningSection?.body.trim() ?? ''
  const opinions = opinionsSection ? extractBullets(opinionsSection.body, MAX_OPINIONS) : []

  // "Near an orientation/audience section" — checked against the Audience
  // and Orientation sections specifically (and the positioning statement,
  // since some templates fold the fork into the opening statement), not
  // the whole document, so an unrelated mention elsewhere doesn't
  // misclassify the card.
  const orientationHaystack = [audienceSection?.body, orientationSection?.body, povFingerprintSource]
    .filter((s): s is string => Boolean(s))
    .join('\n')
  const orientationDetected = SOCIAL_SELLER.test(orientationHaystack)
  const contentOrientation: ContentOrientation = orientationDetected ? 'audience_sales' : 'personal_brand'

  const hasPositioning = povFingerprintSource.length > 0
  const hasOpinions = opinions.length > 0
  let completenessPct = 15
  if (hasPositioning && hasOpinions) completenessPct = 60
  else if (hasPositioning || hasOpinions) completenessPct = 35

  const povFingerprint = hasPositioning
    ? povFingerprintSource
    : 'Imported — refine by finishing a few interview questions.'

  const completenessNote = `${completenessPct}% — imported from an existing Voice Card; finish a few interview questions to fill any gaps.`

  return {
    contentOrientation,
    orientationDetected,
    opinions,
    completenessPct,
    completenessNote,
    povFingerprint,
  }
}

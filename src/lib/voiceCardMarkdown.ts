import type { SynthesizedVoiceCard } from '@/data/types'

export function formatCardDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

/** The Voice Card as a portable Markdown document, same section order as
 * the on-screen card (and the original linkedin-voice-setup template). */
export function voiceCardToMarkdown(card: SynthesizedVoiceCard, name: string, updatedAt: string | null): string {
  const list = (items: string[]) => items.map((i) => `- ${i}`).join('\n')
  const lines: string[] = [`# LinkedIn Voice Card: ${name}`]
  if (updatedAt) lines.push(`Last updated: ${formatCardDate(updatedAt)}`)
  lines.push('', '## Personal Positioning Statement', card.positioningStatement)
  lines.push(
    '',
    '## Identity Snapshot',
    list(
      [
        `Name: ${name}`,
        `Role & Company: ${card.identity.roleCompany}`,
        card.identity.location ? `Location: ${card.identity.location}` : '',
        `Industry: ${card.identity.industry}`,
        `Core Expertise: ${card.identity.coreExpertise}`,
        `LinkedIn Goal: ${card.identity.linkedinGoal}`,
      ].filter(Boolean),
    ),
  )
  lines.push(
    '',
    '## Persona Archetype',
    `- Primary: ${card.persona.primary.name}. ${card.persona.primary.description}`,
    `- Secondary: ${card.persona.secondary.name}. ${card.persona.secondary.description}`,
  )
  lines.push(
    '',
    '## Voice & Tone Profile',
    `Tone adjectives: ${card.voiceTone.adjectives.join(', ')}`,
    '',
    card.voiceTone.communicationStyle,
    '',
    card.voiceTone.corePrinciple,
    '',
    'What to avoid:',
    list(card.voiceTone.whatToAvoid),
    '',
    'Signature patterns:',
    list(card.voiceTone.signaturePatterns),
  )
  lines.push(
    '',
    '## Content Pillars',
    ...card.contentPillars.map((p, i) => `${i + 1}. **${p.title}**: ${p.description} ("${p.quote}")`),
  )
  const f = card.formatPreferences
  if (f) {
    lines.push(
      '',
      '## Post Format Preferences',
      list([`Preferred lengths: ${f.lengths}`, `Structure tendencies: ${f.structure}`, `Formatting habits: ${f.formatting}`, `CTA style: ${f.cta}`]),
    )
  }
  lines.push('', '## Opinions & POV', list(card.opinions.map((o) => `"${o}"`)))
  lines.push('', '## Signature Quotes', list(card.signatureQuotes.map((q) => `"${q}"`)))
  if (card.trustedSources.length > 0) lines.push('', '## Trusted Sources', list(card.trustedSources))
  if (card.postExamples) lines.push('', '## Post Examples Analyzed', card.postExamples)
  lines.push('', '## Audience', list([`Primary: ${card.audience.primary}`, `Secondary: ${card.audience.secondary}`]))
  if (card.memorySummary) lines.push('', '## Memory Summary', card.memorySummary)
  return lines.join('\n') + '\n'
}

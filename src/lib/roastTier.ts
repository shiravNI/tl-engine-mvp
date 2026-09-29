// Shared 0-10 (lower is better) tier mapping, used for both the
// `drafts.slop_score` the server computes (`draft-post`/`humanize-draft`)
// and the live client-side score from `runBsCheck` (src/lib/bsCheck.ts) —
// same scale, same thresholds, whichever produced the number.
import type { PillTone } from '@/components/primitives/Pill'

export type RoastTier = 'clear' | 'flagged' | 'roasted'

export function getRoastTier(slopScore: number): RoastTier {
  if (slopScore <= 2) return 'clear'
  if (slopScore <= 6) return 'flagged'
  return 'roasted'
}

export function roastTierPillTone(tier: RoastTier): PillTone {
  if (tier === 'clear') return 'success'
  if (tier === 'flagged') return 'warn'
  return 'danger'
}

export function roastTierLabel(tier: RoastTier): string {
  if (tier === 'clear') return 'Clear'
  if (tier === 'flagged') return 'Flagged'
  return 'Roasted'
}

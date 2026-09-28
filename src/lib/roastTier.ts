// The `drafts.slop_score` a draft carries (0-10, lower is better) is
// computed server-side by the `draft-post`/`humanize-draft` edge functions'
// deterministic gatekeeper. This is just the pure client-side tier mapping
// for that score, mirroring `getRoastTier` from the original Thought
// Leadership Engine app's `src/lib/roast.ts` — the full text-scanning
// detector isn't needed here since this MVP never re-runs that check
// client-side, it only displays what the server already computed.
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

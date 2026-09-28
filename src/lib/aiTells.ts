// Single source of truth for the "AI tells" reference shortlist shown next
// to the composer. This mirrors — by hand, same as the two edge functions
// mirror each other — the exact patterns the `draft-post`/`humanize-draft`
// edge functions' deterministic gatekeeper checks for server-side, so what
// the user sees here is genuinely what gets flagged, not a vibes-based list.
export interface AiTell {
  label: string
}

export const AI_TELLS: AiTell[] = [
  { label: 'Em dashes and en dashes (—, –)' },
  { label: '"Let that sink in"' },
  { label: '"It’s not X, it’s Y"' },
  { label: '"Circle back"' },
  { label: '"Double-click on"' },
  { label: '"Move the needle"' },
  { label: '"Synergy" / "synergies"' },
  { label: '"Leverage" / "leveraging"' },
  { label: '"Game-changer" / "game-changing"' },
  { label: '"At the end of the day"' },
  { label: '"Low-hanging fruit"' },
  { label: '"Unlock(ing) potential"' },
  { label: 'In today’s fast-paced' },
  { label: '"Humbled and honored"' },
  { label: '"Delve"' },
  { label: '"Tapestry"' },
  { label: 'Generic engagement bait ("agree or disagree?", "comment below", "tag someone", "save this post")' },
]

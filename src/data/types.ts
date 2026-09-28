// Shared domain types for TL Engine MVP. Trimmed to only what this app's
// one loop (onboarding -> Voice Card -> Drafter) actually touches — see
// the original Thought Leadership Engine app's `src/data/types.ts` for the
// full model this is a deliberate subset of.

export type UserRole = 'director' | 'cast'

export interface VoiceCardOpinion {
  id: string
  quote: string
  placeholder?: boolean
}

export interface OnboardingPhase {
  id: string
  index: number
  title: string
  description: string
  estimate: string
  status: 'done' | 'active' | 'upcoming'
}

/** Exact quoted+roasted lines the BS Detector found in a draft; `quote` may
 * be empty — this MVP's `draft-post`/`humanize-draft` edge functions only
 * ever populate `comment`. */
export interface RoastFlag {
  quote: string
  comment: string
}

/** The subset of `public.drafts` columns this app reads/writes — that
 * table carries many more columns shared with the archived exploration
 * app (format, origin, scheduled_for, image_url, ...); this MVP leaves all
 * of those alone. */
export interface Draft {
  id: string
  title: string
  paragraphs: string[]
  excerpt: string
  stage: string
  voiceMatch: number
  slopScore: number
  roastVerdict: string
  roastFlags: RoastFlag[]
  sourceLabel: string | null
  createdAt: string
  updatedAt: string
}

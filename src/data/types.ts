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

/** The real, AI-synthesized Voice Card document — `voice_cards.synthesized`
 * (jsonb), produced by the `synthesize-voice-card` edge function. Replaces
 * the thin, mechanically-derived card once a real synthesis has run at
 * least once (`voice_cards.synthesized_at` is non-null). */
export interface SynthesizedVoiceCard {
  positioningStatement: string
  identity: { roleCompany: string; location?: string; industry: string; coreExpertise: string; linkedinGoal: string }
  persona: {
    primary: { name: string; description: string }
    secondary: { name: string; description: string }
  }
  voiceTone: {
    adjectives: string[]
    communicationStyle: string
    corePrinciple: string
    whatToAvoid: string[]
    signaturePatterns: string[]
  }
  contentPillars: { title: string; description: string; quote: string }[]
  formatPreferences: { lengths: string; structure: string; formatting: string; cta: string }
  opinions: string[]
  signatureQuotes: string[]
  trustedSources: string[]
  postExamples?: string
  audience: { primary: string; secondary: string }
  memorySummary: string
}

export interface IdeaCheck {
  verdict: 'green' | 'yellow' | 'red'
  insight: string
  missing: string
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
  /** 'article' is how a newsletter issue is stored (the shared drafts table only allows post|article). */
  format: 'post' | 'article'
  /** What the AI first wrote, kept so edits can be learned from. null for drafts the person started blank. */
  aiOriginal: string[] | null
  ideaCheck: IdeaCheck | null
  createdAt: string
  updatedAt: string
}

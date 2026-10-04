// Shared onboarding vocabulary: the 7 phases of the voice interview (the
// `linkedin-voice-setup` skill), and the Thought Leader / Social Seller
// orientation the interview decides on. The questions themselves are no
// longer a static list — the `interview-chat` edge function runs the
// interview live and adapts to the person.

export interface OnboardingPhaseDef {
  id: string
  index: number
  title: string
  description: string
  estimate: string
}

export const ONBOARDING_PHASES: OnboardingPhaseDef[] = [
  { id: 'identity', index: 1, title: 'Who you are', description: "Role, expertise, what you're actually known for", estimate: '~5 min' },
  { id: 'goals', index: 2, title: "Why you're doing this", description: 'Real goal, dream outcome — not just "build my brand"', estimate: '~4 min' },
  { id: 'voice', index: 3, title: 'How you actually sound', description: 'Tone, what you never want to sound like, real writing samples', estimate: '~6 min' },
  { id: 'opinions', index: 4, title: 'Opinions & POV — the SAT round', description: "Tappable questions on AI, your industry, ambition. No fixed number — we go until it's clear.", estimate: '~15 min' },
  { id: 'persona', index: 5, title: 'Your persona fit', description: 'Practitioner, Contrarian, Storyteller, Educator, Connector, Visionary, Builder', estimate: '~3 min' },
  { id: 'format', index: 6, title: 'Format preferences', description: 'Rapid-fire taps — length, emojis, structure, CTAs', estimate: '~3 min' },
  { id: 'sources', index: 7, title: 'Sources & wrap-up', description: 'What you read, then review your finished Voice Card', estimate: '~4 min' },
]

export interface OnboardingQuestionOption {
  id: string
  label: string
  primary?: boolean
}

export interface OnboardingQuestion {
  id: string
  phaseId: string
  prompt: string
  options: OnboardingQuestionOption[]
  followUpPrompt?: string
  /** `'text'` questions (the free-form Positioning + Hot-Takes round, and
   * Sources) have no tap options at all — just the prompt and a required
   * text answer. Defaults to `'choice'` when omitted. */
  type?: 'choice' | 'text'
}

export type ContentOrientation = 'personal_brand' | 'audience_sales'

export const ORIENTATION_QUESTION_ID = 'q_orientation'
export const IDENTITY_QUESTION_ID = 'q_identity'

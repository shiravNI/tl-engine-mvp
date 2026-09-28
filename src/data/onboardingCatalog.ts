// The ONE shared phase/question catalog for onboarding — titles, prompts,
// options. Both `OnboardingMapPage` (the phase overview) and
// `InterviewPage` (the live interview) read this single source, which is
// what fixes the pre-migration bug where each page hardcoded its own
// independent 7-phase list that could silently drift out of sync.
//
// Phases 1-4 (Identity, Goals, Voice, Opinions & POV) have real interactive
// questions in this build. Persona/Format/Sources (5-7) are still
// description-only for the map/progress UI, not yet backed by their own
// question sets — adding those later is a data change here, not a
// restructuring of either page.
//
// The Goals-phase question (`ORIENTATION_QUESTION`) is a fork, not just
// another question: its answer — "Personal Brand / Visibility" vs.
// "Audience / Sales-Led" — decides which Opinions & POV question set runs
// next (see `getInterviewQuestions` below).

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

/** Every phase with at least one real, tappable question in this build. */
export const INTERACTIVE_PHASE_IDS = ['identity', 'goals', 'voice', 'opinions'] as const

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
}

export type ContentOrientation = 'personal_brand' | 'audience_sales'

export const ORIENTATION_QUESTION_ID = 'q_orientation'

const IDENTITY_QUESTION: OnboardingQuestion = {
  id: 'q_identity',
  phaseId: 'identity',
  prompt: 'Which best describes how you show up in your field?',
  options: [
    { id: 'practitioner', label: 'Practitioner — lessons from doing it', primary: true },
    { id: 'educator', label: 'Educator — breaking things down' },
    { id: 'storyteller', label: 'Storyteller — narrative first' },
    { id: 'builder', label: 'Builder — documenting what you make' },
  ],
  followUpPrompt: "Say more — what's the one thing you know better than most people around you?",
}

/** The fork. `option.id` doubles as the literal `ContentOrientation` value —
 * no separate mapping needed between "what was tapped" and "what mode
 * we're in" from here on. */
const ORIENTATION_QUESTION: OnboardingQuestion = {
  id: ORIENTATION_QUESTION_ID,
  phaseId: 'goals',
  prompt: "What's really driving this — personal visibility, or bringing in business?",
  options: [
    { id: 'personal_brand', label: 'Thought Leader (TL) — recognition, speaking invites, career', primary: true },
    { id: 'audience_sales', label: 'Social Seller — trust with buyers or partners' },
  ],
  followUpPrompt: 'Say more — what would success actually look like for you, concretely?',
}

const VOICE_QUESTION: OnboardingQuestion = {
  id: 'q_voice',
  phaseId: 'voice',
  prompt: 'How do you actually communicate, once you drop the polish?',
  options: [
    { id: 'direct', label: 'Direct & blunt', primary: true },
    { id: 'warm', label: 'Warm & story-driven' },
    { id: 'data', label: 'Data-first & precise' },
    { id: 'dry', label: 'Dry & funny' },
  ],
  followUpPrompt: 'Say more — what do you never want to sound like on LinkedIn?',
}

/** Opinions & POV — Personal Brand / Visibility variant: the reader is
 * following *them*, so this stays about their own opinions and industry
 * take. */
const OPINION_QUESTIONS_PERSONAL_BRAND: OnboardingQuestion[] = [
  {
    id: 'q_opinion_pb_1',
    phaseId: 'opinions',
    prompt: 'AI in performance marketing is going to —',
    options: [
      { id: 'a', label: 'Replace most entry-level work' },
      { id: 'b', label: 'Make good people great, bad people dangerous', primary: true },
      { id: 'c', label: 'Be a fad in this space' },
      { id: 'd', label: 'Change what "expertise" even means' },
    ],
    followUpPrompt: 'Say more? What have you seen that made you pick that one?',
  },
  {
    id: 'q_opinion_pb_2',
    phaseId: 'opinions',
    prompt: 'The most overrated thing in performance marketing right now is —',
    options: [
      { id: 'a', label: 'Attribution modeling' },
      { id: 'b', label: 'Creator partnerships' },
      { id: 'c', label: '"Full-funnel" as a buzzword' },
      { id: 'd', label: 'Real-time optimization' },
    ],
    followUpPrompt: 'Say more? What made you pick that one?',
  },
]

/** Opinions & POV — Audience / Sales-Led variant: the reader isn't there to
 * follow a person, they're there because the content is useful to their
 * job — so this flips the center of gravity onto who the audience is and
 * what they're actually struggling with. */
const OPINION_QUESTIONS_AUDIENCE_SALES: OnboardingQuestion[] = [
  {
    id: 'q_opinion_as_1',
    phaseId: 'opinions',
    prompt: 'What are the people you sell to or partner with most often confused about?',
    options: [
      { id: 'a', label: 'Whether it’ll actually work for them', primary: true },
      { id: 'b', label: 'Pricing vs. real ROI' },
      { id: 'c', label: 'Timelines and what "implementation" involves' },
      { id: 'd', label: 'What "good" even looks like here' },
    ],
    followUpPrompt: 'Say more — what’s a specific moment that proved this to you?',
  },
  {
    id: 'q_opinion_as_2',
    phaseId: 'opinions',
    prompt: 'What do the people you sell to complain about most, in their own words?',
    options: [
      { id: 'a', label: 'Too slow to show results' },
      { id: 'b', label: 'Too expensive for the value' },
      { id: 'c', label: 'Too complicated to adopt', primary: true },
      { id: 'd', label: 'Promises that didn’t match reality' },
    ],
    followUpPrompt: 'Say more — what would you tell them if you could skip the sales pitch entirely?',
  },
  {
    id: 'q_opinion_as_3',
    phaseId: 'opinions',
    prompt: 'Who are the people you sell to or partner with most often — what actually distinguishes them?',
    options: [
      { id: 'a', label: 'Their role or seniority', primary: true },
      { id: 'b', label: 'Their industry or vertical' },
      { id: 'c', label: 'Their company size or stage' },
      { id: 'd', label: 'Their existing tooling or setup' },
    ],
    followUpPrompt: 'Say more — what’s a specific moment where you watched one of them realize something that changed how they saw the problem?',
  },
  {
    id: 'q_opinion_as_4',
    phaseId: 'opinions',
    prompt: 'What’s your actual answer to the objection you hear most?',
    options: [
      { id: 'a', label: 'I show them proof, not a promise', primary: true },
      { id: 'b', label: 'I reframe what they’re even measuring' },
      { id: 'c', label: 'I point to someone just like them who was skeptical too' },
      { id: 'd', label: 'I agree with part of it, then push back on the rest' },
    ],
    followUpPrompt: 'Say more — what’s the specific thing you say that actually lands?',
  },
]

/** The active question set for a live interview, given the orientation
 * answer so far (`null`/`undefined` before it's been answered yet, which
 * defaults to the Personal Brand set so the interview always has *some*
 * valid next question to show). */
export function getInterviewQuestions(orientation: ContentOrientation | null | undefined): OnboardingQuestion[] {
  const opinionQuestions =
    orientation === 'audience_sales' ? OPINION_QUESTIONS_AUDIENCE_SALES : OPINION_QUESTIONS_PERSONAL_BRAND
  return [IDENTITY_QUESTION, ORIENTATION_QUESTION, VOICE_QUESTION, ...opinionQuestions]
}

/** Default/static question list — for anything that needs *a* reasonable
 * reference set without a live orientation answer yet (e.g. tests). Live
 * interviews should call `getInterviewQuestions` instead. */
export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = getInterviewQuestions(null)

export function questionNumberLabel(index: number, total: number = ONBOARDING_QUESTIONS.length): string {
  return `${index + 1} of ${total}`
}

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
export const INTERACTIVE_PHASE_IDS = ['identity', 'goals', 'voice', 'opinions', 'format', 'sources'] as const

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

/** Section 2.5's Positioning questions (TL variant) — free-text, no tap
 * options, generic across any TL regardless of domain. This is what the
 * Personal Positioning Statement is actually built from. */
const POSITIONING_QUESTIONS_TL: OnboardingQuestion[] = [
  {
    id: 'q_pos_tl_1',
    phaseId: 'opinions',
    type: 'text',
    prompt: "If you could be known for one belief or idea in your field — something that's distinctly yours — what would it be?",
    options: [],
  },
  {
    id: 'q_pos_tl_2',
    phaseId: 'opinions',
    type: 'text',
    prompt: "What's a hill you'd die on professionally? Something you'd argue for even if people pushed back?",
    options: [],
  },
  {
    id: 'q_pos_tl_3',
    phaseId: 'opinions',
    type: 'text',
    prompt: "When you read LinkedIn posts in your field, what's the thing that's almost never said — but should be?",
    options: [],
  },
]

/** Section 2.5's Positioning questions (Social Seller variant) — the
 * reader is evaluating whether this person understands their problem, not
 * following them as a person. */
const POSITIONING_QUESTIONS_SOCIAL_SELLER: OnboardingQuestion[] = [
  {
    id: 'q_pos_ss_1',
    phaseId: 'opinions',
    type: 'text',
    prompt: 'What do the people you sell to need to believe about you before they trust your point of view?',
    options: [],
  },
  {
    id: 'q_pos_ss_2',
    phaseId: 'opinions',
    type: 'text',
    prompt: "What's a hill you'd die on about how your buyers should be thinking about this problem?",
    options: [],
  },
  {
    id: 'q_pos_ss_3',
    phaseId: 'opinions',
    type: 'text',
    prompt: "When you read content in your space, what's the thing that's almost never said about the buyer's actual situation — but should be?",
    options: [],
  },
]

/** Topic Area 5 — Hot Takes. Free-text by design (the skill is explicit:
 * "don't present options for this section"), and generic across any
 * domain — this is where the spiciest, most distinctive material tends to
 * live. */
const HOT_TAKE_QUESTIONS: OnboardingQuestion[] = [
  {
    id: 'q_hot_take_1',
    phaseId: 'opinions',
    type: 'text',
    prompt: "What's an opinion you have about your industry that most people would push back on?",
    options: [],
  },
  {
    id: 'q_hot_take_2',
    phaseId: 'opinions',
    type: 'text',
    prompt: "What's something everyone in your field does that you think is a waste of time?",
    options: [],
  },
  {
    id: 'q_hot_take_3',
    phaseId: 'opinions',
    type: 'text',
    prompt: "Finish this: \"I'm probably wrong about this, but I think _____\"",
    options: [],
  },
]

/** Section 2.7 — Format Preferences, the rapid-fire tap round. Entirely
 * generic (post mechanics, not domain-dependent), so this is static —
 * matches the skill's own list exactly. */
const FORMAT_QUESTIONS: OnboardingQuestion[] = [
  {
    id: 'q_format_length',
    phaseId: 'format',
    prompt: 'Post length?',
    options: [
      { id: 'short', label: 'Short & punchy', primary: true },
      { id: 'long', label: 'Long & narrative' },
      { id: 'depends', label: 'Depends on the topic' },
    ],
  },
  {
    id: 'q_format_emojis',
    phaseId: 'format',
    prompt: 'Emojis?',
    options: [
      { id: 'yes', label: 'Yes' },
      { id: 'never', label: 'Never', primary: true },
      { id: 'sparingly', label: 'Sparingly' },
    ],
  },
  {
    id: 'q_format_structure',
    phaseId: 'format',
    prompt: 'Structure?',
    options: [
      { id: 'bullets', label: 'Bullets & lists' },
      { id: 'prose', label: 'Flowing prose', primary: true },
      { id: 'mix', label: 'Mix' },
    ],
  },
  {
    id: 'q_format_cta',
    phaseId: 'format',
    prompt: 'End with a question?',
    options: [
      { id: 'always', label: 'Always' },
      { id: 'sometimes', label: 'Sometimes', primary: true },
      { id: 'never', label: 'Never' },
    ],
  },
  {
    id: 'q_format_pov',
    phaseId: 'format',
    prompt: 'Voice?',
    options: [
      { id: 'personal', label: 'First-person & personal', primary: true },
      { id: 'observational', label: 'More observational' },
    ],
  },
  {
    id: 'q_format_personal_life',
    phaseId: 'format',
    prompt: 'Personal life?',
    options: [
      { id: 'share', label: 'Share it' },
      { id: 'professional', label: 'Keep it professional' },
      { id: 'selectively', label: 'Selectively', primary: true },
    ],
  },
  {
    id: 'q_format_vulnerable',
    phaseId: 'format',
    prompt: 'Would you post something vulnerable if it was true and useful?',
    options: [
      { id: 'yes', label: 'Yes' },
      { id: 'no', label: 'No' },
      { id: 'depends', label: 'Depends', primary: true },
    ],
  },
  {
    id: 'q_format_humor',
    phaseId: 'format',
    prompt: 'Humor?',
    options: [
      { id: 'always', label: 'Always' },
      { id: 'sometimes', label: 'Sometimes', primary: true },
      { id: 'fits', label: 'Only when it fits' },
    ],
  },
]

/** Section 2.8 — Sources & Staying Current. Feeds a future newsletter-style
 * feature and the synthesized Voice Card's Trusted Sources section. */
const SOURCES_QUESTION: OnboardingQuestion = {
  id: 'q_sources',
  phaseId: 'sources',
  type: 'text',
  prompt: 'What do you read, listen to, or watch to stay sharp? Newsletters, podcasts, reports, people you follow?',
  options: [],
}

/** The active question set for a live interview, given the orientation
 * answer so far (`null`/`undefined` before it's been answered yet, which
 * defaults to the Personal Brand set so the interview always has *some*
 * valid next question to show). */
export function getInterviewQuestions(
  orientation: ContentOrientation | null | undefined,
  /** Real, domain-personalized SAT-round questions from
   * `generate-interview-questions` (see `generateInterviewQuestionsService.ts`),
   * when available — replaces the generic static set below entirely. Falls
   * back to the static set when this is `undefined`/empty (API key not
   * configured yet, or generation hasn't run/resolved for this session). */
  dynamicOpinionQuestions?: OnboardingQuestion[],
): OnboardingQuestion[] {
  const opinionQuestions =
    dynamicOpinionQuestions && dynamicOpinionQuestions.length > 0
      ? dynamicOpinionQuestions
      : orientation === 'audience_sales'
        ? OPINION_QUESTIONS_AUDIENCE_SALES
        : OPINION_QUESTIONS_PERSONAL_BRAND
  const positioningQuestions =
    orientation === 'audience_sales' ? POSITIONING_QUESTIONS_SOCIAL_SELLER : POSITIONING_QUESTIONS_TL
  return [
    IDENTITY_QUESTION,
    ORIENTATION_QUESTION,
    VOICE_QUESTION,
    ...opinionQuestions,
    ...positioningQuestions,
    ...HOT_TAKE_QUESTIONS,
    ...FORMAT_QUESTIONS,
    SOURCES_QUESTION,
  ]
}

/** Default/static question list — for anything that needs *a* reasonable
 * reference set without a live orientation answer yet (e.g. tests). Live
 * interviews should call `getInterviewQuestions` instead. */
export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = getInterviewQuestions(null)

export function questionNumberLabel(index: number, total: number = ONBOARDING_QUESTIONS.length): string {
  return `${index + 1} of ${total}`
}

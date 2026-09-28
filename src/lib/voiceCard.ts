import {
  ONBOARDING_QUESTIONS,
  ORIENTATION_QUESTION_ID,
  type ContentOrientation,
  type OnboardingQuestion,
} from '@/data/onboardingCatalog'
import type { VoiceCardOpinion } from '@/data/types'

/** One saved interview answer, in the shape both the DB row and the
 * in-progress interview UI state share (camelCase either way — the
 * row<->camelCase mapping happens in onboardingService.ts, not here). */
export interface InterviewAnswerInput {
  questionId: string
  selectedOptionId: string | null
  freeTextAnswer: string | null
}

export interface DerivedVoiceCard {
  completenessPct: number
  completenessNote: string
  povFingerprint: string
  opinions: VoiceCardOpinion[]
  contentOrientation: ContentOrientation | null
}

/** Reads the orientation directly off the answer to the fork question —
 * its `selectedOptionId` values are the literal `ContentOrientation`
 * strings, so no separate mapping is needed. */
export function readContentOrientation(answers: InterviewAnswerInput[]): ContentOrientation | null {
  const answer = answers.find((a) => a.questionId === ORIENTATION_QUESTION_ID)
  if (answer?.selectedOptionId === 'personal_brand' || answer?.selectedOptionId === 'audience_sales') {
    return answer.selectedOptionId
  }
  return null
}

const SNIPPET_MAX_LEN = 90

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 3).trimEnd()}…` : text
}

/**
 * A simple, deterministic template — no ML — that turns saved interview
 * answers into the Voice Card's live-updating shape. Runs the same way on
 * the client and would run the same way anywhere else: same answers in,
 * same card out.
 */
export function deriveVoiceCard(
  answers: InterviewAnswerInput[],
  questions: OnboardingQuestion[] = ONBOARDING_QUESTIONS,
): DerivedVoiceCard {
  const totalQuestions = questions.length
  // Guard against orphaned answers — a DB row for a question id that no
  // longer exists in the active catalog (e.g. after a question was renamed
  // or the branch changed) must not silently inflate completeness.
  const activeQuestionIds = new Set(questions.map((q) => q.id))
  const answeredQuestionIds = new Set(
    answers
      .filter((a) => activeQuestionIds.has(a.questionId))
      .filter((a) => Boolean(a.selectedOptionId) || Boolean(a.freeTextAnswer?.trim()))
      .map((a) => a.questionId),
  )
  const completenessPct =
    totalQuestions === 0 ? 0 : Math.round((answeredQuestionIds.size / totalQuestions) * 100)

  const opinions: VoiceCardOpinion[] = answers
    .filter((a) => activeQuestionIds.has(a.questionId) && Boolean(a.freeTextAnswer?.trim()))
    .map((a) => ({
      id: `op_${a.questionId}`,
      quote: `"${truncate(a.freeTextAnswer!.trim(), SNIPPET_MAX_LEN)}"`,
    }))

  if (opinions.length === 0) {
    opinions.push({ id: 'op_placeholder', quote: 'Next opinion lands here…', placeholder: true })
  }

  // Exclude the orientation fork itself from the "leans toward" picks —
  // it's a routing answer, not an opinion to quote back.
  const picks = answers
    .filter((a) => a.questionId !== ORIENTATION_QUESTION_ID)
    .map((a) => {
      const question = questions.find((q) => q.id === a.questionId)
      const option = question?.options.find((o) => o.id === a.selectedOptionId)
      return option?.label
    })
    .filter((label): label is string => Boolean(label))

  const contentOrientation = readContentOrientation(answers)

  const povFingerprint =
    picks.length === 0
      ? 'Still forming — answer a few more questions to build a POV fingerprint.'
      : contentOrientation === 'audience_sales'
        ? `Writes for an audience who: ${picks.join('. Also: ')}.`
        : `Leans toward: ${picks.join('. Also leans toward: ')}.`

  const completenessNote =
    completenessPct >= 100
      ? `${completenessPct}% — Opinions & POV round complete.`
      : contentOrientation === 'audience_sales'
        ? `${completenessPct}% — knowing your audience's real problems is what the rest of this builds on.`
        : `${completenessPct}% — Opinions & POV is where most of the substance comes from. Worth the time.`

  return { completenessPct, completenessNote, povFingerprint, opinions, contentOrientation }
}

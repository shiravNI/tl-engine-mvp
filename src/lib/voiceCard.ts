import { ORIENTATION_QUESTION_ID, type ContentOrientation } from '@/data/onboardingCatalog'

/** One saved interview answer, in the shape both the DB row and the
 * in-progress interview UI state share (camelCase either way — the
 * row<->camelCase mapping happens in onboardingService.ts, not here). */
export interface InterviewAnswerInput {
  questionId: string
  selectedOptionId: string | null
  freeTextAnswer: string | null
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

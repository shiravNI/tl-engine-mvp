import { describe, expect, it } from 'vitest'
import { readContentOrientation, type InterviewAnswerInput } from '@/lib/voiceCard'
import { ORIENTATION_QUESTION_ID } from '@/data/onboardingCatalog'

describe('readContentOrientation', () => {
  it('returns null when the orientation question has not been answered', () => {
    expect(readContentOrientation([])).toBeNull()
    expect(readContentOrientation([{ questionId: 'q1', selectedOptionId: 'a', freeTextAnswer: null }])).toBeNull()
  })

  it('reads the literal option id off the orientation question as the orientation value', () => {
    const answers: InterviewAnswerInput[] = [
      { questionId: ORIENTATION_QUESTION_ID, selectedOptionId: 'audience_sales', freeTextAnswer: null },
    ]
    expect(readContentOrientation(answers)).toBe('audience_sales')
  })
})

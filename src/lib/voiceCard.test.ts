import { describe, expect, it } from 'vitest'
import { deriveVoiceCard, readContentOrientation, type InterviewAnswerInput } from '@/lib/voiceCard'
import { ORIENTATION_QUESTION_ID, getInterviewQuestions, type OnboardingQuestion } from '@/data/onboardingCatalog'

const QUESTIONS: OnboardingQuestion[] = [
  {
    id: 'q1',
    phaseId: 'opinions',
    prompt: 'AI in performance marketing is going to —',
    options: [
      { id: 'a', label: 'Replace most entry-level work' },
      { id: 'b', label: 'Make good people great, bad people dangerous' },
    ],
  },
  {
    id: 'q2',
    phaseId: 'opinions',
    prompt: 'The most overrated thing in performance marketing right now is —',
    options: [
      { id: 'a', label: 'Attribution modeling' },
      { id: 'b', label: '"Full-funnel" as a buzzword' },
    ],
  },
]

describe('deriveVoiceCard', () => {
  it('does not treat a non-opinions-phase answer (identity/goals/etc.) as a quotable opinion', () => {
    const questionsWithIdentity: OnboardingQuestion[] = [
      { id: 'q_identity', phaseId: 'identity', prompt: 'Who are you?', options: [] },
      ...QUESTIONS,
    ]
    const answers: InterviewAnswerInput[] = [
      { questionId: 'q_identity', selectedOptionId: null, freeTextAnswer: 'I want to speak at conferences.' },
    ]
    const card = deriveVoiceCard(answers, questionsWithIdentity)
    expect(card.opinions).toEqual([{ id: 'op_placeholder', quote: 'Next opinion lands here…', placeholder: true }])
  })

  it('reports 0% completeness and a placeholder opinion with no answers at all', () => {
    const card = deriveVoiceCard([], QUESTIONS)
    expect(card.completenessPct).toBe(0)
    expect(card.opinions).toEqual([{ id: 'op_placeholder', quote: 'Next opinion lands here…', placeholder: true }])
    expect(card.povFingerprint).toMatch(/still forming/i)
  })

  it('counts a question as answered by either a selected option or free text, not double-counted', () => {
    const answers: InterviewAnswerInput[] = [
      { questionId: 'q1', selectedOptionId: 'b', freeTextAnswer: null },
    ]
    const card = deriveVoiceCard(answers, QUESTIONS)
    expect(card.completenessPct).toBe(50) // 1 of 2 questions
  })

  it('reaches 100% completeness once every question has an answer', () => {
    const answers: InterviewAnswerInput[] = [
      { questionId: 'q1', selectedOptionId: 'b', freeTextAnswer: null },
      { questionId: 'q2', selectedOptionId: null, freeTextAnswer: 'Attribution modeling gets too much credit.' },
    ]
    const card = deriveVoiceCard(answers, QUESTIONS)
    expect(card.completenessPct).toBe(100)
    expect(card.completenessNote).toMatch(/complete/i)
  })

  it('ignores a whitespace-only free-text answer as not actually answered', () => {
    const answers: InterviewAnswerInput[] = [{ questionId: 'q1', selectedOptionId: null, freeTextAnswer: '   ' }]
    const card = deriveVoiceCard(answers, QUESTIONS)
    expect(card.completenessPct).toBe(0)
  })

  it('turns free-text answers into quoted, truncated opinions', () => {
    const longText = 'x'.repeat(200)
    const answers: InterviewAnswerInput[] = [
      { questionId: 'q1', selectedOptionId: 'b', freeTextAnswer: 'Same tool, opposite outcomes.' },
      { questionId: 'q2', selectedOptionId: null, freeTextAnswer: longText },
    ]
    const card = deriveVoiceCard(answers, QUESTIONS)
    expect(card.opinions).toHaveLength(2)
    expect(card.opinions[0]).toEqual({ id: 'op_q1', quote: '"Same tool, opposite outcomes."' })
    expect(card.opinions[1].quote.length).toBeLessThan(longText.length)
    expect(card.opinions[1].quote.endsWith('…"')).toBe(true)
    expect(card.opinions.some((op) => op.placeholder)).toBe(false)
  })

  it('builds the POV fingerprint from selected option labels, in answer order', () => {
    const answers: InterviewAnswerInput[] = [
      { questionId: 'q1', selectedOptionId: 'b', freeTextAnswer: null },
      { questionId: 'q2', selectedOptionId: 'b', freeTextAnswer: null },
    ]
    const card = deriveVoiceCard(answers, QUESTIONS)
    expect(card.povFingerprint).toContain('Make good people great, bad people dangerous')
    expect(card.povFingerprint).toContain('"Full-funnel" as a buzzword')
  })

  it('ignores an orphaned answer for a question id no longer in the active catalog', () => {
    const answers: InterviewAnswerInput[] = [
      { questionId: 'stale_removed_question', selectedOptionId: 'a', freeTextAnswer: 'Orphaned text.' },
      { questionId: 'q1', selectedOptionId: 'b', freeTextAnswer: null },
    ]
    const card = deriveVoiceCard(answers, QUESTIONS)
    expect(card.completenessPct).toBe(50) // only q1 counts; the orphan doesn't
    expect(card.opinions).toEqual([{ id: 'op_placeholder', quote: 'Next opinion lands here…', placeholder: true }])
  })

  it('is deterministic — the same answers always produce the same card', () => {
    const answers: InterviewAnswerInput[] = [
      { questionId: 'q1', selectedOptionId: 'a', freeTextAnswer: 'Some free text.' },
    ]
    const first = deriveVoiceCard(answers, QUESTIONS)
    const second = deriveVoiceCard(answers, QUESTIONS)
    expect(second).toEqual(first)
  })
})

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

describe('deriveVoiceCard — content orientation branching', () => {
  it('excludes the orientation answer itself from the "leans toward" POV picks', () => {
    const questions = getInterviewQuestions('personal_brand')
    const answers: InterviewAnswerInput[] = [
      { questionId: ORIENTATION_QUESTION_ID, selectedOptionId: 'personal_brand', freeTextAnswer: 'Career stuff.' },
    ]
    const card = deriveVoiceCard(answers, questions)
    expect(card.povFingerprint).toMatch(/still forming/i)
  })

  it('phrases the POV fingerprint and completeness note audience-first once Audience/Sales-Led is chosen', () => {
    const questions = getInterviewQuestions('audience_sales')
    const answers: InterviewAnswerInput[] = [
      { questionId: ORIENTATION_QUESTION_ID, selectedOptionId: 'audience_sales', freeTextAnswer: 'Selling to partners.' },
      { questionId: 'q_opinion_as_1', selectedOptionId: 'a', freeTextAnswer: 'They worry it won’t fit their stack.' },
    ]
    const card = deriveVoiceCard(answers, questions)
    expect(card.contentOrientation).toBe('audience_sales')
    expect(card.povFingerprint).toMatch(/writes for an audience/i)
    expect(card.completenessNote).toMatch(/audience's real problems/i)
  })

  it('keeps the original person-first phrasing for Personal Brand / Visibility', () => {
    const questions = getInterviewQuestions('personal_brand')
    const answers: InterviewAnswerInput[] = [
      { questionId: ORIENTATION_QUESTION_ID, selectedOptionId: 'personal_brand', freeTextAnswer: 'Speaking gigs.' },
      { questionId: 'q_opinion_pb_1', selectedOptionId: 'b', freeTextAnswer: 'Seen it firsthand.' },
    ]
    const card = deriveVoiceCard(answers, questions)
    expect(card.contentOrientation).toBe('personal_brand')
    expect(card.povFingerprint).toMatch(/^leans toward/i)
  })
})

describe('getInterviewQuestions', () => {
  it('returns the Personal Brand SAT-round + positioning questions by default (null/undefined orientation)', () => {
    const questions = getInterviewQuestions(null)
    const opinionIds = questions.filter((q) => q.phaseId === 'opinions').map((q) => q.id)
    expect(opinionIds).toEqual([
      'q_opinion_pb_1',
      'q_opinion_pb_2',
      'q_pos_tl_1',
      'q_pos_tl_2',
      'q_pos_tl_3',
      'q_pos_tl_4',
      'q_pos_tl_5',
      'q_hot_take_1',
      'q_hot_take_2',
      'q_hot_take_3',
      'q_hot_take_4',
      'q_hot_take_5',
    ])
  })

  it('swaps in the Audience/Sales-Led SAT-round + positioning questions once that orientation is chosen', () => {
    const questions = getInterviewQuestions('audience_sales')
    const opinionIds = questions.filter((q) => q.phaseId === 'opinions').map((q) => q.id)
    expect(opinionIds).toEqual([
      'q_opinion_as_1',
      'q_opinion_as_2',
      'q_opinion_as_3',
      'q_opinion_as_4',
      'q_pos_ss_1',
      'q_pos_ss_2',
      'q_pos_ss_3',
      'q_pos_ss_4',
      'q_pos_ss_5',
      'q_hot_take_1',
      'q_hot_take_2',
      'q_hot_take_3',
      'q_hot_take_4',
      'q_hot_take_5',
    ])
  })

  it('always includes identity, goals, voice, opinions, persona, format, and sources in phase order', () => {
    const questions = getInterviewQuestions('personal_brand')
    const phaseOrder = [...new Set(questions.map((q) => q.phaseId))]
    expect(phaseOrder).toEqual(['identity', 'goals', 'voice', 'opinions', 'persona', 'format', 'sources'])
  })

  it('marks the positioning and hot-take questions as free-text, and format/sources questions as choice unless noted', () => {
    const questions = getInterviewQuestions('personal_brand')
    const sources = questions.find((q) => q.id === 'q_sources')
    expect(sources?.type).toBe('text')
    const format = questions.find((q) => q.id === 'q_format_length')
    expect(format?.type).toBeUndefined()
  })
})

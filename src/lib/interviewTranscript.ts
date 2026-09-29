// Builds a plain-English Q&A transcript from the raw interview answers —
// this is what gets sent to `synthesize-voice-card` instead of raw
// question/option ids, so the edge function never needs its own copy of
// the question catalog (which lives client-side in onboardingCatalog.ts).
import type { OnboardingQuestion } from '@/data/onboardingCatalog'
import type { InterviewAnswerInput } from '@/lib/voiceCard'

export interface TranscriptEntry {
  prompt: string
  answer: string
}

export function buildInterviewTranscript(
  answers: Map<string, InterviewAnswerInput>,
  questions: OnboardingQuestion[],
): TranscriptEntry[] {
  const entries: TranscriptEntry[] = []
  for (const question of questions) {
    const answer = answers.get(question.id)
    if (!answer) continue
    const optionLabel = question.options.find((o) => o.id === answer.selectedOptionId)?.label
    const parts = [optionLabel, answer.freeTextAnswer?.trim()].filter(Boolean)
    if (parts.length === 0) continue
    entries.push({ prompt: question.prompt, answer: parts.join(' — ') })
  }
  return entries
}

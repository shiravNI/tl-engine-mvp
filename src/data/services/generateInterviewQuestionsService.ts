// Calls `generate-interview-questions` — the real, domain-personalized
// SAT round (linkedin-voice-setup's "CRITICAL: generate all questions
// dynamically" instruction). Falls back to the static generic set in
// onboardingCatalog.ts when this fails (API key not configured yet, etc.).
import { supabase } from '@/lib/supabaseClient'
import type { OnboardingQuestion, ContentOrientation } from '@/data/onboardingCatalog'

interface GeneratedQuestionRaw {
  id: string
  prompt: string
  options: { id: string; label: string }[]
  followUpPrompt?: string
}

export type GenerateQuestionsResult = { questions: OnboardingQuestion[] } | { error: string }

export async function generateInterviewQuestions(
  identityAnswer: string,
  goalAnswer: string,
  orientation: ContentOrientation,
): Promise<GenerateQuestionsResult> {
  const { data, error } = await supabase.functions.invoke('generate-interview-questions', {
    body: { identityAnswer, goalAnswer, orientation },
  })
  if (error) {
    const context = (error as { context?: Response }).context
    const details = context ? await context.json().catch(() => null) : null
    return { error: details?.error || 'Question generation failed.' }
  }
  if (data?.error) return { error: data.error as string }
  const raw: GeneratedQuestionRaw[] = Array.isArray(data.questions) ? data.questions : []
  const questions: OnboardingQuestion[] = raw.map((q) => ({
    id: q.id,
    phaseId: 'opinions',
    prompt: q.prompt,
    options: q.options,
    followUpPrompt: q.followUpPrompt,
  }))
  return { questions }
}

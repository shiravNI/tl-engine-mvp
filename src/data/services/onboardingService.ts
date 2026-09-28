// Onboarding persistence against Supabase — `onboarding_state`,
// `interview_answers`, `voice_cards` + `voice_card_opinions`. RLS (flat
// `auth.uid() = user_id` policies, see supabase/schema.sql) is the sole
// isolation mechanism; every call below still passes `userId` explicitly
// because inserts need it set on the row for the `with check` clause to
// pass, not to filter reads.
import { supabase } from '@/lib/supabaseClient'
import type { InterviewAnswerInput } from '@/lib/voiceCard'
import type { VoiceCardOpinion } from '@/data/types'
import type { ContentOrientation } from '@/data/onboardingCatalog'

export interface OnboardingState {
  currentPhaseIndex: number
  completedAt: string | null
  skipped: boolean
}

interface OnboardingStateRow {
  user_id: string
  current_phase_index: number
  completed_at: string | null
  skipped: boolean
}

function rowToOnboardingState(row: OnboardingStateRow): OnboardingState {
  return {
    currentPhaseIndex: row.current_phase_index,
    completedAt: row.completed_at,
    skipped: row.skipped,
  }
}

export async function fetchOnboardingState(userId: string): Promise<OnboardingState | null> {
  const { data, error } = await supabase
    .from('onboarding_state')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error || !data) return null
  return rowToOnboardingState(data as OnboardingStateRow)
}

export async function upsertOnboardingState(
  userId: string,
  patch: Partial<OnboardingState>,
): Promise<void> {
  const row: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() }
  if (patch.currentPhaseIndex !== undefined) row.current_phase_index = patch.currentPhaseIndex
  if (patch.completedAt !== undefined) row.completed_at = patch.completedAt
  if (patch.skipped !== undefined) row.skipped = patch.skipped
  await supabase.from('onboarding_state').upsert(row, { onConflict: 'user_id' })
}

interface InterviewAnswerRow {
  question_id: string
  selected_option_id: string | null
  free_text_answer: string | null
}

function rowToInterviewAnswer(row: InterviewAnswerRow): InterviewAnswerInput {
  return {
    questionId: row.question_id,
    selectedOptionId: row.selected_option_id,
    freeTextAnswer: row.free_text_answer,
  }
}

export async function fetchInterviewAnswers(userId: string): Promise<InterviewAnswerInput[]> {
  const { data, error } = await supabase
    .from('interview_answers')
    .select('question_id, selected_option_id, free_text_answer')
    .eq('user_id', userId)
  if (error || !data) return []
  return (data as InterviewAnswerRow[]).map(rowToInterviewAnswer)
}

export async function upsertInterviewAnswer(
  userId: string,
  answer: InterviewAnswerInput,
): Promise<void> {
  await supabase.from('interview_answers').upsert(
    {
      user_id: userId,
      question_id: answer.questionId,
      selected_option_id: answer.selectedOptionId,
      free_text_answer: answer.freeTextAnswer,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,question_id' },
  )
}

export interface VoiceCardRecord {
  roleLabel: string
  povFingerprint: string
  completenessPct: number
  completenessNote: string
  opinions: VoiceCardOpinion[]
  contentOrientation: ContentOrientation | null
}

interface VoiceCardRow {
  role_label: string
  pov_fingerprint: string
  completeness_pct: number
  completeness_note: string
  content_orientation: ContentOrientation | null
}

interface VoiceCardOpinionRow {
  id: string
  quote: string
  placeholder: boolean
  sort_order: number
}

export async function fetchVoiceCard(userId: string): Promise<VoiceCardRecord | null> {
  const [cardResult, opinionsResult] = await Promise.all([
    supabase.from('voice_cards').select('*').eq('user_id', userId).single(),
    supabase
      .from('voice_card_opinions')
      .select('id, quote, placeholder, sort_order')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true }),
  ])
  if (cardResult.error || !cardResult.data) return null
  const card = cardResult.data as VoiceCardRow
  const opinions = ((opinionsResult.data ?? []) as VoiceCardOpinionRow[]).map((row) => ({
    id: row.id,
    quote: row.quote,
    placeholder: row.placeholder,
  }))
  return {
    roleLabel: card.role_label,
    povFingerprint: card.pov_fingerprint,
    completenessPct: card.completeness_pct,
    completenessNote: card.completeness_note,
    opinions,
    contentOrientation: card.content_orientation,
  }
}

/** Upserts the `voice_cards` singleton and fully replaces
 * `voice_card_opinions` for this user with the freshly-derived list — the
 * derivation is cheap and deterministic (see `src/lib/voiceCard.ts`), so
 * replace-not-diff keeps this simple and correct.
 *
 * `importedFromText`, when passed, also sets `voice_cards.imported_from_text`
 * — only the "upload an existing Voice Card" flow passes it, so the normal
 * interview-answer save path (which never passes it) never clobbers a
 * previously-imported raw text with `null`. */
export async function upsertVoiceCard(
  userId: string,
  record: VoiceCardRecord,
  importedFromText?: string,
): Promise<void> {
  const row: Record<string, unknown> = {
    user_id: userId,
    role_label: record.roleLabel,
    pov_fingerprint: record.povFingerprint,
    completeness_pct: record.completenessPct,
    completeness_note: record.completenessNote,
    content_orientation: record.contentOrientation,
    updated_at: new Date().toISOString(),
  }
  if (importedFromText !== undefined) row.imported_from_text = importedFromText
  await supabase.from('voice_cards').upsert(row, { onConflict: 'user_id' })

  await supabase.from('voice_card_opinions').delete().eq('user_id', userId)
  if (record.opinions.length > 0) {
    await supabase.from('voice_card_opinions').insert(
      record.opinions.map((op, index) => ({
        user_id: userId,
        quote: op.quote,
        placeholder: Boolean(op.placeholder),
        sort_order: index,
      })),
    )
  }
}

// Drafter persistence + the AI edge functions behind the word processor:
// `drafts` rows, `draft_feedback` (what the drafter learns from), and
// draft-post / suggest-topics / revise-text.
import { supabase } from '@/lib/supabaseClient'
import type { Draft, IdeaCheck, RoastFlag } from '@/data/types'

interface DraftRow {
  id: string
  title: string
  paragraphs: string[]
  excerpt: string
  stage: string
  format: 'post' | 'article'
  voice_match: number
  slop_score: number
  roast_verdict: string
  roast_flags: RoastFlag[]
  source_label: string | null
  ai_original: string[] | null
  idea_check: IdeaCheck | null
  created_at: string
  updated_at: string
}

function rowToDraft(row: DraftRow): Draft {
  return {
    id: row.id,
    title: row.title,
    paragraphs: row.paragraphs ?? [],
    excerpt: row.excerpt,
    stage: row.stage,
    format: row.format ?? 'post',
    voiceMatch: row.voice_match,
    slopScore: row.slop_score,
    roastVerdict: row.roast_verdict,
    roastFlags: row.roast_flags ?? [],
    sourceLabel: row.source_label,
    aiOriginal: row.ai_original,
    ideaCheck: row.idea_check,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const DRAFT_COLUMNS =
  'id, title, paragraphs, excerpt, stage, format, voice_match, slop_score, roast_verdict, roast_flags, source_label, ai_original, idea_check, created_at, updated_at'

export async function fetchDrafts(userId: string): Promise<Draft[]> {
  const { data, error } = await supabase
    .from('drafts')
    .select(DRAFT_COLUMNS)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error || !data) return []
  return (data as unknown as DraftRow[]).map(rowToDraft)
}

/** `supabase.functions.invoke` surfaces the real `{ error }` body on
 * `error.context` (a raw Response); `error.message` alone is a generic string. */
async function extractFunctionErrorMessage(error: unknown): Promise<string> {
  const withContext = error as { context?: Response; message?: string }
  if (withContext?.context && typeof withContext.context.json === 'function') {
    try {
      const body = await withContext.context.json()
      if (body && typeof body.error === 'string') return body.error
    } catch {
      // Response body wasn't JSON (or already consumed): fall through.
    }
  }
  return withContext?.message ?? 'Something went wrong talking to the drafting service.'
}

async function invoke<T>(name: string, body: Record<string, unknown>): Promise<T | { error: string }> {
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (error) return { error: await extractFunctionErrorMessage(error) }
  if (data?.error) return { error: data.error as string }
  return data as T
}

export type DraftFormat = 'post' | 'newsletter'

export async function draftPost(
  topic: string,
  format: DraftFormat,
): Promise<{ draft: Draft; learnedFrom: { edits: number; feedback: number } } | { error: string }> {
  const result = await invoke<{ draft: DraftRow; learnedFrom: { edits: number; feedback: number } }>('draft-post', {
    topic,
    format,
  })
  if ('error' in result) return result
  return { draft: rowToDraft(result.draft), learnedFrom: result.learnedFrom }
}

export interface TopicIdea {
  topic: string
  angle: string
  why: string
  source: string
}

export async function suggestTopics(steer?: string): Promise<{ ideas: TopicIdea[]; researched: boolean } | { error: string }> {
  return invoke<{ ideas: TopicIdea[]; researched: boolean }>('suggest-topics', { steer: steer ?? '' })
}

export interface ReviseResult {
  text: string
  textureBefore: number | null
  flags: { quote: string; why: string }[]
  remainingTells: string[]
}

export async function reviseText(input: {
  text: string
  mode: 'humanize' | 'custom'
  instruction?: string
  draftId?: string | null
}): Promise<ReviseResult | { error: string }> {
  return invoke<ReviseResult>('revise-text', input)
}

export async function createBlankDraft(userId: string): Promise<Draft | null> {
  const { data, error } = await supabase
    .from('drafts')
    .insert({ user_id: userId, title: '', paragraphs: [], excerpt: '', stage: 'draft' })
    .select(DRAFT_COLUMNS)
    .single()
  if (error || !data) return null
  return rowToDraft(data as unknown as DraftRow)
}

/** Saves the editor's title + body (RLS scopes this to the caller's own row). */
export async function updateDraft(draftId: string, title: string, paragraphs: string[]): Promise<boolean> {
  const { error } = await supabase
    .from('drafts')
    .update({ title, paragraphs, excerpt: paragraphs[0]?.slice(0, 140) ?? '', updated_at: new Date().toISOString() })
    .eq('id', draftId)
  return !error
}

export async function deleteDraft(draftId: string): Promise<void> {
  await supabase.from('drafts').delete().eq('id', draftId)
}

export type FeedbackKind = 'liked' | 'disliked' | 'note'

export async function saveFeedback(userId: string, draftId: string | null, kind: FeedbackKind, note = ''): Promise<boolean> {
  const { error } = await supabase
    .from('draft_feedback')
    .insert({ user_id: userId, draft_id: draftId, kind, note: note.slice(0, 500) })
  return !error
}

export interface LearningStats {
  feedback: { kind: FeedbackKind; note: string }[]
}

export async function fetchRecentFeedback(userId: string): Promise<LearningStats['feedback']> {
  const { data } = await supabase
    .from('draft_feedback')
    .select('kind, note')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(15)
  return (data as LearningStats['feedback'] | null) ?? []
}

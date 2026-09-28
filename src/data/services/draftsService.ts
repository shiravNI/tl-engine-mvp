// Drafter persistence/edge-function calls — `public.drafts` (only the
// columns this MVP reads/writes, see `src/data/types.ts`) plus the two
// real `draft-post`/`humanize-draft` Supabase Edge Functions.
import { supabase } from '@/lib/supabaseClient'
import type { Draft, RoastFlag } from '@/data/types'

interface DraftRow {
  id: string
  title: string
  paragraphs: string[]
  excerpt: string
  stage: string
  voice_match: number
  slop_score: number
  roast_verdict: string
  roast_flags: RoastFlag[]
  source_label: string | null
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
    voiceMatch: row.voice_match,
    slopScore: row.slop_score,
    roastVerdict: row.roast_verdict,
    roastFlags: row.roast_flags ?? [],
    sourceLabel: row.source_label,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const DRAFT_COLUMNS =
  'id, title, paragraphs, excerpt, stage, voice_match, slop_score, roast_verdict, roast_flags, source_label, created_at, updated_at'

export async function fetchDrafts(userId: string): Promise<Draft[]> {
  const { data, error } = await supabase
    .from('drafts')
    .select(DRAFT_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return (data as unknown as DraftRow[]).map(rowToDraft)
}

/** `supabase.functions.invoke` throws its error via `error.context`, which
 * is the raw `Response` — `error.message` alone is a useless generic
 * string ("Edge Function returned a non-2xx status code"), so the actual
 * `{ error: string }` body has to be read off `error.context.json()`. */
async function extractFunctionErrorMessage(error: unknown): Promise<string> {
  const withContext = error as { context?: Response; message?: string }
  if (withContext?.context && typeof withContext.context.json === 'function') {
    try {
      const body = await withContext.context.json()
      if (body && typeof body.error === 'string') return body.error
    } catch {
      // Response body wasn't JSON (or already consumed) — fall through.
    }
  }
  return withContext?.message ?? 'Something went wrong talking to the drafting service.'
}

export type DraftFunctionResult = { draft: Draft } | { error: string }

export async function draftPost(topic: string): Promise<DraftFunctionResult> {
  const { data, error } = await supabase.functions.invoke('draft-post', { body: { topic } })
  if (error) return { error: await extractFunctionErrorMessage(error) }
  if (data?.error) return { error: data.error as string }
  return { draft: rowToDraft(data.draft as DraftRow) }
}

export async function humanizeDraft(draftId: string): Promise<DraftFunctionResult> {
  const { data, error } = await supabase.functions.invoke('humanize-draft', { body: { draftId } })
  if (error) return { error: await extractFunctionErrorMessage(error) }
  if (data?.error) return { error: data.error as string }
  return { draft: rowToDraft(data.draft as DraftRow) }
}

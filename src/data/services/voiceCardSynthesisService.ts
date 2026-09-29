// Calls the `synthesize-voice-card` edge function — the real Phase-3
// write-up, not a mechanical derivation. See `src/lib/interviewTranscript.ts`
// for how the raw answers become the transcript this sends.
import { supabase } from '@/lib/supabaseClient'
import type { TranscriptEntry } from '@/lib/interviewTranscript'
import type { SynthesizedVoiceCard } from '@/data/types'

export type SynthesisResult = { synthesized: SynthesizedVoiceCard } | { error: string }

export async function synthesizeVoiceCard(entries: TranscriptEntry[]): Promise<SynthesisResult> {
  const { data, error } = await supabase.functions.invoke('synthesize-voice-card', { body: { entries } })
  if (error) {
    const context = (error as { context?: Response }).context
    const details = context ? await context.json().catch(() => null) : null
    return { error: details?.error || 'Synthesis failed — try again in a moment.' }
  }
  if (data?.error) return { error: data.error as string }
  return { synthesized: data.synthesized as SynthesizedVoiceCard }
}

export async function fetchSynthesizedVoiceCard(userId: string): Promise<SynthesizedVoiceCard | null> {
  const { data } = await supabase.from('voice_cards').select('synthesized').eq('user_id', userId).maybeSingle()
  return (data?.synthesized as SynthesizedVoiceCard | null) ?? null
}

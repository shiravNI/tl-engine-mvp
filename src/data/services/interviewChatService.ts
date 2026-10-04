// The interview as a real conversation: `interview-chat` edge function
// (one interviewer turn per call) plus per-person transcript persistence
// so a half-finished interview resumes where it left off.
import { supabase } from '@/lib/supabaseClient'
import type { ChatTurn } from '@/lib/interviewTranscript'
import type { ContentOrientation } from '@/data/onboardingCatalog'

export interface InterviewReply {
  reply: string
  options: string[] | null
  phase: string | null
  quote: string | null
  orientation: ContentOrientation | null
  done: boolean
}

export type InterviewTurnResult = InterviewReply | { error: string }

/** Anthropic requires the first message to be from the user, so the
 * interviewer's own opening line is preceded by a stand-in. */
const START_MARKER: ChatTurn = { role: 'user', content: '(Start the interview.)' }

export async function sendInterviewTurn(turns: ChatTurn[]): Promise<InterviewTurnResult> {
  const messages = [START_MARKER, ...turns].map(({ role, content }) => ({ role, content }))
  const { data, error } = await supabase.functions.invoke('interview-chat', { body: { messages } })
  if (error) {
    const context = (error as { context?: Response }).context
    const details = context ? await context.json().catch(() => null) : null
    return { error: details?.error || 'Something went wrong reaching the interviewer.' }
  }
  if (data?.error) return { error: data.error as string }
  return data as InterviewReply
}

export async function fetchChatTranscript(userId: string): Promise<ChatTurn[] | null> {
  const { data } = await supabase
    .from('onboarding_state')
    .select('chat_transcript')
    .eq('user_id', userId)
    .maybeSingle()
  const transcript = data?.chat_transcript as ChatTurn[] | null | undefined
  return Array.isArray(transcript) && transcript.length > 0 ? transcript : null
}

export async function saveChatTranscript(userId: string, transcript: ChatTurn[]): Promise<void> {
  await supabase
    .from('onboarding_state')
    .upsert(
      { user_id: userId, chat_transcript: transcript, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
}

export async function saveContentOrientation(userId: string, orientation: ContentOrientation): Promise<void> {
  await supabase
    .from('voice_cards')
    .upsert({ user_id: userId, content_orientation: orientation }, { onConflict: 'user_id' })
}

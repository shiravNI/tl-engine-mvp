// Turns the interview chat into the {prompt, answer} pairs
// `synthesize-voice-card` expects: each interviewer message is the
// "question", the person's following message(s) are the "answer".
export interface TranscriptEntry {
  prompt: string
  answer: string
}

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
  /** Tappable choices that came with an assistant question. */
  options?: string[] | null
}

export function buildChatEntries(turns: ChatTurn[]): TranscriptEntry[] {
  const entries: TranscriptEntry[] = []
  let prompt: string | null = null
  for (const turn of turns) {
    if (turn.role === 'assistant') {
      prompt = turn.content
    } else if (prompt !== null) {
      entries.push({ prompt, answer: turn.content })
      prompt = null
    }
  }
  return entries
}

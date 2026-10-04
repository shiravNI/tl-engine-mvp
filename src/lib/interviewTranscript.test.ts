import { describe, expect, it } from 'vitest'
import { buildChatEntries, type ChatTurn } from '@/lib/interviewTranscript'

describe('buildChatEntries', () => {
  it('pairs each interviewer message with the answer that follows it', () => {
    const turns: ChatTurn[] = [
      { role: 'assistant', content: 'What do you do?' },
      { role: 'user', content: 'I run partnerships.' },
      { role: 'assistant', content: 'Why LinkedIn?' },
      { role: 'user', content: 'Buyers.' },
      { role: 'assistant', content: 'Tell me more.' },
    ]
    expect(buildChatEntries(turns)).toEqual([
      { prompt: 'What do you do?', answer: 'I run partnerships.' },
      { prompt: 'Why LinkedIn?', answer: 'Buyers.' },
    ])
  })

  it('returns an empty list when nothing has been answered', () => {
    expect(buildChatEntries([{ role: 'assistant', content: 'Hi' }])).toEqual([])
  })
})

// A canned, offline stand-in for the `interview-chat` edge function, used
// ONLY by the no-persistence /interview-demo page so the chat UI (options,
// phase bar, kept quotes, fork, finish) can be previewed before an
// Anthropic key is configured. The questions are fixed, not adaptive.
import type { ChatTurn } from '@/lib/interviewTranscript'
import type { InterviewReply } from '@/data/services/interviewChatService'

const STEPS: Omit<InterviewReply, 'quote' | 'orientation'>[] = [
  { reply: "Got it. What's the specific thing you know better than most people in your field?", options: null, phase: 'identity', done: false },
  { reply: "Now the real question: why do you want to post on LinkedIn? What's the actual goal, past \"build my brand\"?", options: null, phase: 'goals', done: false },
  {
    reply: "What's really driving this: personal visibility, or bringing in business?",
    options: ['Personal visibility: recognition, speaking, career', 'Bringing in business: trust with buyers or partners'],
    phase: 'goals',
    done: false,
  },
  { reply: "How would you describe the way you communicate in real life, not just professionally? And what do you never want to sound like?", options: null, phase: 'voice', done: false },
  {
    reply: "Now some multiple choice. Pick your gut reaction. AI in your field is going to:",
    options: ['Replace most entry-level work', 'Make good people great and bad people dangerous', 'Change less than everyone thinks', 'Mostly create new kinds of mess'],
    phase: 'opinions',
    done: false,
  },
  {
    reply: 'The biggest lie your industry tells itself is:',
    options: ['That more data means better decisions', 'That everyone is already doing it well', 'That the hard part is the tooling', 'That buyers know what they want'],
    phase: 'opinions',
    done: false,
  },
  { reply: "Hot take, no options: what's an opinion about your industry that most people would push back on?", options: null, phase: 'opinions', done: false },
  {
    reply: "From what you've said, I'd call you The Contrarian, with a streak of The Practitioner. Does that resonate?",
    options: ['Yes, that is me', 'Closer to the Educator', 'Closer to the Storyteller'],
    phase: 'persona',
    done: false,
  },
  {
    reply: 'Rapid fire on format. Short and punchy, or long narrative?',
    options: ['Short and punchy', 'Long narrative', 'Depends on the post'],
    phase: 'format',
    done: false,
  },
  { reply: 'Last one: what do you read, listen to or watch to stay sharp? Newsletters, podcasts, people you follow?', options: null, phase: 'sources', done: false },
  {
    reply: "That's everything I need. Next I'd write up your Voice Card from this conversation. (Scripted preview: the real interviewer asks 35 to 50 adaptive questions first.)",
    options: null,
    phase: 'sources',
    done: true,
  },
]

const FORK_STEP = 2

export function scriptedInterviewTurn(turns: ChatTurn[]): InterviewReply {
  const answered = turns.filter((t) => t.role === 'user')
  const lastAnswer = answered[answered.length - 1]?.content ?? ''
  const step = STEPS[Math.min(answered.length - 1, STEPS.length - 1)]
  // Keep a short, quotable line from free-text answers so the sidebar fills in.
  const isOpenAnswer = lastAnswer.length > 25 && lastAnswer.length <= 200
  const orientation =
    answered.length - 1 === FORK_STEP + 1
      ? /business|buyers/i.test(lastAnswer)
        ? 'audience_sales'
        : 'personal_brand'
      : null
  return { ...step, quote: isOpenAnswer ? lastAnswer : null, orientation }
}

// Step 1's "idea generator" — a curated, generic set of angles that work
// regardless of industry, for someone staring at a blank box. Not
// personalized (no research pass in this MVP) — just enough to get a
// blank-page person moving. Rotates a random subset so it doesn't feel
// stale on repeat visits.
export const PROMPT_STARTERS: string[] = [
  'Something you changed your mind about this year',
  'A mistake you made early on that taught you the most',
  'The most overrated piece of advice in your field',
  'A moment a client or colleague said something that stuck with you',
  'One thing you wish someone had told you when you started',
  'A belief you hold that most people in your industry would push back on',
  "Something you've seen work that shouldn't have, by the book",
  'A pattern you keep noticing that nobody talks about',
  'The real reason most people fail at the thing you do well',
  'A question you get asked constantly, answered properly for once',
]

export function pickPromptStarters(count = 4): string[] {
  const shuffled = [...PROMPT_STARTERS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

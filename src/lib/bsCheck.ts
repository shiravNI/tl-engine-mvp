// A fixed, deterministic checklist — in code, same result every time,
// same whether the AI drafting engine is up, down, or never configured.
// Structured as five categories (inspired by yourpost.sucks's public
// methodology, reimplemented independently here — no shared code, checks,
// or copy) so a flagged post tells you *what kind* of problem it has, not
// just a bare number.
export type BsCategory = 'inauthenticity' | 'vagueness' | 'cringe' | 'engagementBait' | 'humbleBrag'

export interface BsCheckDef {
  id: string
  category: BsCategory
  label: string
  test: (text: string) => boolean
}

export const CATEGORY_META: Record<BsCategory, { title: string; question: string }> = {
  inauthenticity: {
    title: 'Inauthenticity',
    question: 'Does this sound like a real person, or a template with the names swapped in?',
  },
  vagueness: {
    title: 'Vagueness',
    question: 'Could a stranger tell what actually happened, in plain terms?',
  },
  cringe: {
    title: 'Cringe factor',
    question: 'Is there a line here that would make someone wince read aloud?',
  },
  engagementBait: {
    title: 'Engagement bait',
    question: 'Is this trying to farm a reaction instead of just saying something?',
  },
  humbleBrag: {
    title: 'Humble brag',
    question: 'Is a personal update dressed up as a lesson for the reader?',
  },
}

const has = (re: RegExp) => (text: string) => re.test(text)

// Word count and sentence-length helpers used by a couple of the
// vagueness checks below.
function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}
function longestSentenceWords(text: string): number {
  const sentences = text.split(/(?<=[.!?])\s+/)
  return Math.max(0, ...sentences.map((s) => wordCount(s)))
}
function maxRepeatedEmoji(text: string): number {
  const emojis = text.match(/\p{Extended_Pictographic}/gu) ?? []
  const counts = new Map<string, number>()
  for (const e of emojis) counts.set(e, (counts.get(e) ?? 0) + 1)
  return Math.max(0, ...counts.values())
}

export const BS_CHECKS: BsCheckDef[] = [
  // ---------------------------------------------------------------------
  // Inauthenticity — sounds machine-assisted or template-shaped
  // ---------------------------------------------------------------------
  { id: 'excited-to-announce', category: 'inauthenticity', label: '"Excited/thrilled to announce"', test: has(/\b(excited|thrilled|pleased) to announce\b/i) },
  { id: 'new-chapter', category: 'inauthenticity', label: '"New chapter" / "new adventure" language', test: has(/\bnew (chapter|adventure|journey)\b/i) },
  { id: 'officially', category: 'inauthenticity', label: '"Officially" as filler ("officially joining/launching")', test: has(/\bofficially (joining|joined|launching|launched|announcing)\b/i) },
  { id: 'gratitude-list', category: 'inauthenticity', label: 'A long named thank-you list', test: (t) => (t.match(/\bthank you to\b/gi) ?? []).length + (t.match(/\bshout[- ]?out to\b/gi) ?? []).length >= 2 },
  { id: 'believed-in-me', category: 'inauthenticity', label: '"Everyone who believed in me"', test: has(/\beveryone who believed in me\b/i) },
  { id: 'performative-vulnerability', category: 'inauthenticity', label: 'Performative-vulnerability opener ("I don\'t usually share this")', test: has(/\bi don'?t (usually|normally) (share|post|talk about) this\b/i) },
  { id: 'rapid-growth', category: 'inauthenticity', label: 'Rapid-growth narrative ("in just N weeks/months")', test: has(/\bin (just )?\d+ (days|weeks|months)\b/i) },
  { id: 'career-pivot', category: 'inauthenticity', label: 'Career-pivot vocabulary ("thrilled to share I\'m transitioning")', test: has(/\b(transitioning|pivoting) (into|to)\b/i) },
  { id: 'machine-phrasing', category: 'inauthenticity', label: 'Machine-assisted phrasing (leverage/synergy/game-changer/etc.)', test: has(/\b(leverag(e|ing)|synerg(y|ies)|game[- ]chang(er|ing)|unlock(ing)? (true )?potential|at the end of the day|circle back|move the needle|double-click on)\b/i) },
  { id: 'not-just-x', category: 'inauthenticity', label: '"It\'s not just X, it\'s Y"', test: has(/\bit'?s not (?:just )?[\w\s]+, it'?s\b/i) },
  { id: 'em-dash-density', category: 'inauthenticity', label: 'Em/en dash density', test: (t) => ((t.match(/[—–]/g) ?? []).length > 1) },
  { id: 'hedged-claim', category: 'inauthenticity', label: 'Overhedged claims ("might", "could potentially", "in some ways")', test: (t) => (t.match(/\b(might|could potentially|in some ways|sort of|kind of)\b/gi) ?? []).length >= 3 },

  // ---------------------------------------------------------------------
  // Vagueness — can't tell what actually happened
  // ---------------------------------------------------------------------
  { id: 'no-specifics', category: 'vagueness', label: 'No concrete number, name, or date anywhere', test: (t) => !/\d/.test(t) && !/\b[A-Z][a-z]+\s[A-Z][a-z]+\b/.test(t) },
  { id: 'vague-nouns', category: 'vagueness', label: 'Vague nouns ("amazing results", "incredible things")', test: has(/\b(amazing|incredible|huge|massive) (results|things|impact|success)\b/i) },
  { id: 'long-sentence', category: 'vagueness', label: 'A sentence over 45 words', test: (t) => longestSentenceWords(t) > 45 },
  { id: 'too-long', category: 'vagueness', label: 'Runs long for what it actually says', test: (t) => wordCount(t) > 350 },
  { id: 'too-short', category: 'vagueness', label: "Too short to say anything real", test: (t) => wordCount(t) > 0 && wordCount(t) < 15 },
  { id: 'repetition', category: 'vagueness', label: 'The same distinctive word repeated 4+ times', test: (t) => {
    const words = t.toLowerCase().match(/\b[a-z]{6,}\b/g) ?? []
    const counts = new Map<string, number>()
    for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1)
    return Math.max(0, ...counts.values()) >= 4
  } },
  { id: 'logistics-only', category: 'vagueness', label: 'Pure logistics, no substance ("save the date", "link in comments")', test: has(/\b(save the date|link in (the )?comments|swipe (up|left)|see you there)\b/i) },
  { id: 'fragment-heavy', category: 'vagueness', label: 'Overuses one-word sentence fragments', test: (t) => (t.match(/(?:^|\n)\s*[A-Z][a-z]*\.\s*(?:\n|$)/g) ?? []).length >= 3 },

  // ---------------------------------------------------------------------
  // Cringe factor
  // ---------------------------------------------------------------------
  { id: 'emoji-abuse', category: 'cringe', label: 'More than 6 emoji', test: (t) => (t.match(/\p{Extended_Pictographic}/gu) ?? []).length > 6 },
  { id: 'repeated-emoji', category: 'cringe', label: 'The same emoji repeated 3+ times', test: (t) => maxRepeatedEmoji(t) >= 3 },
  { id: 'hashtag-stuffing', category: 'cringe', label: 'More than 5 hashtags', test: (t) => (t.match(/#\w+/g) ?? []).length > 5 },
  { id: 'one-line-paragraphs', category: 'cringe', label: 'Overuses one-sentence-per-line formatting', test: (t) => t.split('\n').filter((l) => l.trim().length > 0 && l.trim().split(/\s+/).length <= 6).length >= 6 },
  { id: 'dramatic-one-word', category: 'cringe', label: 'A standalone dramatic one-word line ("Wow.", "Incredible.")', test: has(/(?:^|\n)\s*(wow|incredible|unbelievable|insane|wild)\.?\s*(?:\n|$)/i) },
  { id: 'shouting', category: 'cringe', label: 'ALL CAPS shouting', test: (t) => (t.match(/\b[A-Z]{4,}\b/g) ?? []).length >= 2 },

  // ---------------------------------------------------------------------
  // Engagement bait
  // ---------------------------------------------------------------------
  { id: 'comment-bait', category: 'engagementBait', label: 'Comment bait ("comment below", "drop a 🔥")', test: has(/\b(comment below|drop a|comment "?yes"?)\b/i) },
  { id: 'follow-repost-bait', category: 'engagementBait', label: 'Follow/repost bait', test: has(/\b(follow (me|for more)|repost if|share this if)\b/i) },
  { id: 'manufactured-profundity', category: 'engagementBait', label: '"Let that sink in" / manufactured profundity', test: has(/\blet that sink in\b/i) },
  { id: 'numbered-lessons', category: 'engagementBait', label: 'Numbered-lessons listicle framing', test: has(/\b\d+ (lessons|things|reasons|ways) i (learned|wish)\b/i) },
  { id: 'closing-question', category: 'engagementBait', label: 'A generic closing question ("What do you think?")', test: has(/(what do you think\??|agree or disagree\??|thoughts\?)\s*$/i) },
  { id: 'plug-signoff', category: 'engagementBait', label: 'A plug sign-off ("DM me to learn more")', test: has(/\bdm me\b/i) },
  { id: 'engagement-generic', category: 'engagementBait', label: 'Generic engagement bait ("tag someone", "save this post")', test: has(/\b(tag someone|save this post)\b/i) },

  // ---------------------------------------------------------------------
  // Humble brag
  // ---------------------------------------------------------------------
  { id: 'humbled', category: 'humbleBrag', label: '"Humbled" as an opener', test: has(/\bhumbled\b/i) },
  { id: 'honored', category: 'humbleBrag', label: '"Honored" / "recognized"', test: has(/\b(honored|recognized)\b/i) },
  { id: 'make-impact', category: 'humbleBrag', label: '"Make an impact"', test: has(/\bmake an impact\b/i) },
  { id: 'dream-role', category: 'humbleBrag', label: '"Dream job/role"', test: has(/\bdream (job|role)\b/i) },
  { id: 'rejection-to-triumph', category: 'humbleBrag', label: 'Rejection-to-triumph arc ("got rejected N times, but")', test: has(/\brejected \d+ times?\b/i) },
  { id: 'numeric-flex', category: 'humbleBrag', label: 'A bare numeric flex with no context ("#1", "10 years")', test: has(/\b(number one|#1|top 1%)\b/i) },
  { id: 'casual-name-drop', category: 'humbleBrag', label: 'Casual name-drop ("as I told [name]")', test: has(/\bas i (told|said to) [A-Z]/i) },
]

// A post about a genuinely serious, sensitive event doesn't get scored at
// all — declined before anything else runs, on purpose erring toward
// declining. Keyword-based, not exhaustive; a real safety gate for a
// pattern-matcher like this can only ever be a floor, not a guarantee.
const SENSITIVE_TOPIC = /\b(passed away|died|death|suicide|self[- ]harm|miscarriage|stillbirth|assault|abuse)\b/i

export function isSensitiveContent(text: string): boolean {
  return SENSITIVE_TOPIC.test(text)
}

export interface BsCheckResult {
  score: number // 0 clean, 10 unusable
  matches: BsCheckDef[]
  byCategory: Record<BsCategory, BsCheckDef[]>
  declined: boolean
}

const EMPTY_BY_CATEGORY: Record<BsCategory, BsCheckDef[]> = {
  inauthenticity: [],
  vagueness: [],
  cringe: [],
  engagementBait: [],
  humbleBrag: [],
}

export function runBsCheck(text: string): BsCheckResult {
  if (!text.trim()) return { score: 0, matches: [], byCategory: EMPTY_BY_CATEGORY, declined: false }
  if (isSensitiveContent(text)) {
    return { score: 0, matches: [], byCategory: EMPTY_BY_CATEGORY, declined: true }
  }
  const matches = BS_CHECKS.filter((c) => c.test(text))
  const byCategory: Record<BsCategory, BsCheckDef[]> = { ...EMPTY_BY_CATEGORY }
  for (const m of matches) byCategory[m.category] = [...byCategory[m.category], m]
  const score = Math.min(10, matches.length)
  return { score, matches, byCategory, declined: false }
}

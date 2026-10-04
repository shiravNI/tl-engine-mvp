import { useState } from 'react'
import { suggestPrompts, suggestTopics, type DraftFormat, type TopicIdea } from '@/data/services/draftsService'
import { pickPromptStarters } from '@/lib/promptStarters'
import { Button } from '@/components/primitives/Button'
import { Card } from '@/components/primitives/Card'
import { Icon } from '@/components/icons/Icon'
import { cx } from '@/lib/cx'

interface IdeasPanelProps {
  busy: boolean
  onDraft: (topic: string, format: DraftFormat) => void
}

/** Where drafts start: type your own idea, or let the AI research a few. */
export function IdeasPanel({ busy, onDraft }: IdeasPanelProps) {
  const [idea, setIdea] = useState('')
  const [format, setFormat] = useState<DraftFormat>('post')
  const [prompts, setPrompts] = useState(() => pickPromptStarters(4))
  const [promptsAreAi, setPromptsAreAi] = useState(false)
  const [loadingPrompts, setLoadingPrompts] = useState(false)
  const [promptError, setPromptError] = useState<string | null>(null)
  const [activePrompt, setActivePrompt] = useState<string | null>(null)
  const [steer, setSteer] = useState('')
  const [researching, setResearching] = useState(false)
  const [ideas, setIdeas] = useState<TopicIdea[]>([])
  const [researched, setResearched] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function shufflePrompts() {
    setPrompts(pickPromptStarters(4, prompts))
    setPromptsAreAi(false)
    setPromptError(null)
  }

  async function aiPrompts() {
    setLoadingPrompts(true)
    setPromptError(null)
    const result = await suggestPrompts(prompts)
    setLoadingPrompts(false)
    if ('error' in result) {
      setPromptError(result.error)
      return
    }
    setPrompts(result.prompts)
    setPromptsAreAi(true)
    setActivePrompt(null)
  }

  function submit() {
    const answer = idea.trim()
    if (!answer) return
    onDraft(activePrompt ? `${activePrompt}\n\nMy answer: ${answer}` : answer, format)
  }

  async function research() {
    setResearching(true)
    setError(null)
    const result = await suggestTopics(steer)
    setResearching(false)
    if ('error' in result) {
      setError(result.error)
      return
    }
    setIdeas(result.ideas)
    setResearched(result.researched)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12px] font-semibold text-ink">Need a spark?</p>
          <div className="flex items-center gap-1">
            <button
              onClick={shufflePrompts}
              disabled={loadingPrompts}
              className="rounded-full border border-border px-2.5 py-1 text-[11.5px] font-semibold text-body hover:border-accent disabled:opacity-50"
            >
              Shuffle
            </button>
            <button
              onClick={() => void aiPrompts()}
              disabled={loadingPrompts}
              className="flex items-center gap-1 rounded-full border border-accent-dark px-2.5 py-1 text-[11.5px] font-semibold text-accent-dark hover:bg-accent-05 disabled:opacity-50"
            >
              <Icon name="spark" className="h-3 w-3" />
              {loadingPrompts ? 'Thinking…' : promptsAreAi ? 'New prompts for me' : 'Prompts for me'}
            </button>
          </div>
        </div>
        <p className="text-[11.5px] text-muted">
          {promptsAreAi
            ? 'Written for you from your Voice Card. Tap one, then answer it in a line or two.'
            : 'Tap a prompt, then answer it in a line or two. "Prompts for me" tailors them to your world.'}
        </p>
        {promptError && (
          <div className="flex gap-2 rounded-lg border border-warn-border bg-warn-bg p-2.5 text-[12px] text-warn-fg">
            <Icon name="alert" className="mt-0.5 h-3.5 w-3.5 flex-none" />
            <p>{promptError}</p>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          {prompts.map((p) => (
            <button
              key={p}
              onClick={() => setActivePrompt(activePrompt === p ? null : p)}
              className={cx(
                'rounded-lg border px-3 py-2 text-left text-[12.5px] leading-snug',
                activePrompt === p ? 'border-accent bg-accent-soft-bg text-ink' : 'border-border bg-surface text-body hover:border-accent',
              )}
            >
              {p}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[12px] font-semibold text-ink">{activePrompt ? 'Your answer' : 'Or write from your own idea'}</p>
        <textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          rows={3}
          placeholder={activePrompt ? 'A couple of sentences is plenty. Specifics beat polish.' : 'A sentence is enough. What do you want to say?'}
          className="resize-none rounded-lg border border-border bg-surface px-3 py-2 text-[13px] text-ink outline-none placeholder:text-muted focus:border-accent"
        />
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-border p-0.5">
            {(['post', 'newsletter'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={cx(
                  'rounded-full px-3 py-1 text-[11.5px] font-semibold capitalize',
                  format === f ? 'bg-espresso text-cream' : 'text-muted hover:text-ink',
                )}
              >
                {f === 'post' ? 'LinkedIn post' : 'Newsletter'}
              </button>
            ))}
          </div>
          <Button
            variant="primary"
            size="sm"
            className="ml-auto"
            disabled={busy || !idea.trim()}
            onClick={submit}
          >
            <Icon name="pen" className="h-[13px] w-[13px]" />
            Draft it
          </Button>
        </div>
      </div>

      <div className="h-px bg-border-soft" />

      <div className="flex flex-col gap-2">
        <p className="text-[12px] font-semibold text-ink">Or let me research ideas for you</p>
        <p className="text-[12px] text-muted">
          I look at what's moving in your space right now and pitch angles only you could write, based on your Voice
          Card and what you've drafted before.
        </p>
        <input
          value={steer}
          onChange={(e) => setSteer(e.target.value)}
          placeholder="Optional: a theme to lean toward"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-[12.5px] text-ink outline-none placeholder:text-muted focus:border-accent"
        />
        <Button variant="secondary" size="sm" onClick={() => void research()} disabled={researching || busy}>
          <Icon name="spark" className="h-[13px] w-[13px]" />
          {researching ? 'Researching…' : ideas.length > 0 ? 'Research more ideas' : 'Research ideas'}
        </Button>
        {error && (
          <div className="flex gap-2 rounded-lg border border-warn-border bg-warn-bg p-2.5 text-[12px] text-warn-fg">
            <Icon name="alert" className="mt-0.5 h-3.5 w-3.5 flex-none" />
            <p>{error}</p>
          </div>
        )}
        {ideas.length > 0 && !researched && (
          <p className="text-[11.5px] text-muted">Web search wasn't available, so these come from your Voice Card alone.</p>
        )}
        <div className="flex flex-col gap-2">
          {ideas.map((i) => (
            <Card key={i.topic} className="flex flex-col gap-1.5 p-3">
              <p className="text-[13px] font-semibold leading-snug text-ink">{i.topic}</p>
              <p className="text-[12px] leading-snug text-body">
                <span className="font-semibold">Your angle:</span> {i.angle}
              </p>
              <p className="text-[11.5px] leading-snug text-muted">{i.why}</p>
              <div className="flex items-center gap-2">
                <Button variant="soft" size="sm" disabled={busy} onClick={() => onDraft(`${i.topic} Angle: ${i.angle}`, format)}>
                  Draft this
                </Button>
                {i.source && (
                  <a
                    href={i.source}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-[11.5px] font-semibold text-accent-dark underline"
                  >
                    Source ↗
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

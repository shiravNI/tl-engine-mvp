import { useState } from 'react'
import type { Draft } from '@/data/types'
import type { FeedbackKind } from '@/data/services/draftsService'
import { Button } from '@/components/primitives/Button'
import { Card } from '@/components/primitives/Card'
import { Icon } from '@/components/icons/Icon'

interface LearningPanelProps {
  draft: Draft | null
  editedDraftCount: number
  feedback: { kind: FeedbackKind; note: string }[]
  onFeedback: (kind: FeedbackKind, note: string) => Promise<void>
}

/** Where the drafter learns. Two signals: your edits to its drafts (read
 * automatically) and what you tell it directly (here). */
export function LearningPanel({ draft, editedDraftCount, feedback, onFeedback }: LearningPanelProps) {
  const [note, setNote] = useState('')
  const [sent, setSent] = useState<FeedbackKind | null>(null)
  const canRate = !!draft?.aiOriginal

  async function submit(kind: FeedbackKind) {
    await onFeedback(kind, note.trim())
    setNote('')
    setSent(kind)
    setTimeout(() => setSent(null), 2500)
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-1.5 p-3.5">
        <p className="text-[12px] font-semibold text-ink">It gets better the more you edit</p>
        <p className="text-[12.5px] leading-snug text-body">
          Every time you write a draft, the AI reads how you changed its last few drafts, plus any feedback you leave
          here, and writes the next one closer to you.
        </p>
        <p className="text-[12px] text-muted">
          Learning from <b className="text-ink">{editedDraftCount}</b> edited {editedDraftCount === 1 ? 'draft' : 'drafts'} and{' '}
          <b className="text-ink">{feedback.length}</b> {feedback.length === 1 ? 'note' : 'notes'} so far.
        </p>
      </Card>

      <Card className="flex flex-col gap-2 p-3.5">
        <p className="text-[12px] font-semibold text-ink">How did this draft land?</p>
        {!canRate ? (
          <p className="text-[12px] text-muted">Feedback is for drafts the AI wrote. Write one from an idea first.</p>
        ) : (
          <>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Optional: what worked, or what's off? e.g. 'too polished', 'love the opening'"
              className="resize-none rounded-lg border border-border bg-surface px-3 py-2 text-[12.5px] text-ink outline-none placeholder:text-muted focus:border-accent"
            />
            <div className="flex items-center gap-2">
              <Button variant="soft" size="sm" onClick={() => void submit('liked')}>
                Sounds like me
              </Button>
              <Button variant="soft" size="sm" onClick={() => void submit('disliked')}>
                Not me
              </Button>
              {sent && (
                <span className="flex items-center gap-1 text-[12px] text-success-fg">
                  <Icon name="check" className="h-3.5 w-3.5" />
                  Learned
                </span>
              )}
            </div>
          </>
        )}
      </Card>

      {feedback.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted">What it knows so far</p>
          {feedback.slice(0, 8).map((f, i) => (
            <p key={i} className="text-[12px] leading-snug text-body">
              <span className="text-muted">{f.kind === 'liked' ? 'Liked' : f.kind === 'disliked' ? 'Disliked' : 'Note'}:</span>{' '}
              {f.note || (f.kind === 'liked' ? 'a draft that sounded like you' : 'a draft that did not')}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

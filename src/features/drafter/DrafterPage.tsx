import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/state/AuthContext'
import {
  createBlankDraft,
  deleteDraft,
  draftPost,
  fetchDrafts,
  fetchRecentFeedback,
  reviseText,
  saveFeedback,
  updateDraft,
  type DraftFormat,
  type FeedbackKind,
  type ReviseResult,
} from '@/data/services/draftsService'
import { IdeasPanel } from '@/features/drafter/IdeasPanel'
import { ReviewPanel } from '@/features/drafter/ReviewPanel'
import { LearningPanel } from '@/features/drafter/LearningPanel'
import { Button } from '@/components/primitives/Button'
import { Icon } from '@/components/icons/Icon'
import { cx } from '@/lib/cx'
import type { Draft } from '@/data/types'

const THIN_VOICE_CARD_MESSAGE = 'Voice Card is too thin'
const LINKEDIN_CHAR_LIMIT = 3000
const QUICK_EDITS = ['Make it shorter', 'Punchier opening', 'More specific', 'Warmer tone']

type Tab = 'ideas' | 'review' | 'learning'
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

const toText = (paragraphs: string[]) => paragraphs.join('\n\n')
const toParagraphs = (text: string) =>
  text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)

function draftLabel(d: Draft): string {
  return d.title.trim() || d.paragraphs[0]?.slice(0, 40) || 'Untitled'
}

function wasEdited(d: Draft): boolean {
  return !!d.aiOriginal && toText(d.aiOriginal).trim() !== toText(d.paragraphs).trim()
}

/** The product: a word processor with AI built in. Open it and you're
 * already in a document. Write straight into it, or use the side panel to
 * pick an idea (or have one researched for you), draft it, edit it, review
 * it, and teach the drafter what you'd change. */
export function DrafterPage() {
  const { profile } = useAuth()
  const userId = profile?.userId

  const [drafts, setDrafts] = useState<Draft[]>([])
  const [current, setCurrent] = useState<Draft | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [tab, setTab] = useState<Tab>('ideas')
  const [generating, setGenerating] = useState(false)
  const [revising, setRevising] = useState(false)
  const [humanizing, setHumanizing] = useState(false)
  const [humanizeResult, setHumanizeResult] = useState<ReviseResult | null>(null)
  const [instruction, setInstruction] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ kind: FeedbackKind; note: string }[]>([])
  const [undoStack, setUndoStack] = useState<{ title: string; body: string }[]>([])
  const [copied, setCopied] = useState(false)

  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const selection = useRef<{ start: number; end: number }>({ start: 0, end: 0 })
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const creating = useRef<Promise<Draft | null> | null>(null)
  const latest = useRef({ current, title, body })
  latest.current = { current, title, body }

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    void Promise.all([fetchDrafts(userId), fetchRecentFeedback(userId)]).then(([ds, fb]) => {
      if (cancelled) return
      setDrafts(ds)
      setFeedback(fb)
    })
    return () => {
      cancelled = true
    }
  }, [userId])

  const ensureDoc = useCallback(async (): Promise<Draft | null> => {
    if (latest.current.current) return latest.current.current
    if (!userId) return null
    if (!creating.current) {
      creating.current = createBlankDraft(userId).then((d) => {
        if (d) {
          setCurrent(d)
          latest.current.current = d
          setDrafts((prev) => [d, ...prev])
        }
        creating.current = null
        return d
      })
    }
    return creating.current
  }, [userId])

  const saveNow = useCallback(async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    const { title: t, body: b } = latest.current
    if (!latest.current.current && !t.trim() && !b.trim()) return
    setSaveStatus('saving')
    const doc = await ensureDoc()
    if (!doc) {
      setSaveStatus('error')
      return
    }
    const paragraphs = toParagraphs(b)
    const ok = await updateDraft(doc.id, t, paragraphs)
    setSaveStatus(ok ? 'saved' : 'error')
    setDrafts((prev) =>
      prev.map((d) => (d.id === doc.id ? { ...d, title: t, paragraphs, excerpt: paragraphs[0]?.slice(0, 140) ?? '' } : d)),
    )
    setCurrent((c) => (c && c.id === doc.id ? { ...c, title: t, paragraphs } : c))
  }, [ensureDoc])

  function scheduleSave() {
    setSaveStatus('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => void saveNow(), 900)
  }

  function onTitleChange(v: string) {
    setTitle(v)
    latest.current.title = v
    scheduleSave()
  }

  function onBodyChange(v: string) {
    setBody(v)
    latest.current.body = v
    scheduleSave()
  }

  function loadDraft(d: Draft | null) {
    setCurrent(d)
    latest.current.current = d
    const t = d?.title ?? ''
    const b = d ? toText(d.paragraphs) : ''
    setTitle(t)
    setBody(b)
    latest.current.title = t
    latest.current.body = b
    setUndoStack([])
    setHumanizeResult(null)
    setError(null)
    setNotice(null)
    setSaveStatus('idle')
  }

  async function openDraft(d: Draft) {
    if (current?.id === d.id) return
    await saveNow()
    loadDraft(drafts.find((x) => x.id === d.id) ?? d)
  }

  async function newDocument() {
    await saveNow()
    loadDraft(null)
    setTab('ideas')
    bodyRef.current?.focus()
  }

  async function removeDraft(d: Draft) {
    if (!window.confirm(`Delete "${draftLabel(d)}"? This can't be undone.`)) return
    await deleteDraft(d.id)
    setDrafts((prev) => prev.filter((x) => x.id !== d.id))
    if (current?.id === d.id) loadDraft(null)
  }

  async function handleDraft(topic: string, format: DraftFormat) {
    await saveNow()
    setGenerating(true)
    setError(null)
    setNotice(null)
    const result = await draftPost(topic, format)
    setGenerating(false)
    if ('error' in result) {
      setError(result.error)
      return
    }
    setDrafts((prev) => [result.draft, ...prev])
    loadDraft(result.draft)
    const { edits, feedback: notes } = result.learnedFrom
    setNotice(
      edits + notes > 0
        ? `Drafted using what I've learned from ${edits} of your edits and ${notes} notes.`
        : 'Drafted from your Voice Card. Edit it freely, I learn from every change you make.',
    )
    setTab('review')
  }

  async function applyRevision(mode: 'humanize' | 'custom', instr?: string) {
    const { title: t, body: b } = latest.current
    if (!b.trim()) return
    const sel = selection.current
    const useSelection = mode === 'custom' && sel.end > sel.start && b.slice(sel.start, sel.end).trim().length > 0
    const target = useSelection ? b.slice(sel.start, sel.end) : b
    if (mode === 'humanize') setHumanizing(true)
    else setRevising(true)
    setError(null)
    const result = await reviseText({ text: target, mode, instruction: instr, draftId: latest.current.current?.id ?? null })
    setHumanizing(false)
    setRevising(false)
    if ('error' in result) {
      setError(result.error)
      return
    }
    setUndoStack((s) => [...s, { title: t, body: b }])
    const next = useSelection ? b.slice(0, sel.start) + result.text + b.slice(sel.end) : result.text
    onBodyChange(next)
    if (mode === 'humanize') {
      setHumanizeResult(result)
      setTab('review')
    } else {
      setInstruction('')
      setFeedback((f) => [{ kind: 'note', note: `Asked me to: ${instr}` }, ...f])
    }
  }

  function undo() {
    const prev = undoStack[undoStack.length - 1]
    if (!prev) return
    setUndoStack((s) => s.slice(0, -1))
    setTitle(prev.title)
    latest.current.title = prev.title
    onBodyChange(prev.body)
  }

  async function handleFeedback(kind: FeedbackKind, note: string) {
    if (!userId) return
    await saveFeedback(userId, current?.id ?? null, kind, note)
    setFeedback((f) => [{ kind, note }, ...f])
  }

  async function copy() {
    const isNewsletter = current?.format === 'article'
    const text = isNewsletter && title.trim() ? `Subject: ${title.trim()}\n\n${body}` : body
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setError("Couldn't copy automatically. Select the text and copy it manually.")
    }
  }

  if (!profile) return null

  const words = body.trim() ? body.trim().split(/\s+/).length : 0
  const isNewsletter = current?.format === 'article'
  const overLimit = !isNewsletter && body.length > LINKEDIN_CHAR_LIMIT
  const busy = generating || revising || humanizing
  const editedCount = drafts.filter(wasEdited).length

  return (
    <div className="flex h-[calc(100vh-58px)] min-h-[560px]">
      {/* Documents */}
      <aside className="hidden w-[210px] flex-none flex-col gap-2 overflow-auto border-r border-border-soft bg-surface/50 p-3 lg:flex">
        <Button variant="primary" size="sm" className="justify-center" onClick={() => void newDocument()}>
          <Icon name="pen" className="h-[13px] w-[13px]" />
          New document
        </Button>
        <p className="mt-2 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted">Your drafts</p>
        {drafts.length === 0 && <p className="text-[12px] text-muted">Nothing yet. Start writing.</p>}
        {drafts.map((d) => (
          <div
            key={d.id}
            className={cx(
              'group flex items-start gap-1 rounded-lg border px-2.5 py-2',
              current?.id === d.id ? 'border-accent bg-accent-soft-bg' : 'border-transparent hover:border-border',
            )}
          >
            <button className="min-w-0 flex-1 text-left" onClick={() => void openDraft(d)}>
              <p className="truncate text-[12.5px] font-semibold text-ink">{draftLabel(d)}</p>
              <p className="text-[11px] text-muted">
                {d.format === 'article' ? 'Newsletter' : 'Post'}
                {d.aiOriginal ? ' · AI-drafted' : ''}
              </p>
            </button>
            <button
              aria-label={`Delete ${draftLabel(d)}`}
              onClick={() => void removeDraft(d)}
              className="hidden text-[14px] leading-none text-muted hover:text-danger-fg group-hover:block"
            >
              ×
            </button>
          </div>
        ))}
      </aside>

      {/* The page */}
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b border-border-soft bg-surface px-4 py-2">
          {QUICK_EDITS.map((q) => (
            <button
              key={q}
              disabled={busy || !body.trim()}
              onClick={() => void applyRevision('custom', q)}
              className="rounded-full border border-border bg-bg px-2.5 py-1 text-[11.5px] font-semibold text-body hover:border-accent disabled:opacity-50"
            >
              {q}
            </button>
          ))}
          <form
            className="flex min-w-[200px] flex-1 items-center gap-1.5"
            onSubmit={(e) => {
              e.preventDefault()
              if (instruction.trim()) void applyRevision('custom', instruction.trim())
            }}
          >
            <input
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Tell the AI what to change…"
              title="Applies to your selected text, or the whole draft if nothing is selected"
              className="min-w-0 flex-1 rounded-full border border-border bg-bg px-3 py-1.5 text-[12px] text-ink outline-none placeholder:text-muted focus:border-accent"
            />
            <Button type="submit" variant="soft" size="sm" disabled={busy || !instruction.trim() || !body.trim()}>
              <Icon name="spark" className="h-3 w-3" />
              {revising ? 'Editing…' : 'Edit'}
            </Button>
          </form>
          <Button variant="ghost" size="sm" onClick={undo} disabled={undoStack.length === 0 || busy}>
            Undo AI edit
          </Button>
          <Button variant="secondary" size="sm" onClick={() => void copy()} disabled={!body.trim()}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>

        <div className="flex-1 overflow-auto px-4 py-6">
          <div className="mx-auto flex w-full max-w-[720px] flex-col">
            {(error || notice) && (
              <div
                className={cx(
                  'mb-3 flex gap-2.5 rounded-lg border p-3 text-[12.5px] leading-relaxed',
                  error ? 'border-warn-border bg-warn-bg text-warn-fg' : 'border-border bg-surface text-body',
                )}
              >
                <Icon name={error ? 'alert' : 'check'} className="mt-0.5 h-4 w-4 flex-none" />
                <div>
                  <p>{error ?? notice}</p>
                  {error?.includes(THIN_VOICE_CARD_MESSAGE) && (
                    <a href="/voice-setup" className="mt-1 inline-block font-semibold underline">
                      Continue your Voice Card interview
                    </a>
                  )}
                </div>
              </div>
            )}

            <div className="relative rounded-xl border border-border bg-[#fffdf8] px-10 py-9 shadow-soft">
              {generating && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl bg-[#fffdf8]/90">
                  <Icon name="pen" className="h-6 w-6 animate-pulse text-accent-dark" />
                  <p className="text-[13.5px] text-body">Writing from your Voice Card…</p>
                </div>
              )}
              <input
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder={isNewsletter ? 'Subject line' : 'Title (optional, just for you)'}
                className="mb-4 w-full bg-transparent font-display text-[24px] font-bold tracking-tight text-ink outline-none placeholder:text-muted-2"
              />
              <textarea
                ref={bodyRef}
                value={body}
                onChange={(e) => onBodyChange(e.target.value)}
                onSelect={(e) => {
                  const t = e.currentTarget
                  selection.current = { start: t.selectionStart, end: t.selectionEnd }
                }}
                placeholder="Start writing, or pick an idea from the panel on the right…"
                className="min-h-[420px] w-full resize-none bg-transparent font-serif text-[16px] leading-[1.75] text-ink outline-none placeholder:text-muted-2"
              />
            </div>

            <div className="mt-2 flex items-center gap-3 px-1 text-[11.5px] text-muted">
              <span>{words} words</span>
              {!isNewsletter && (
                <span className={overLimit ? 'font-semibold text-danger-fg' : ''}>
                  {body.length} / {LINKEDIN_CHAR_LIMIT} characters
                </span>
              )}
              <span className="ml-auto">
                {saveStatus === 'saving' && 'Saving…'}
                {saveStatus === 'saved' && 'Saved'}
                {saveStatus === 'error' && <span className="text-danger-fg">Couldn't save. Your text is still here.</span>}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Side panel */}
      <aside className="hidden w-[340px] flex-none flex-col border-l border-border-soft bg-surface/50 md:flex">
        <div className="flex border-b border-border-soft px-2 pt-2">
          {(
            [
              ['ideas', 'Ideas'],
              ['review', 'Review'],
              ['learning', 'Learning'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cx(
                'flex-1 border-b-2 px-3 py-2 text-[12.5px] font-semibold',
                tab === key ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-auto p-4">
          {tab === 'ideas' && <IdeasPanel busy={busy} onDraft={(t, f) => void handleDraft(t, f)} />}
          {tab === 'review' && (
            <ReviewPanel
              text={body}
              ideaCheck={current?.ideaCheck ?? null}
              humanizing={humanizing}
              humanizeResult={humanizeResult}
              onHumanize={() => void applyRevision('humanize')}
            />
          )}
          {tab === 'learning' && (
            <LearningPanel draft={current} editedDraftCount={editedCount} feedback={feedback} onFeedback={handleFeedback} />
          )}
        </div>
      </aside>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/state/AuthContext'
import { draftPost, fetchDrafts, humanizeDraft, updateDraftText } from '@/data/services/draftsService'
import { runBsCheck, BS_CHECKS, CATEGORY_META, type BsCategory } from '@/lib/bsCheck'

const BS_CHECK_COUNT = BS_CHECKS.length
import { getRoastTier, roastTierLabel, roastTierPillTone } from '@/lib/roastTier'
import { pickPromptStarters } from '@/lib/promptStarters'
import { Button } from '@/components/primitives/Button'
import { Card } from '@/components/primitives/Card'
import { Pill } from '@/components/primitives/Pill'
import { Icon } from '@/components/icons/Icon'
import type { Draft } from '@/data/types'

const THIN_VOICE_CARD_MESSAGE = 'Voice Card is too thin to draft from yet'

type Step = 'idea' | 'drafting' | 'editor'

function paragraphsToText(paragraphs: string[]): string {
  return paragraphs.join('\n\n')
}

function textToParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
}

/** The whole product, as three short steps instead of one free-form page:
 * pick an idea, get a real draft, then edit it with a live BS Detector +
 * a real Humanizer. Low effort by design — no step asks for more than one
 * decision. */
export function DrafterPage() {
  const { profile } = useAuth()
  const [step, setStep] = useState<Step>('idea')
  const [idea, setIdea] = useState('')
  const [starters] = useState(() => pickPromptStarters())
  const [draftError, setDraftError] = useState<string | null>(null)
  const [humanizing, setHumanizing] = useState(false)
  const [currentDraft, setCurrentDraft] = useState<Draft | null>(null)
  const [editedText, setEditedText] = useState('')
  const [pastDrafts, setPastDrafts] = useState<Draft[]>([])

  useEffect(() => {
    if (!profile) return
    let cancelled = false
    fetchDrafts(profile.userId).then((drafts) => {
      if (!cancelled) setPastDrafts(drafts)
    })
    return () => {
      cancelled = true
    }
  }, [profile])

  const bsResult = useMemo(() => runBsCheck(editedText), [editedText])
  const liveTier = getRoastTier(bsResult.score)

  async function handleDraftIt(topic: string) {
    const trimmed = topic.trim()
    if (!trimmed) return
    setStep('drafting')
    setDraftError(null)
    const result = await draftPost(trimmed)
    if ('error' in result) {
      setDraftError(result.error)
      setStep('idea')
      return
    }
    setCurrentDraft(result.draft)
    setEditedText(paragraphsToText(result.draft.paragraphs))
    setPastDrafts((prev) => [result.draft, ...prev])
    setStep('editor')
  }

  function openPastDraft(draft: Draft) {
    setCurrentDraft(draft)
    setEditedText(paragraphsToText(draft.paragraphs))
    setStep('editor')
  }

  function handleSaveEdit() {
    if (!currentDraft) return
    void updateDraftText(currentDraft.id, textToParagraphs(editedText))
  }

  async function handleHumanize() {
    if (!currentDraft || humanizing) return
    setHumanizing(true)
    setDraftError(null)
    const result = await humanizeDraft(currentDraft.id)
    if ('error' in result) {
      setDraftError(result.error)
      setHumanizing(false)
      return
    }
    setCurrentDraft(result.draft)
    setEditedText(paragraphsToText(result.draft.paragraphs))
    setPastDrafts((prev) => prev.map((d) => (d.id === result.draft.id ? result.draft : d)))
    setHumanizing(false)
  }

  function backToIdeas() {
    setStep('idea')
    setIdea('')
    setCurrentDraft(null)
    setEditedText('')
    setDraftError(null)
  }

  if (!profile) return null

  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-6 px-6 py-8">
      <Stepper step={step} />

      {step === 'idea' && (
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
              Step 1 · Idea
            </p>
            <h1 className="text-[24px] font-bold tracking-tight">What do you want to write about?</h1>
          </div>

          <div className="flex flex-wrap gap-2">
            {starters.map((s) => (
              <button
                key={s}
                onClick={() => setIdea(s)}
                className="rounded-full border border-border bg-surface px-3 py-1.5 text-left text-[12.5px] text-body hover:border-accent"
              >
                {s}
              </button>
            ))}
          </div>

          <Card className="flex flex-col gap-3 p-5">
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="Pick a starter above, or write your own — a sentence is enough."
              rows={4}
              className="resize-none rounded-lg border border-border bg-transparent px-3 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-muted focus:border-accent focus:shadow-[0_0_0_4px_var(--tl-accent-10)]"
            />
            <Button
              variant="primary"
              className="justify-center py-3"
              onClick={() => void handleDraftIt(idea)}
              disabled={!idea.trim()}
            >
              <Icon name="pen" className="h-[14px] w-[14px]" />
              Draft it
            </Button>
            {draftError && (
              <div className="flex gap-2.5 rounded-lg border border-warn-border bg-warn-bg p-3">
                <Icon name="alert" className="h-4 w-4 flex-none text-warn-fg" />
                <div className="text-[12.5px] leading-relaxed text-warn-fg">
                  <p>{draftError}</p>
                  {draftError.includes(THIN_VOICE_CARD_MESSAGE) && (
                    <a href="/onboarding/interview" className="mt-1 inline-block font-semibold underline">
                      Continue your Voice Card interview
                    </a>
                  )}
                </div>
              </div>
            )}
          </Card>

          {pastDrafts.length > 0 && (
            <div>
              <p className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
                Your past drafts
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pastDrafts.map((draft) => {
                  const tier = getRoastTier(draft.slopScore)
                  return (
                    <button key={draft.id} onClick={() => openPastDraft(draft)} className="text-left">
                      <Card className="flex flex-col gap-2 p-4 hover:border-accent">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-[13.5px] font-semibold text-ink">{draft.title || 'Untitled draft'}</h3>
                          <Pill tone={roastTierPillTone(tier)}>{roastTierLabel(tier)}</Pill>
                        </div>
                        <p className="line-clamp-3 text-[12.5px] leading-relaxed text-muted">{draft.excerpt}</p>
                      </Card>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {step === 'drafting' && (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <Icon name="pen" className="h-6 w-6 animate-pulse text-accent-dark" />
          <p className="text-[14px] text-body">Drafting from your Voice Card…</p>
        </div>
      )}

      {step === 'editor' && currentDraft && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
              Step 3 · Edit &amp; review
            </p>
            <button onClick={backToIdeas} className="text-[12px] font-semibold text-accent-dark underline">
              ← Start a new draft
            </button>
          </div>

          <Card elevated className="flex flex-col gap-4 p-6">
            <h2 className="text-[19px] font-bold tracking-tight">{currentDraft.title}</h2>
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              onBlur={handleSaveEdit}
              rows={14}
              className="resize-y rounded-lg border border-border bg-transparent px-3.5 py-3 font-serif text-[14px] leading-relaxed text-ink outline-none focus:border-accent focus:shadow-[0_0_0_4px_var(--tl-accent-10)]"
            />
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={() => void handleHumanize()} disabled={humanizing}>
                <Icon name="spark" className="h-[14px] w-[14px]" />
                {humanizing ? 'Humanizing…' : 'Humanize this'}
              </Button>
              <a
                href="https://yourpost.sucks/"
                target="_blank"
                rel="noreferrer"
                className="text-[12px] font-semibold text-accent-dark underline"
              >
                Double-check on yourpost.sucks ↗
              </a>
              <span className="ml-auto text-[12px] text-muted">Voice match: {currentDraft.voiceMatch}%</span>
            </div>
            {draftError && <p className="text-[12px] text-danger-fg">{draftError}</p>}
          </Card>

          <Card className="flex flex-col gap-3 p-5">
            <div className="flex items-center gap-2">
              <Icon name="shield" className="h-[16px] w-[16px] text-accent-dark" />
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-accent-dark">
                BS Detector
              </p>
              {!bsResult.declined && (
                <>
                  <Pill tone={roastTierPillTone(liveTier)}>
                    {roastTierLabel(liveTier)} · {bsResult.score}/10
                  </Pill>
                  <span className="text-[11px] text-muted">
                    — {bsResult.matches.length} of {BS_CHECK_COUNT} checks fired, live as you edit
                  </span>
                </>
              )}
            </div>
            {bsResult.declined ? (
              <p className="text-[13px] text-body">
                This reads like it's about something serious — the detector skips scoring this one on purpose.
              </p>
            ) : bsResult.matches.length === 0 ? (
              <p className="text-[13px] text-body">Clean — nothing flagged in the current text.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {(Object.keys(CATEGORY_META) as BsCategory[])
                  .filter((cat) => bsResult.byCategory[cat].length > 0)
                  .map((cat) => (
                    <div key={cat} className="flex flex-col gap-1">
                      <p className="text-[12.5px] font-semibold text-ink">
                        {CATEGORY_META[cat].title} <span className="font-normal text-muted">({bsResult.byCategory[cat].length})</span>
                      </p>
                      <ul className="flex flex-col gap-0.5 pl-3">
                        {bsResult.byCategory[cat].map((c) => (
                          <li key={c.id} className="text-[12.5px] text-muted">
                            · {c.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </div>
            )}
          </Card>

          <AiTellsShortlist />
        </div>
      )}
    </div>
  )
}

function Stepper({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: 'idea', label: '1 · Idea' },
    { key: 'drafting', label: '2 · Draft' },
    { key: 'editor', label: '3 · Edit & review' },
  ]
  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => {
        const active = s.key === step || (step === 'drafting' && s.key === 'drafting')
        const done =
          (step === 'drafting' && s.key === 'idea') || (step === 'editor' && (s.key === 'idea' || s.key === 'drafting'))
        return (
          <div key={s.key} className="flex items-center gap-2">
            <span
              className={
                'rounded-full px-2.5 py-1 text-[11px] font-semibold ' +
                (active
                  ? 'bg-espresso text-cream'
                  : done
                    ? 'bg-accent-soft-bg text-accent-dark'
                    : 'bg-chip text-muted-2')
              }
            >
              {s.label}
            </span>
            {i < steps.length - 1 && <span className="text-muted-2">—</span>}
          </div>
        )
      })}
    </div>
  )
}

function AiTellsShortlist() {
  const [openCategory, setOpenCategory] = useState<BsCategory | null>(null)
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2">
        <Icon name="alert" className="h-[15px] w-[15px] text-accent-dark" />
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-accent-dark">
          What the checklist looks for
        </p>
      </div>
      <p className="text-[12.5px] text-muted">
        A fixed checklist, in code — the same {BS_CHECK_COUNT} checks every time, whether the AI drafting engine is
        up or down. Open a category to see its checks.
      </p>
      <div className="flex flex-col gap-2">
        {(Object.keys(CATEGORY_META) as BsCategory[]).map((cat) => {
          const checks = BS_CHECKS.filter((c) => c.category === cat)
          const isOpen = openCategory === cat
          return (
            <div key={cat} className="rounded-lg border border-border-soft">
              <button
                onClick={() => setOpenCategory(isOpen ? null : cat)}
                className="flex w-full items-center justify-between px-3 py-2 text-left"
              >
                <span className="text-[13px] font-semibold text-ink">
                  {CATEGORY_META[cat].title} <span className="font-normal text-muted">· {checks.length} checks</span>
                </span>
                <Icon
                  name="chev"
                  className={'h-3.5 w-3.5 text-muted transition-transform ' + (isOpen ? '-rotate-90' : 'rotate-90')}
                />
              </button>
              {isOpen && (
                <div className="flex flex-col gap-1.5 border-t border-border-soft px-3 py-2.5">
                  <p className="text-[12px] italic text-muted">{CATEGORY_META[cat].question}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {checks.map((c) => (
                      <Pill key={c.id}>{c.label}</Pill>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

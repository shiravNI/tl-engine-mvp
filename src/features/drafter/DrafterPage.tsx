import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/state/AuthContext'
import { draftPost, fetchDrafts, humanizeDraft } from '@/data/services/draftsService'
import { getRoastTier, roastTierLabel, roastTierPillTone } from '@/lib/roastTier'
import { AI_TELLS } from '@/lib/aiTells'
import { Button } from '@/components/primitives/Button'
import { Card } from '@/components/primitives/Card'
import { Pill } from '@/components/primitives/Pill'
import { Icon } from '@/components/icons/Icon'
import type { Draft } from '@/data/types'

const THIN_VOICE_CARD_MESSAGE = 'Voice Card is too thin to draft from yet'

/** The whole product: a topic in, a draft out, then a real review pass —
 * BS Detector + Humanizer + a visible AI-tells shortlist. No stage
 * pipeline, no scheduling, no publishing — draft, review, done; the user
 * copies the final text out themselves. */
export function DrafterPage() {
  const { profile } = useAuth()
  const [topic, setTopic] = useState('')
  const [drafting, setDrafting] = useState(false)
  const [humanizing, setHumanizing] = useState(false)
  const [currentDraft, setCurrentDraft] = useState<Draft | null>(null)
  const [draftError, setDraftError] = useState<string | null>(null)
  const [pastDrafts, setPastDrafts] = useState<Draft[]>([])
  const [loadingPastDrafts, setLoadingPastDrafts] = useState(true)

  useEffect(() => {
    if (!profile) return
    let cancelled = false
    fetchDrafts(profile.userId).then((drafts) => {
      if (cancelled) return
      setPastDrafts(drafts)
      setLoadingPastDrafts(false)
    })
    return () => {
      cancelled = true
    }
  }, [profile])

  async function handleDraftIt() {
    const trimmed = topic.trim()
    if (!trimmed || drafting) return
    setDrafting(true)
    setDraftError(null)
    try {
      const result = await draftPost(trimmed)
      if ('error' in result) {
        setDraftError(result.error)
        return
      }
      setCurrentDraft(result.draft)
      setPastDrafts((prev) => [result.draft, ...prev])
      setTopic('')
    } finally {
      setDrafting(false)
    }
  }

  async function handleHumanize() {
    if (!currentDraft || humanizing) return
    setHumanizing(true)
    setDraftError(null)
    try {
      const result = await humanizeDraft(currentDraft.id)
      if ('error' in result) {
        setDraftError(result.error)
        return
      }
      setCurrentDraft(result.draft)
      setPastDrafts((prev) => prev.map((d) => (d.id === result.draft.id ? result.draft : d)))
    } finally {
      setHumanizing(false)
    }
  }

  if (!profile) return null

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-6 px-6 py-8">
      <div>
        <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted">Drafter</p>
        <h1 className="text-[24px] font-bold tracking-tight">What do you want to write about?</h1>
      </div>

      <Card className="flex flex-col gap-3 p-5">
        <div className="flex gap-2.5">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleDraftIt()
            }}
            placeholder="e.g. Why most attribution models lie to marketers"
            className="h-[42px] flex-1 rounded-lg border border-border bg-transparent px-3 text-[13px] text-ink outline-none placeholder:text-muted focus:border-accent focus:shadow-[0_0_0_4px_var(--tl-accent-10)]"
          />
          <Button variant="primary" onClick={() => void handleDraftIt()} disabled={drafting || !topic.trim()}>
            <Icon name="pen" className="h-[14px] w-[14px]" />
            {drafting ? 'Drafting…' : 'Draft it'}
          </Button>
        </div>

        {draftError && (
          <div className="flex gap-2.5 rounded-lg border border-warn-border bg-warn-bg p-3">
            <Icon name="alert" className="h-4 w-4 flex-none text-warn-fg" />
            <div className="text-[12.5px] leading-relaxed text-warn-fg">
              <p>{draftError}</p>
              {draftError.includes(THIN_VOICE_CARD_MESSAGE) && (
                <Link to="/onboarding/interview" className="mt-1 inline-block font-semibold underline">
                  Continue your Voice Card interview
                </Link>
              )}
            </div>
          </div>
        )}
      </Card>

      {currentDraft && (
        <Card elevated className="flex flex-col gap-5 p-6">
          <div>
            <h2 className="text-[19px] font-bold tracking-tight">{currentDraft.title}</h2>
            <div className="mt-3 flex flex-col gap-3">
              {currentDraft.paragraphs.map((paragraph, i) => (
                <p key={i} className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-body">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          <div className="h-px bg-border-soft" />

          <BsDetector draft={currentDraft} />

          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => void handleHumanize()} disabled={humanizing}>
              <Icon name="spark" className="h-[14px] w-[14px]" />
              {humanizing ? 'Humanizing…' : 'Humanize this'}
            </Button>
            <span className="text-[12px] text-muted">Voice match: {currentDraft.voiceMatch}%</span>
          </div>
        </Card>
      )}

      <AiTellsShortlist />

      <div>
        <p className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
          Your past drafts
        </p>
        {loadingPastDrafts ? (
          <p className="text-[13px] text-muted">Loading…</p>
        ) : pastDrafts.length === 0 ? (
          <p className="text-[13px] text-muted">Nothing drafted yet — give it a topic above.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pastDrafts.map((draft) => {
              const tier = getRoastTier(draft.slopScore)
              return (
                <Card key={draft.id} className="flex flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-[13.5px] font-semibold text-ink">{draft.title || 'Untitled draft'}</h3>
                    <Pill tone={roastTierPillTone(tier)}>{roastTierLabel(tier)}</Pill>
                  </div>
                  <p className="line-clamp-3 text-[12.5px] leading-relaxed text-muted">{draft.excerpt}</p>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function BsDetector({ draft }: { draft: Draft }) {
  const tier = getRoastTier(draft.slopScore)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Icon name="shield" className="h-[16px] w-[16px] text-accent-dark" />
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-accent-dark">
          BS Detector
        </p>
        <Pill tone={roastTierPillTone(tier)}>{roastTierLabel(tier)}</Pill>
      </div>
      <p className="text-[13px] leading-relaxed text-body">{draft.roastVerdict}</p>
      {draft.roastFlags.length > 0 && (
        <div className="flex flex-col gap-2">
          {draft.roastFlags.map((flag, i) => (
            <Card key={i} className="bg-cream px-3 py-2.5">
              {flag.quote && <p className="text-[12.5px] italic text-body">"{flag.quote}"</p>}
              <p className="mt-0.5 text-[12.5px] text-muted">{flag.comment}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function AiTellsShortlist() {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2">
        <Icon name="alert" className="h-[15px] w-[15px] text-accent-dark" />
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-accent-dark">
          AI tells to avoid
        </p>
      </div>
      <p className="text-[12.5px] text-muted">
        The exact patterns the BS Detector checks for — the same list, every time.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {AI_TELLS.map((tell) => (
          <Pill key={tell.label}>{tell.label}</Pill>
        ))}
      </div>
    </Card>
  )
}

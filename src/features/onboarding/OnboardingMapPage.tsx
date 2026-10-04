import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ONBOARDING_PHASES } from '@/data/onboardingCatalog'
import { upsertOnboardingState } from '@/data/services/onboardingService'
import { fetchChatTranscript } from '@/data/services/interviewChatService'
import { useAuth } from '@/state/AuthContext'
import { Icon } from '@/components/icons/Icon'
import { Button } from '@/components/primitives/Button'
import { Pill } from '@/components/primitives/Pill'
import { VoiceCardUploadDialog } from '@/features/onboarding/VoiceCardUploadDialog'
import { cx } from '@/lib/cx'

/** Interview map: the 7 phases, set expectations before starting — plus a
 * second entry point for someone who already has a Voice Card written up
 * (e.g. from the `linkedin-voice-setup` skill) and wants to upload it
 * instead of re-answering everything from scratch. */
export function OnboardingMapPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [hasProgress, setHasProgress] = useState(false)

  useEffect(() => {
    if (!profile) return
    let cancelled = false
    fetchChatTranscript(profile.userId).then((saved) => {
      if (!cancelled) setHasProgress(!!saved && saved.some((t) => t.role === 'user'))
    })
    return () => {
      cancelled = true
    }
  }, [profile])

  async function handleSkip() {
    if (profile) {
      await upsertOnboardingState(profile.userId, { skipped: true })
    }
    navigate('/')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-[58px] flex-none items-center gap-2.5 border-b border-border bg-surface px-5">
        <div className="flex h-[26px] w-[26px] items-center justify-center rounded-[9px] bg-espresso font-mono text-[11px] font-medium text-cream">
          TL
        </div>
        <span className="text-[13px] font-semibold">TL Engine</span>
        <Pill>First-time setup</Pill>
      </header>

      <div className="mx-auto flex w-full max-w-[820px] flex-col gap-6 px-6 py-10">
        <div>
          <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted">Before we start</p>
          <h1 className="text-[26px] font-bold tracking-tight">This is a real interview, not a form.</h1>
          <p className="mt-2 max-w-[560px] text-[13px] leading-relaxed text-body">
            About 40 minutes, one question at a time. Everything you say builds the Voice Card that every
            draft gets measured against — worth doing properly, once. Already have a Voice Card written up?
            Upload it instead and we'll only ask what's still missing.
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          {ONBOARDING_PHASES.map((phase) => (
            <div
              key={phase.id}
              className={cx(
                'flex items-center gap-3.5 rounded-xl border px-4 py-3',
                'border-border bg-surface',
              )}
            >
              <div
                className={cx(
                  'flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full text-[12px] font-bold',
                  'bg-chip text-muted-2',
                )}
              >
                {phase.index}
              </div>
              <div className="flex-1">
                <span className="text-[13px] font-semibold text-ink">{phase.title}</span>
                <p className="mt-0.5 text-[12px] text-muted">{phase.description}</p>
              </div>
              <span className="text-[12px] text-muted">{phase.estimate}</span>
            </div>
          ))}
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-3">
          <Button variant="primary" className="px-4 py-3" onClick={() => navigate('/onboarding/interview')}>
            {hasProgress ? 'Continue the interview' : 'Start the interview'}
          </Button>
          <Button variant="secondary" onClick={() => setUploadOpen(true)}>
            <Icon name="upload" className="h-[14px] w-[14px]" />
            Upload an existing Voice Card
          </Button>
          <Button variant="ghost" onClick={() => void handleSkip()}>
            Skip to a quick version — I'll fill in Core later
          </Button>
        </div>
      </div>

      <VoiceCardUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  )
}

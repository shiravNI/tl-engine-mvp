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

/** The welcome in front of the voice interview: the 7 phases, set
 * expectations, plus a second entry point for someone who already has a
 * Voice Card (e.g. from the `linkedin-voice-setup` skill) and wants to
 * upload it instead. Shown inside the app shell, not as its own page. */
export function OnboardingMapPage({ onStart }: { onStart: () => void }) {
  const navigate = useNavigate()
  const { profile, refreshOnboardingState } = useAuth()
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
      await refreshOnboardingState()
    }
    navigate('/')
  }

  return (
    <div className="flex flex-col">
      <div className="mx-auto flex w-full max-w-[820px] flex-col gap-6 px-6 py-10">
        <div>
          <div className="mb-2"><Pill>Step 1 · Voice setup</Pill></div>
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
          <Button variant="primary" className="px-4 py-3" onClick={onStart}>
            {hasProgress ? 'Continue the interview' : 'Start the interview'}
          </Button>
          <Button variant="secondary" onClick={() => setUploadOpen(true)}>
            <Icon name="upload" className="h-[14px] w-[14px]" />
            Upload an existing Voice Card
          </Button>
          <Button variant="ghost" onClick={() => void handleSkip()}>
            Skip for now, I'll set up my voice later
          </Button>
        </div>
      </div>

      <VoiceCardUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  )
}

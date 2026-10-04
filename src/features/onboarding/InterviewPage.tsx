import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ONBOARDING_PHASES,
  getInterviewQuestions,
  questionNumberLabel,
  IDENTITY_QUESTION_ID,
  type OnboardingQuestion,
} from '@/data/onboardingCatalog'
import {
  fetchInterviewAnswers,
  fetchOnboardingState,
  upsertInterviewAnswer,
  upsertOnboardingState,
  upsertVoiceCard,
} from '@/data/services/onboardingService'
import { deriveVoiceCard, readContentOrientation, type InterviewAnswerInput } from '@/lib/voiceCard'
import { buildInterviewTranscript } from '@/lib/interviewTranscript'
import { synthesizeVoiceCard } from '@/data/services/voiceCardSynthesisService'
import { generateInterviewQuestions } from '@/data/services/generateInterviewQuestionsService'
import { useAuth } from '@/state/AuthContext'
import { Icon } from '@/components/icons/Icon'
import { Button } from '@/components/primitives/Button'
import { Card } from '@/components/primitives/Card'
import { Pill } from '@/components/primitives/Pill'
import { ProgressBar } from '@/components/primitives/ProgressBar'
import { Avatar } from '@/components/primitives/Avatar'
import { cx } from '@/lib/cx'

/** Deep voice interview, phased with a tappable SAT-round and a live
 * Voice Card built alongside it. Both the phase progress bar and the
 * questions themselves come from the one shared `onboardingCatalog`.
 * Every answer — selected option and free text — is saved to
 * `interview_answers`, and the Voice Card is a live, deterministic
 * derivation from those saved answers (see `src/lib/voiceCard.ts`),
 * upserted on every "Continue". */
export function InterviewPage({ demo = false }: { demo?: boolean } = {}) {
  const navigate = useNavigate()
  const { profile, refreshOnboardingState } = useAuth()
  const userId = profile?.userId

  const [loaded, setLoaded] = useState(false)
  const [answers, setAnswers] = useState<Map<string, InterviewAnswerInput>>(new Map())
  const [exchangeIndex, setExchangeIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [freeText, setFreeText] = useState('')
  const [saving, setSaving] = useState(false)
  const [synthesizing, setSynthesizing] = useState(false)
  const [dynamicOpinionQuestions, setDynamicOpinionQuestions] = useState<OnboardingQuestion[] | null>(null)
  const [generatingQuestions, setGeneratingQuestions] = useState(false)
  const generationAttempted = useRef(false)
  const [demoComplete, setDemoComplete] = useState(false)

  // Which Opinions & POV question set is active depends on the *persisted*
  // answer to the orientation fork (`q_orientation`) — not the in-progress
  // live selection, so the active list only ever changes once that
  // question's own "Continue" has actually saved it.
  const persistedOrientation = useMemo(() => readContentOrientation(Array.from(answers.values())), [answers])
  const questions = useMemo(
    () => getInterviewQuestions(persistedOrientation, dynamicOpinionQuestions ?? undefined),
    [persistedOrientation, dynamicOpinionQuestions],
  )
  const question = questions[exchangeIndex]
  const isLast = exchangeIndex === questions.length - 1

  useEffect(() => {
    // Demo mode never reads saved answers — it always starts from a blank
    // slate, so nothing from a real interview leaks into the test run.
    if (demo) {
      setLoaded(true)
      return
    }
    if (!userId) return
    let cancelled = false
    Promise.all([fetchInterviewAnswers(userId), fetchOnboardingState(userId)]).then(([existing, state]) => {
      if (cancelled) return
      const map = new Map(existing.map((a) => [a.questionId, a] as const))
      const persistedDynamic = state?.generatedOpinionQuestions ?? null
      if (persistedDynamic && persistedDynamic.length > 0) {
        setDynamicOpinionQuestions(persistedDynamic)
        generationAttempted.current = true
      }
      const activeQuestions = getInterviewQuestions(readContentOrientation(existing), persistedDynamic ?? undefined)
      const firstUnanswered = activeQuestions.findIndex((q) => {
        const a = map.get(q.id)
        return !a || (!a.selectedOptionId && !a.freeTextAnswer?.trim())
      })
      setAnswers(map)
      setExchangeIndex(firstUnanswered === -1 ? activeQuestions.length - 1 : firstUnanswered)
      setLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [userId, demo])

  useEffect(() => {
    if (!loaded) return
    const existing = answers.get(question.id)
    setSelectedOption(existing?.selectedOptionId ?? question.options.find((o) => o.primary)?.id ?? null)
    setFreeText(existing?.freeTextAnswer ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exchangeIndex, loaded])

  // Live preview: the currently-in-progress answer merged over whatever's
  // already saved, so the Voice Card panel updates as you tap/type — not
  // only after "Continue" persists it.
  const livePreviewAnswers = useMemo<InterviewAnswerInput[]>(() => {
    const merged = new Map(answers)
    merged.set(question.id, {
      questionId: question.id,
      selectedOptionId: selectedOption,
      freeTextAnswer: freeText,
    })
    return Array.from(merged.values())
  }, [answers, question.id, selectedOption, freeText])

  const derivedCard = useMemo(
    () => deriveVoiceCard(livePreviewAnswers, questions),
    [livePreviewAnswers, questions],
  )

  const isTextQuestion = question.type === 'text'

  // "Say more" is encouraged, not gated on a `choice` question — forcing
  // elaboration on every single tap (including throwaway ones like the
  // orientation fork) was real, reported friction. A `text` question has
  // no tap to fall back on, so its own answer is what's required.
  const canContinue = isTextQuestion ? freeText.trim().length > 0 : Boolean(selectedOption)

  const currentPhaseTitle = ONBOARDING_PHASES.find((p) => p.id === question.phaseId)?.title ?? ''

  // Real per-phase progress instead of a hardcoded bar — phases 5-7 have no
  // interactive questions yet in this build, so they honestly read as 0%
  // rather than pretending to be partially done.
  const phaseFillPct = useMemo(() => {
    const map = new Map<string, number>()
    for (const phase of ONBOARDING_PHASES) {
      const phaseQuestions = questions.filter((q) => q.phaseId === phase.id)
      if (phaseQuestions.length === 0) {
        map.set(phase.id, 0)
        continue
      }
      const answeredCount = phaseQuestions.filter((q) => {
        const a = answers.get(q.id)
        return Boolean(a && (a.selectedOptionId || a.freeTextAnswer?.trim()))
      }).length
      map.set(phase.id, Math.round((answeredCount / phaseQuestions.length) * 100))
    }
    return map
  }, [questions, answers])

  async function persistCurrentAnswer(): Promise<Map<string, InterviewAnswerInput>> {
    if (!userId && !demo) return answers
    const answer: InterviewAnswerInput = {
      questionId: question.id,
      selectedOptionId: selectedOption,
      freeTextAnswer: freeText.trim() ? freeText.trim() : null,
    }
    const nextAnswers = new Map(answers)
    nextAnswers.set(question.id, answer)
    if (demo || !userId) {
      setAnswers(nextAnswers)
      return nextAnswers
    }
    await upsertInterviewAnswer(userId, answer)
    setAnswers(nextAnswers)

    const nextAnswerList = Array.from(nextAnswers.values())
    const card = deriveVoiceCard(
      nextAnswerList,
      getInterviewQuestions(readContentOrientation(nextAnswerList), dynamicOpinionQuestions ?? undefined),
    )
    await upsertVoiceCard(userId, {
      roleLabel: profile?.title ?? '',
      povFingerprint: card.povFingerprint,
      completenessPct: card.completenessPct,
      completenessNote: card.completenessNote,
      opinions: card.opinions,
      contentOrientation: card.contentOrientation,
    })
    return nextAnswers
  }

  async function handleContinue() {
    if ((!userId && !demo) || saving) return
    setSaving(true)
    try {
      const finalAnswers = await persistCurrentAnswer()
      if (isLast && demo) {
        setDemoComplete(true)
        return
      }
      if (isLast && userId) {
        // Real Phase-3 synthesis — the thin, deterministic card from
        // `persistCurrentAnswer` above already saved as a fallback, so a
        // failure here (most likely: the API key isn't configured yet)
        // still leaves the account with a usable, if thinner, Voice Card.
        setSynthesizing(true)
        const transcript = buildInterviewTranscript(finalAnswers, questions)
        const result = await synthesizeVoiceCard(transcript)
        if ('error' in result) console.error('[InterviewPage] synthesis failed:', result.error)
        setSynthesizing(false)

        await upsertOnboardingState(userId, { completedAt: new Date().toISOString() })
        await refreshOnboardingState()
        navigate('/')
        return
      }
      // Right before entering the SAT round for the first time, try to
      // personalize it for real (linkedin-voice-setup's "CRITICAL:
      // generate all questions dynamically" instruction) — this is the
      // one moment we know both the identity answer and the orientation,
      // and it's still ahead of the Voice question, so there's no
      // visible wait if it resolves quickly.
      const nextQuestion = questions[exchangeIndex + 1]
      const enteringOpinionsPhase = nextQuestion?.phaseId === 'opinions' && question.phaseId !== 'opinions'
      if (enteringOpinionsPhase && !generationAttempted.current) {
        generationAttempted.current = true
        setGeneratingQuestions(true)
        const identityAnswer = finalAnswers.get(IDENTITY_QUESTION_ID)?.freeTextAnswer?.trim() || ''
        const goalAnswer = finalAnswers.get(question.id)?.freeTextAnswer?.trim() || ''
        if (identityAnswer && persistedOrientation) {
          const result = await generateInterviewQuestions(identityAnswer, goalAnswer, persistedOrientation)
          if ('questions' in result && result.questions.length > 0) {
            setDynamicOpinionQuestions(result.questions)
            if (!demo && userId) await upsertOnboardingState(userId, { generatedOpinionQuestions: result.questions })
          } else if ('error' in result) {
            console.error('[InterviewPage] question generation failed, using generic set:', result.error)
          }
        }
        setGeneratingQuestions(false)
      }
      setExchangeIndex((i) => i + 1)
    } finally {
      setSaving(false)
    }
  }

  async function handleFinishLater() {
    if (demo) {
      navigate('/')
      return
    }
    if (userId) {
      await persistCurrentAnswer()
      await upsertOnboardingState(userId, { skipped: true })
      await refreshOnboardingState()
    }
    navigate('/')
  }

  if (!loaded) {
    return <div className="p-8 text-[13px] text-muted">Loading your interview…</div>
  }

  if (demoComplete) {
    const transcript = buildInterviewTranscript(answers, questions)
    return (
      <div className="mx-auto flex max-w-[760px] flex-col gap-4 px-6 py-10">
        <Pill>Demo complete — nothing was saved</Pill>
        <h1 className="text-[24px] font-bold tracking-tight">That's the whole interview.</h1>
        <p className="text-[13px] text-body">
          {transcript.length} answers. In a real run, these would now be written up into your full Voice Card.
        </p>
        <Card className="flex flex-col gap-2 p-5">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted">Live preview card</p>
          <p className="text-[13px] text-body">{derivedCard.povFingerprint}</p>
        </Card>
        <Card className="flex flex-col gap-3 p-5">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted">Everything you said</p>
          {transcript.map((e, i) => (
            <div key={i}>
              <p className="text-[12px] font-semibold text-ink">{e.prompt}</p>
              <p className="text-[13px] text-body">{e.answer}</p>
            </div>
          ))}
        </Card>
        <div className="flex gap-2.5">
          <Button variant="primary" onClick={() => window.location.reload()}>
            Run it again
          </Button>
          <Button variant="secondary" onClick={() => navigate('/')}>
            Exit
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-[58px] flex-none items-center gap-2.5 border-b border-border bg-surface px-5">
        <div className="flex h-[26px] w-[26px] items-center justify-center rounded-[9px] bg-espresso font-mono text-[11px] font-medium text-cream">
          TL
        </div>
        <span className="text-[13px] font-semibold">TL Engine</span>
        <Pill>{demo ? 'Demo — nothing is saved' : 'First-time setup'}</Pill>
        <div className="flex-1" />
        <span className="text-[12px] text-muted">
          {demo ? 'Test run · answers stay in this tab only' : '~40 min · autosaves as you go'}
        </span>
        <Button variant="ghost" onClick={() => void handleFinishLater()}>
          {demo ? 'Exit demo' : 'Finish later'}
        </Button>
      </header>

      <div className="flex-none border-b border-border bg-surface px-10 pt-5">
        <div className="mb-2 flex max-w-[980px] items-center gap-1.5">
          {ONBOARDING_PHASES.map((phase) => (
            <div key={phase.id} className="h-[5px] flex-1 overflow-hidden rounded-full bg-skeleton">
              <div className="h-full bg-accent" style={{ width: `${phaseFillPct.get(phase.id) ?? 0}%` }} />
            </div>
          ))}
        </div>
        <div className="flex max-w-[980px] justify-between pb-3">
          {ONBOARDING_PHASES.map((phase) => {
            const isCurrent = phase.id === question.phaseId
            const isDone = (phaseFillPct.get(phase.id) ?? 0) >= 100
            return (
              <span
                key={phase.id}
                className={cx(
                  'text-[12px]',
                  isCurrent ? 'font-bold text-ink' : isDone ? 'font-semibold text-accent-dark' : 'text-muted',
                )}
              >
                {phase.title.length > 18 ? phase.id : phase.title}
              </span>
            )
          })}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex max-w-[700px] flex-1 flex-col gap-5 overflow-auto px-10 py-7">
          <div>
            <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
              {currentPhaseTitle} · question {questionNumberLabel(exchangeIndex, questions.length)}
            </p>
            <h1 className="text-[25px] font-bold tracking-tight">
              {isTextQuestion ? 'In your own words — no wrong answer.' : 'No overthinking — first gut reaction.'}
            </h1>
            <p className="mt-1.5 text-[13px] text-body">
              {isTextQuestion ? 'This is where the real material comes from.' : 'Tap one. You can always add nuance right after.'}
            </p>
          </div>

          <div className="flex max-w-[600px] flex-col gap-3.5">
            <div className="flex items-start gap-2.5">
              <Avatar initials="TL" size={26} />
              <Card className="rounded-tl-[4px] px-3.5 py-2.5">
                <p className="text-[13px] text-body">{question.prompt}</p>
              </Card>
            </div>

            {!isTextQuestion && (
              <div className="grid grid-cols-2 gap-2.5 pl-9">
                {question.options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedOption(opt.id)}
                    className={cx(
                      'rounded-lg border px-3 py-3 text-left text-[12.5px] font-semibold leading-tight transition-colors',
                      selectedOption === opt.id
                        ? 'border-accent bg-accent text-cream'
                        : 'border-border bg-surface text-ink hover:bg-bg',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {question.followUpPrompt && !isTextQuestion && (
              <div className="mt-1.5 flex items-start gap-2.5">
                <Avatar initials="TL" size={26} />
                <Card className="rounded-tl-[4px] px-3.5 py-2.5">
                  <p className="text-[13px] text-body">{question.followUpPrompt}</p>
                </Card>
              </div>
            )}

            <div className="pl-9">
              {!isTextQuestion && (
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
                    Optional — but the real substance comes from this, not the tap
                  </span>
                </div>
              )}
              <textarea
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder="Say more, in your own words…"
                rows={isTextQuestion ? 6 : 3}
                className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-[13px] text-ink outline-none placeholder:text-muted focus:border-accent focus:shadow-[0_0_0_4px_var(--tl-accent-10)]"
              />
            </div>
          </div>

          <div className="mt-auto flex items-center gap-3 pt-2.5">
            <Button
              variant="secondary"
              disabled={exchangeIndex === 0 || saving}
              onClick={() => setExchangeIndex((i) => Math.max(0, i - 1))}
            >
              Back
            </Button>
            <Button variant="primary" onClick={() => void handleContinue()} disabled={saving || !canContinue}>
              {synthesizing
                ? 'Writing your Voice Card…'
                : generatingQuestions
                  ? 'Personalizing your questions…'
                  : saving
                    ? 'Saving…'
                    : isLast
                      ? 'Finish'
                      : 'Continue'}
              <Icon name="chev" className="h-[15px] w-[15px]" />
            </Button>
            <span className="text-[12px] text-muted">
              {questionNumberLabel(exchangeIndex, questions.length)} — we keep going until your POV is
              genuinely clear, not until a counter hits zero.
            </span>
          </div>
        </div>

        <div className="w-px bg-border-soft" />

        <div className="w-[400px] flex-none overflow-auto p-6">
          <Card className="flex flex-col gap-4 p-5">
            <div className="flex items-center gap-2">
              <Icon name="core" className="h-[18px] w-[18px] text-accent-dark" />
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-accent-dark">
                Building live · Voice Card
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Avatar initials={profile?.initials ?? ''} size={44} />
              <div>
                <div className="text-[14px] font-bold">{profile?.name ?? ''}</div>
                <p className="text-[12px] text-muted">{profile?.title || 'Building your Voice Card'}</p>
              </div>
            </div>
            <div className="h-px bg-border-soft" />
            <div>
              <p className="mb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
                POV fingerprint <span className="font-normal normal-case tracking-normal">(forming)</span>
              </p>
              <p className="text-[13px] leading-relaxed text-body">{derivedCard.povFingerprint}</p>
            </div>
            <div>
              <p className="mb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
                Quotable opinions so far
              </p>
              <div className="flex flex-col gap-2">
                {derivedCard.opinions.map((op) => (
                  <Card
                    key={op.id}
                    className={cx('bg-cream px-2.5 py-2', op.placeholder && 'border-dashed opacity-50')}
                  >
                    <p className={cx('text-[13px] text-body', !op.placeholder && 'italic')}>{op.quote}</p>
                  </Card>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
                Card completeness
              </p>
              <ProgressBar value={derivedCard.completenessPct} />
              <p className="mt-1.5 text-[12px] text-muted">{derivedCard.completenessNote}</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

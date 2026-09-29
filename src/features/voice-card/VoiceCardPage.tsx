import { useEffect, useState } from 'react'
import { useAuth } from '@/state/AuthContext'
import { fetchSynthesizedVoiceCard } from '@/data/services/voiceCardSynthesisService'
import { Card } from '@/components/primitives/Card'
import { Pill } from '@/components/primitives/Pill'
import type { SynthesizedVoiceCard } from '@/data/types'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-2 p-5">
      <p className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-accent-dark">{title}</p>
      {children}
    </Card>
  )
}

/** Read view of the real, AI-synthesized Voice Card (Phase 3 of the
 * source skill) — the actual document, not the thin live-preview shown
 * during the interview itself. */
export function VoiceCardPage() {
  const { profile } = useAuth()
  const [card, setCard] = useState<SynthesizedVoiceCard | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    let cancelled = false
    fetchSynthesizedVoiceCard(profile.userId).then((c) => {
      if (!cancelled) {
        setCard(c)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [profile])

  if (loading) return <div className="p-8 text-[13px] text-muted">Loading your Voice Card…</div>

  if (!card) {
    return (
      <div className="mx-auto max-w-[700px] px-6 py-10">
        <Card className="p-6 text-center">
          <p className="text-[14px] text-body">
            Your Voice Card hasn't been synthesized yet — this needs a real AI pass, which needs the
            drafting engine's API key to be configured. You're still using the lighter, deterministic
            version in the meantime.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-4 px-6 py-8">
      <div>
        <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted">Voice Card</p>
        <h1 className="text-[24px] font-bold tracking-tight">{profile?.name}</h1>
      </div>

      <Section title="Positioning statement">
        <p className="text-[14px] leading-relaxed text-body">{card.positioningStatement}</p>
      </Section>

      <Section title="Identity">
        <p className="text-[13px] text-body">
          <b>Role:</b> {card.identity.roleCompany} · <b>Industry:</b> {card.identity.industry}
        </p>
        <p className="text-[13px] text-body">{card.identity.coreExpertise}</p>
        <p className="text-[13px] text-body">
          <b>Goal:</b> {card.identity.linkedinGoal}
        </p>
      </Section>

      <Section title="Persona archetype">
        <p className="text-[13px] text-body">
          <b>Primary — {card.persona.primary.name}:</b> {card.persona.primary.description}
        </p>
        <p className="text-[13px] text-body">
          <b>Secondary — {card.persona.secondary.name}:</b> {card.persona.secondary.description}
        </p>
      </Section>

      <Section title="Voice & tone">
        <div className="flex flex-wrap gap-1.5">
          {card.voiceTone.adjectives.map((a) => (
            <Pill key={a}>{a}</Pill>
          ))}
        </div>
        <p className="text-[13px] text-body">{card.voiceTone.communicationStyle}</p>
        <p className="text-[13px] italic text-muted">{card.voiceTone.corePrinciple}</p>
        <div>
          <p className="text-[12px] font-semibold text-ink">What to avoid</p>
          <ul className="list-disc pl-5 text-[13px] text-body">
            {card.voiceTone.whatToAvoid.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[12px] font-semibold text-ink">Signature patterns</p>
          <ul className="list-disc pl-5 text-[13px] text-body">
            {card.voiceTone.signaturePatterns.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </Section>

      <Section title="Content pillars">
        <div className="flex flex-col gap-3">
          {card.contentPillars.map((p) => (
            <div key={p.title}>
              <p className="text-[13.5px] font-semibold text-ink">{p.title}</p>
              <p className="text-[13px] text-body">{p.description}</p>
              <p className="text-[13px] italic text-muted">"{p.quote}"</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Opinions & POV">
        <ul className="flex flex-col gap-1.5">
          {card.opinions.map((o) => (
            <li key={o} className="text-[13px] italic text-body">
              "{o}"
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Signature quotes">
        <div className="flex flex-wrap gap-1.5">
          {card.signatureQuotes.map((q) => (
            <Pill key={q}>{q}</Pill>
          ))}
        </div>
      </Section>

      {card.trustedSources.length > 0 && (
        <Section title="Trusted sources">
          <ul className="list-disc pl-5 text-[13px] text-body">
            {card.trustedSources.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Audience">
        <p className="text-[13px] text-body">
          <b>Primary:</b> {card.audience.primary}
        </p>
        <p className="text-[13px] text-body">
          <b>Secondary:</b> {card.audience.secondary}
        </p>
      </Section>
    </div>
  )
}

import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/state/AuthContext'
import { fetchSynthesizedVoiceCard, type StoredVoiceCard } from '@/data/services/voiceCardSynthesisService'
import { formatCardDate, voiceCardToMarkdown } from '@/lib/voiceCardMarkdown'
import { Button } from '@/components/primitives/Button'
import { Card } from '@/components/primitives/Card'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5 border-t border-border-soft pt-6">
      <h2 className="font-display text-[17px] font-bold tracking-tight text-ink">{title}</h2>
      {children}
    </section>
  )
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[14px] leading-relaxed text-body marker:text-accent">
      {items.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  )
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <li>
      <b className="text-ink">{label}:</b> {value}
    </li>
  )
}

/** The person's Core: their finished Voice Card, as a document. Written
 * once at the end of the interview and saved to their account; the
 * drafter reads from it every time. */
export function VoiceCardPage() {
  const { profile } = useAuth()
  const [stored, setStored] = useState<StoredVoiceCard | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    let cancelled = false
    void fetchSynthesizedVoiceCard(profile.userId).then((c) => {
      if (!cancelled) {
        setStored(c)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [profile])

  if (loading) return <div className="p-8 text-[13px] text-muted">Loading your Voice Card…</div>

  if (!stored) {
    return (
      <div className="mx-auto max-w-[620px] px-6 py-12">
        <Card className="flex flex-col items-center gap-3 p-8 text-center">
          <h1 className="font-display text-[20px] font-bold text-ink">Your Voice Card isn't written yet</h1>
          <p className="text-[13.5px] leading-relaxed text-body">
            It's written from your interview and then lives here, in your profile. Everything the drafter writes is
            measured against it.
          </p>
          <Link to="/onboarding/interview">
            <Button variant="primary">Start or continue the interview</Button>
          </Link>
        </Card>
      </div>
    )
  }

  const { card, updatedAt } = stored
  const name = profile?.name ?? ''
  const date = formatCardDate(updatedAt)

  function download() {
    const blob = new Blob([voiceCardToMarkdown(card, name, updatedAt)], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'voice-card.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  const f = card.formatPreferences

  return (
    <div className="mx-auto w-full max-w-[780px] px-6 py-8">
      <div className="mb-3 flex items-center justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={download}>
          Download .md
        </Button>
      </div>

      <article className="flex flex-col gap-6 rounded-xl border border-border bg-[#fffdf8] px-10 py-10 shadow-soft">
        <header className="flex flex-col gap-1">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted">Your Core</p>
          <h1 className="font-display text-[28px] font-bold tracking-tight text-ink">LinkedIn Voice Card: {name}</h1>
          {date && <p className="text-[12.5px] text-muted">Last updated {date}</p>}
        </header>

        <Section title="Personal Positioning Statement">
          <p className="text-[14.5px] leading-relaxed text-body">{card.positioningStatement}</p>
        </Section>

        <Section title="Identity Snapshot">
          <ul className="flex flex-col gap-1.5 text-[14px] leading-relaxed text-body">
            <Field label="Name" value={name} />
            <Field label="Role & Company" value={card.identity.roleCompany} />
            <Field label="Location" value={card.identity.location} />
            <Field label="Industry" value={card.identity.industry} />
            <Field label="Core Expertise" value={card.identity.coreExpertise} />
            <Field label="LinkedIn Goal" value={card.identity.linkedinGoal} />
          </ul>
        </Section>

        <Section title="Persona Archetype">
          <ul className="flex flex-col gap-2 text-[14px] leading-relaxed text-body">
            <li>
              <b className="text-ink">Primary: {card.persona.primary.name}.</b> {card.persona.primary.description}
            </li>
            <li>
              <b className="text-ink">Secondary: {card.persona.secondary.name}.</b> {card.persona.secondary.description}
            </li>
          </ul>
        </Section>

        <Section title="Voice & Tone Profile">
          <p className="text-[14px] text-body">
            <b className="text-ink">Tone adjectives:</b> {card.voiceTone.adjectives.join(', ')}
          </p>
          <p className="text-[14px] leading-relaxed text-body">{card.voiceTone.communicationStyle}</p>
          <p className="text-[14px] italic leading-relaxed text-muted">{card.voiceTone.corePrinciple}</p>
          <p className="mt-1 text-[13px] font-semibold text-ink">What to avoid</p>
          <Bullets items={card.voiceTone.whatToAvoid} />
          <p className="mt-1 text-[13px] font-semibold text-ink">Signature patterns</p>
          <Bullets items={card.voiceTone.signaturePatterns} />
        </Section>

        <Section title="Content Pillars">
          <ol className="flex list-decimal flex-col gap-3 pl-5 text-[14px] leading-relaxed text-body marker:font-semibold marker:text-accent">
            {card.contentPillars.map((p) => (
              <li key={p.title}>
                <b className="text-ink">{p.title}.</b> {p.description}{' '}
                <span className="italic text-muted">"{p.quote}"</span>
              </li>
            ))}
          </ol>
        </Section>

        {f && (
          <Section title="Post Format Preferences">
            <ul className="flex flex-col gap-1.5 text-[14px] leading-relaxed text-body">
              <Field label="Preferred lengths" value={f.lengths} />
              <Field label="Structure tendencies" value={f.structure} />
              <Field label="Formatting habits" value={f.formatting} />
              <Field label="CTA style" value={f.cta} />
            </ul>
          </Section>
        )}

        <Section title="Opinions & POV">
          <Bullets items={card.opinions.map((o) => `"${o}"`)} />
        </Section>

        <Section title="Signature Quotes">
          <Bullets items={card.signatureQuotes.map((q) => `"${q}"`)} />
        </Section>

        {card.trustedSources.length > 0 && (
          <Section title="Trusted Sources">
            <Bullets items={card.trustedSources} />
          </Section>
        )}

        {card.postExamples && (
          <Section title="Post Examples Analyzed">
            <p className="text-[14px] leading-relaxed text-body">{card.postExamples}</p>
          </Section>
        )}

        <Section title="Audience">
          <ul className="flex flex-col gap-1.5 text-[14px] leading-relaxed text-body">
            <Field label="Primary" value={card.audience.primary} />
            <Field label="Secondary" value={card.audience.secondary} />
          </ul>
        </Section>

        {card.memorySummary && (
          <Section title="Memory Summary">
            <p className="text-[14px] leading-relaxed text-body">{card.memorySummary}</p>
          </Section>
        )}
      </article>
    </div>
  )
}

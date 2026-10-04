import { useState } from 'react'
import type { SynthesizedVoiceCard } from '@/data/types'
import { Button } from '@/components/primitives/Button'
import { cx } from '@/lib/cx'

const INPUT =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.5px] leading-relaxed text-ink outline-none placeholder:text-muted focus:border-accent'

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-border-soft pt-6">
      <h2 className="font-display text-[17px] font-bold tracking-tight text-ink">{title}</h2>
      {children}
    </section>
  )
}

function Field({
  label,
  value,
  onChange,
  multiline = false,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  multiline?: boolean
  hint?: string
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[12px] font-semibold text-ink">{label}</span>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className={cx(INPUT, 'resize-y')} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className={INPUT} />
      )}
      {hint && <span className="text-[11.5px] text-muted">{hint}</span>}
    </label>
  )
}

/** One item per line: how lists (opinions, quotes, sources...) are edited. */
function Lines({ label, value, onChange, hint }: { label: string; value: string[]; onChange: (v: string[]) => void; hint?: string }) {
  const [text, setText] = useState(value.join('\n'))
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[12px] font-semibold text-ink">{label}</span>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          onChange(e.target.value.split('\n').map((l) => l.trim()).filter(Boolean))
        }}
        rows={Math.min(10, Math.max(3, value.length + 1))}
        className={cx(INPUT, 'resize-y')}
      />
      <span className="text-[11.5px] text-muted">{hint ?? 'One per line.'}</span>
    </label>
  )
}

function clean(card: SynthesizedVoiceCard): SynthesizedVoiceCard {
  const t = (s: string | undefined) => (s ?? '').trim()
  return {
    ...card,
    positioningStatement: t(card.positioningStatement),
    identity: {
      roleCompany: t(card.identity.roleCompany),
      location: t(card.identity.location),
      industry: t(card.identity.industry),
      coreExpertise: t(card.identity.coreExpertise),
      linkedinGoal: t(card.identity.linkedinGoal),
    },
    contentPillars: card.contentPillars
      .map((p) => ({ title: t(p.title), description: t(p.description), quote: t(p.quote) }))
      .filter((p) => p.title),
    postExamples: t(card.postExamples),
    memorySummary: t(card.memorySummary),
  }
}

interface VoiceCardEditorProps {
  initial: SynthesizedVoiceCard
  saving: boolean
  error: string | null
  onSave: (card: SynthesizedVoiceCard) => void
  onCancel: () => void
}

/** Edit the whole Voice Card in place. The drafter reads exactly this, so
 * changes here change how every future draft sounds. */
export function VoiceCardEditor({ initial, saving, error, onSave, onCancel }: VoiceCardEditorProps) {
  const [c, setC] = useState<SynthesizedVoiceCard>(initial)
  const set = (patch: Partial<SynthesizedVoiceCard>) => setC((prev) => ({ ...prev, ...patch }))
  const fp = c.formatPreferences ?? { lengths: '', structure: '', formatting: '', cta: '' }

  return (
    <div className="flex flex-col gap-6">
      <Group title="Personal Positioning Statement">
        <Field label="Positioning statement" multiline value={c.positioningStatement} onChange={(v) => set({ positioningStatement: v })} />
      </Group>

      <Group title="Identity Snapshot">
        <Field label="Role & company" value={c.identity.roleCompany} onChange={(v) => set({ identity: { ...c.identity, roleCompany: v } })} />
        <Field label="Location" value={c.identity.location ?? ''} onChange={(v) => set({ identity: { ...c.identity, location: v } })} />
        <Field label="Industry" value={c.identity.industry} onChange={(v) => set({ identity: { ...c.identity, industry: v } })} />
        <Field label="Core expertise" multiline value={c.identity.coreExpertise} onChange={(v) => set({ identity: { ...c.identity, coreExpertise: v } })} />
        <Field label="LinkedIn goal" multiline value={c.identity.linkedinGoal} onChange={(v) => set({ identity: { ...c.identity, linkedinGoal: v } })} />
      </Group>

      <Group title="Persona Archetype">
        <Field label="Primary" value={c.persona.primary.name} onChange={(v) => set({ persona: { ...c.persona, primary: { ...c.persona.primary, name: v } } })} />
        <Field label="Primary: what it looks like for you" multiline value={c.persona.primary.description} onChange={(v) => set({ persona: { ...c.persona, primary: { ...c.persona.primary, description: v } } })} />
        <Field label="Secondary" value={c.persona.secondary.name} onChange={(v) => set({ persona: { ...c.persona, secondary: { ...c.persona.secondary, name: v } } })} />
        <Field label="Secondary: what it looks like for you" multiline value={c.persona.secondary.description} onChange={(v) => set({ persona: { ...c.persona, secondary: { ...c.persona.secondary, description: v } } })} />
      </Group>

      <Group title="Voice & Tone Profile">
        <Field
          label="Tone adjectives"
          hint="Comma separated."
          value={c.voiceTone.adjectives.join(', ')}
          onChange={(v) => set({ voiceTone: { ...c.voiceTone, adjectives: v.split(',').map((a) => a.trim()).filter(Boolean) } })}
        />
        <Field label="Communication style" multiline value={c.voiceTone.communicationStyle} onChange={(v) => set({ voiceTone: { ...c.voiceTone, communicationStyle: v } })} />
        <Field label="Core principle" value={c.voiceTone.corePrinciple} onChange={(v) => set({ voiceTone: { ...c.voiceTone, corePrinciple: v } })} />
        <Lines label="What to avoid" value={c.voiceTone.whatToAvoid} onChange={(v) => set({ voiceTone: { ...c.voiceTone, whatToAvoid: v } })} />
        <Lines label="Signature patterns" value={c.voiceTone.signaturePatterns} onChange={(v) => set({ voiceTone: { ...c.voiceTone, signaturePatterns: v } })} />
      </Group>

      <Group title="Content Pillars">
        {c.contentPillars.map((p, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-lg border border-border-soft p-3">
            <Field label={`Pillar ${i + 1}`} value={p.title} onChange={(v) => set({ contentPillars: c.contentPillars.map((x, j) => (j === i ? { ...x, title: v } : x)) })} />
            <Field label="Your point of view" multiline value={p.description} onChange={(v) => set({ contentPillars: c.contentPillars.map((x, j) => (j === i ? { ...x, description: v } : x)) })} />
            <Field label="A line that sounds like you" value={p.quote} onChange={(v) => set({ contentPillars: c.contentPillars.map((x, j) => (j === i ? { ...x, quote: v } : x)) })} />
            <button
              className="w-fit text-[12px] font-semibold text-danger-fg underline"
              onClick={() => set({ contentPillars: c.contentPillars.filter((_, j) => j !== i) })}
            >
              Remove this pillar
            </button>
          </div>
        ))}
        <Button variant="secondary" size="sm" className="w-fit" onClick={() => set({ contentPillars: [...c.contentPillars, { title: '', description: '', quote: '' }] })}>
          Add a pillar
        </Button>
      </Group>

      <Group title="Post Format Preferences">
        <Field label="Preferred lengths" value={fp.lengths} onChange={(v) => set({ formatPreferences: { ...fp, lengths: v } })} />
        <Field label="Structure tendencies" value={fp.structure} onChange={(v) => set({ formatPreferences: { ...fp, structure: v } })} />
        <Field label="Formatting habits" value={fp.formatting} onChange={(v) => set({ formatPreferences: { ...fp, formatting: v } })} />
        <Field label="CTA style" value={fp.cta} onChange={(v) => set({ formatPreferences: { ...fp, cta: v } })} />
      </Group>

      <Group title="Opinions, quotes & sources">
        <Lines label="Opinions & POV" value={c.opinions} onChange={(v) => set({ opinions: v })} />
        <Lines label="Signature quotes" value={c.signatureQuotes} onChange={(v) => set({ signatureQuotes: v })} />
        <Lines label="Trusted sources" value={c.trustedSources} onChange={(v) => set({ trustedSources: v })} />
        <Field label="Post examples analyzed" multiline value={c.postExamples ?? ''} onChange={(v) => set({ postExamples: v })} />
      </Group>

      <Group title="Audience">
        <Field label="Primary" value={c.audience.primary} onChange={(v) => set({ audience: { ...c.audience, primary: v } })} />
        <Field label="Secondary" value={c.audience.secondary} onChange={(v) => set({ audience: { ...c.audience, secondary: v } })} />
      </Group>

      <Group title="Memory Summary">
        <Field label="Memory summary" multiline value={c.memorySummary} onChange={(v) => set({ memorySummary: v })} />
      </Group>

      <div className="sticky bottom-0 -mx-10 -mb-10 flex items-center gap-3 rounded-b-xl border-t border-border bg-[#fffdf8] px-10 py-4">
        <Button variant="primary" onClick={() => onSave(clean(c))} disabled={saving || !c.positioningStatement.trim()}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        {error && <span className="text-[12.5px] text-danger-fg">{error}</span>}
        <span className="ml-auto text-[11.5px] text-muted">Your drafter reads this card, so edits change how new drafts sound.</span>
      </div>
    </div>
  )
}

import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog } from '@/components/primitives/Dialog'
import { Button } from '@/components/primitives/Button'
import { Checkbox } from '@/components/primitives/Checkbox'
import { Icon } from '@/components/icons/Icon'
import { parseVoiceCardImport } from '@/lib/voiceCardImport'
import { upsertInterviewAnswer, upsertVoiceCard } from '@/data/services/onboardingService'
import { ORIENTATION_QUESTION_ID, type ContentOrientation } from '@/data/onboardingCatalog'
import { useAuth } from '@/state/AuthContext'

interface VoiceCardUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * "Upload an existing Voice Card" — a second onboarding entry point next
 * to the interview. No AI call: `parseVoiceCardImport` (see
 * `src/lib/voiceCardImport.ts`) heuristically pulls a positioning
 * statement and opinion bullets out of the standard Voice Card markdown
 * template, deterministically. The raw text is kept in
 * `voice_cards.imported_from_text`; after saving, the user is routed into
 * the real interview so anything the heuristic couldn't infer still gets
 * filled in by real questions.
 */
export function VoiceCardUploadDialog({ open, onOpenChange }: VoiceCardUploadDialogProps) {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [orientationOverride, setOrientationOverride] = useState(false)
  const [orientationAutoDetected, setOrientationAutoDetected] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function handleTextChange(next: string) {
    setText(next)
    const parsed = parseVoiceCardImport(next)
    setOrientationAutoDetected(parsed.orientationDetected)
    setOrientationOverride(parsed.contentOrientation === 'audience_sales')
  }

  async function handleFileChosen(file: File) {
    const content = await file.text()
    handleTextChange(content)
  }

  async function handleSubmit() {
    if (!profile || !text.trim() || saving) return
    setSaving(true)
    setError('')
    try {
      const parsed = parseVoiceCardImport(text)
      const contentOrientation: ContentOrientation = orientationOverride ? 'audience_sales' : 'personal_brand'
      const opinions =
        parsed.opinions.length > 0
          ? parsed.opinions.map((quote, index) => ({ id: `op_import_${index}`, quote }))
          : [{ id: 'op_placeholder', quote: 'Next opinion lands here…', placeholder: true }]

      await upsertVoiceCard(
        profile.userId,
        {
          roleLabel: profile.title,
          povFingerprint: parsed.povFingerprint,
          completenessPct: parsed.completenessPct,
          completenessNote: parsed.completenessNote,
          opinions,
          contentOrientation,
        },
        text,
      )

      // If the orientation was detected (or the user confirmed/overrode
      // it here), seed it as an already-answered interview question so the
      // real interview doesn't ask it again — and, more importantly,
      // doesn't reset it back to "not yet chosen" the moment the first
      // unrelated question saves (the interview always re-derives the
      // whole card from `interview_answers` on every "Continue").
      if (parsed.orientationDetected || orientationOverride) {
        await upsertInterviewAnswer(profile.userId, {
          questionId: ORIENTATION_QUESTION_ID,
          selectedOptionId: contentOrientation,
          freeTextAnswer: 'Detected from your imported Voice Card.',
        })
      }

      onOpenChange(false)
      navigate('/onboarding/interview')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong saving your Voice Card.')
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Upload an existing Voice Card"
      description="Paste the markdown, or upload the .txt/.md file. We'll pull out what we can, then route you into a few real questions to fill any gaps."
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void handleSubmit()} disabled={saving || !text.trim()}>
            {saving ? 'Saving…' : 'Save and continue'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
            Voice Card text
          </span>
          <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Icon name="upload" className="h-[13px] w-[13px]" />
            Upload .txt/.md
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleFileChosen(file)
              e.target.value = ''
            }}
          />
        </div>
        <textarea
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder={'## Personal Positioning Statement\n...\n\n## Opinions & POV\n- ...'}
          rows={8}
          className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-[12.5px] text-ink outline-none placeholder:text-muted focus:border-accent focus:shadow-[0_0_0_4px_var(--tl-accent-10)]"
        />
        <label className="flex items-center gap-2.5">
          <Checkbox checked={orientationOverride} onCheckedChange={setOrientationOverride} />
          <span className="text-[12.5px] text-body">
            This is a Social Seller (audience/sales-focused) Voice Card
            {orientationAutoDetected && ' — detected automatically, uncheck to override'}
          </span>
        </label>
        {error && <p className="text-[12px] text-danger-fg">{error}</p>}
      </div>
    </Dialog>
  )
}

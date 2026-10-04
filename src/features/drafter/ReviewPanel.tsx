import { useMemo, useState } from 'react'
import { runBsCheck, BS_CHECKS, CATEGORY_META, type BsCategory } from '@/lib/bsCheck'
import { getRoastTier, roastTierLabel, roastTierPillTone } from '@/lib/roastTier'
import type { ReviseResult } from '@/data/services/draftsService'
import type { IdeaCheck } from '@/data/types'
import { Button } from '@/components/primitives/Button'
import { Card } from '@/components/primitives/Card'
import { Pill } from '@/components/primitives/Pill'
import { Icon } from '@/components/icons/Icon'

const VERDICT_STYLE: Record<IdeaCheck['verdict'], { label: string; tone: 'success' | 'warn' | 'danger' }> = {
  green: { label: 'Green light', tone: 'success' },
  yellow: { label: 'Yellow light', tone: 'warn' },
  red: { label: 'Red light', tone: 'danger' },
}

interface ReviewPanelProps {
  text: string
  ideaCheck: IdeaCheck | null
  humanizing: boolean
  humanizeResult: ReviseResult | null
  onHumanize: () => void
}

/** The review half: the idea-level BS Detector verdict, the live
 * deterministic checklist, and the AI humanizer. */
export function ReviewPanel({ text, ideaCheck, humanizing, humanizeResult, onHumanize }: ReviewPanelProps) {
  const bs = useMemo(() => runBsCheck(text), [text])
  const tier = getRoastTier(bs.score)
  const [openCat, setOpenCat] = useState<BsCategory | null>(null)
  const hasText = text.trim().length > 0

  return (
    <div className="flex flex-col gap-4">
      {ideaCheck && (
        <Card className="flex flex-col gap-1.5 p-3.5">
          <div className="flex items-center gap-2">
            <Icon name="shield" className="h-[15px] w-[15px] text-accent-dark" />
            <p className="text-[12px] font-semibold text-ink">Does this have something real behind it?</p>
          </div>
          <Pill tone={VERDICT_STYLE[ideaCheck.verdict].tone} className="w-fit">
            {VERDICT_STYLE[ideaCheck.verdict].label}
          </Pill>
          <p className="text-[12.5px] leading-snug text-body">{ideaCheck.insight}</p>
          {ideaCheck.missing && (
            <p className="text-[12.5px] leading-snug text-body">
              <span className="font-semibold">To make it yours:</span> {ideaCheck.missing}
            </p>
          )}
        </Card>
      )}

      <Card className="flex flex-col gap-2 p-3.5">
        <div className="flex items-center gap-2">
          <Icon name="alert" className="h-[15px] w-[15px] text-accent-dark" />
          <p className="text-[12px] font-semibold text-ink">AI-tell checklist</p>
          {hasText && !bs.declined && (
            <Pill tone={roastTierPillTone(tier)} className="ml-auto">
              {roastTierLabel(tier)} · {bs.score}/10
            </Pill>
          )}
        </div>
        {!hasText ? (
          <p className="text-[12.5px] text-muted">Starts checking as soon as there's text. Updates live as you edit.</p>
        ) : bs.declined ? (
          <p className="text-[12.5px] text-body">This reads like it's about something serious, so the checklist skips scoring it on purpose.</p>
        ) : bs.matches.length === 0 ? (
          <p className="text-[12.5px] text-body">Clean. Nothing flagged in the current text.</p>
        ) : (
          (Object.keys(CATEGORY_META) as BsCategory[])
            .filter((c) => bs.byCategory[c].length > 0)
            .map((c) => (
              <div key={c}>
                <button
                  className="flex w-full items-center justify-between text-left text-[12.5px] font-semibold text-ink"
                  onClick={() => setOpenCat(openCat === c ? null : c)}
                >
                  <span>
                    {CATEGORY_META[c].title} <span className="font-normal text-muted">({bs.byCategory[c].length})</span>
                  </span>
                  <Icon name="chev" className={'h-3 w-3 text-muted transition-transform ' + (openCat === c ? '-rotate-90' : 'rotate-90')} />
                </button>
                {openCat === c && (
                  <ul className="mt-1 flex flex-col gap-0.5 pl-3">
                    {bs.byCategory[c].map((m) => (
                      <li key={m.id} className="text-[12px] text-muted">
                        · {m.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))
        )}
        <p className="text-[11px] text-muted">{BS_CHECKS.length} fixed checks, no AI involved.</p>
      </Card>

      <Card className="flex flex-col gap-2 p-3.5">
        <div className="flex items-center gap-2">
          <Icon name="spark" className="h-[15px] w-[15px] text-accent-dark" />
          <p className="text-[12px] font-semibold text-ink">Humanizer</p>
        </div>
        <p className="text-[12px] text-muted">
          Scores how machine-written this sounds, quotes every tell, and rewrites it in your voice. You can undo it from the toolbar.
        </p>
        <Button variant="secondary" size="sm" onClick={onHumanize} disabled={humanizing || !hasText}>
          {humanizing ? 'Humanizing…' : 'Humanize this draft'}
        </Button>
        {humanizeResult && (
          <div className="flex flex-col gap-1.5 border-t border-border-soft pt-2">
            {humanizeResult.textureBefore !== null && (
              <p className="text-[12.5px] text-body">
                AI texture before: <b>{humanizeResult.textureBefore}/10</b>{' '}
                <span className="text-muted">(5 or higher reads as machine-written)</span>
              </p>
            )}
            {humanizeResult.flags.map((f, i) => (
              <p key={i} className="text-[12px] leading-snug text-muted">
                <span className="italic text-body">"{f.quote}"</span> {f.why}
              </p>
            ))}
            {humanizeResult.remainingTells.length > 0 && (
              <p className="text-[12px] text-warn-fg">Still in there: {humanizeResult.remainingTells.join(', ')}</p>
            )}
          </div>
        )}
        <a
          href="https://yourpost.sucks/"
          target="_blank"
          rel="noreferrer noopener"
          className="text-[11.5px] font-semibold text-accent-dark underline"
        >
          Second opinion on yourpost.sucks ↗
        </a>
      </Card>
    </div>
  )
}

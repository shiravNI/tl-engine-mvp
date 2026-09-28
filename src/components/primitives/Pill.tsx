import type { HTMLAttributes } from 'react'
import { cx } from '@/lib/cx'

export type PillTone = 'neutral' | 'accent' | 'success' | 'warn' | 'danger'

const toneClasses: Record<PillTone, string> = {
  neutral: 'border-border bg-chip text-body',
  accent: 'border-transparent bg-accent text-cream',
  success: 'border-transparent bg-success-bg text-success-fg',
  warn: 'border-transparent bg-warn-bg text-warn-fg',
  danger: 'border-transparent bg-danger-bg text-danger-fg',
}

interface PillProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: PillTone
}

export function Pill({ tone = 'neutral', className, ...props }: PillProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-medium uppercase leading-none tracking-[0.08em]',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  )
}

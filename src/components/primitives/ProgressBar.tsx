import { cx } from '@/lib/cx'

interface ProgressBarProps {
  value: number
  max?: number
  className?: string
  barClassName?: string
  height?: number
}

export function ProgressBar({ value, max = 100, className, barClassName, height = 7 }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div
      className={cx('overflow-hidden rounded-full bg-skeleton', className)}
      style={{ height }}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className={cx('h-full rounded-full bg-accent transition-all', barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

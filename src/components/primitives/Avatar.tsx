import { cx } from '@/lib/cx'

interface AvatarProps {
  initials: string
  size?: number
  className?: string
  tone?: 'accent' | 'neutral' | 'warn'
}

const toneClasses = {
  accent: 'bg-accent-10 text-accent-dark',
  neutral: 'bg-chip text-body',
  warn: 'bg-warn-bg text-warn-fg',
}

export function Avatar({ initials, size = 28, className, tone = 'accent' }: AvatarProps) {
  return (
    <div
      className={cx(
        'flex flex-none items-center justify-center rounded-full font-semibold',
        toneClasses[tone],
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(9, size * 0.4) }}
    >
      {initials}
    </div>
  )
}

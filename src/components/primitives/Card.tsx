import { forwardRef, type HTMLAttributes } from 'react'
import { cx } from '@/lib/cx'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Elevated cards get the soft Burnt Y2K shadow; flat inline cards stay shadow-less. */
  elevated?: boolean
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, elevated = false, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cx(
        'rounded-xl border border-border bg-surface',
        elevated && 'shadow-soft',
        className,
      )}
      {...props}
    />
  )
})

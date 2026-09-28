import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cx } from '@/lib/cx'

export type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger'
export type ButtonSize = 'md' | 'sm'

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-espresso border-espresso text-cream shadow-micro hover:brightness-110',
  secondary: 'bg-transparent border-accent-dark text-accent-dark hover:bg-accent-05',
  soft: 'bg-sand border-transparent text-ink hover:brightness-95',
  ghost: 'bg-transparent border-transparent text-accent-dark hover:bg-accent-05',
  danger: 'bg-transparent border-danger-fg/40 text-danger-fg hover:bg-danger-bg',
}

const sizeClasses: Record<ButtonSize, string> = {
  md: 'px-4 py-2 text-[12.5px] gap-1.5',
  sm: 'px-3 py-1.5 text-[11.5px] gap-1',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cx(
        'inline-flex items-center justify-center rounded-full border font-bold leading-none transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  )
})

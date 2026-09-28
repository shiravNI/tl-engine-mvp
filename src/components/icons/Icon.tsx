import {
  AlertTriangle,
  Check,
  ChevronRight,
  Gem,
  Lock,
  LogOut,
  PenLine,
  ShieldCheck,
  Sparkles,
  Upload,
  type LucideProps,
} from 'lucide-react'
import type { ComponentType } from 'react'

/**
 * Maps semantic icon names to lucide-react components, trimmed down to
 * only what this MVP's pages actually reference (see the original Thought
 * Leadership Engine app's much larger `src/components/icons/Icon.tsx` for
 * the full registry this is a subset of).
 */
const registry = {
  lock: Lock,
  check: Check,
  alert: AlertTriangle,
  core: Gem,
  pen: PenLine,
  shield: ShieldCheck,
  chev: ChevronRight,
  spark: Sparkles,
  upload: Upload,
  signout: LogOut,
} satisfies Record<string, ComponentType<LucideProps>>

export type IconName = keyof typeof registry

interface IconProps extends LucideProps {
  name: IconName
}

export function Icon({ name, ...props }: IconProps) {
  const Component = registry[name]
  return <Component {...props} />
}

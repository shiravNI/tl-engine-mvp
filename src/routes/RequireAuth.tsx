import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/state/AuthContext'
import { RouteFallback } from '@/routes/RouteFallback'

/** Guards `/login` — a signed-in user shouldn't see the login gate again. */
export function RequireAnonymous({ children }: { children: ReactNode }) {
  const { status } = useAuth()

  if (status === 'loading') return <RouteFallback />
  if (status === 'authenticated') return <Navigate to="/" replace />

  return <>{children}</>
}

/**
 * Guards `/voice-setup`. Someone who already finished the interview is
 * sent to their Voice Card instead, so re-entering can't silently overwrite
 * it. Someone who only skipped it can come back and finish.
 */
export function RequireVoiceSetupOpen({ children }: { children: ReactNode }) {
  const { status, onboardingCompletedAt } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <RouteFallback />
  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  if (onboardingCompletedAt === undefined) return <RouteFallback />
  if (onboardingCompletedAt !== null) return <Navigate to="/voice-card" replace />

  return <>{children}</>
}

/** Guards pages that only need a signed-in session, regardless of
 * onboarding state (e.g. the no-persistence interview demo). */
export function RequireSession({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <RouteFallback />
  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return <>{children}</>
}

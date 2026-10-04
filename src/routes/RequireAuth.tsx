import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/state/AuthContext'
import { RouteFallback } from '@/routes/RouteFallback'

/**
 * Guards `/` (the Drafter). No provider tree to mount here beyond auth
 * itself — this MVP has exactly one protected page and no global
 * ContentContext-style state, unlike the original app's `RequireAuth`.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, onboardingCompletedAt, onboardingSkipped } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <RouteFallback />
  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  // Still loading onboarding_state (a beat after profile resolves).
  if (onboardingCompletedAt === undefined) return <RouteFallback />
  if (onboardingCompletedAt === null && !onboardingSkipped) {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}

/** Guards `/login` — a signed-in user shouldn't see the login gate again. */
export function RequireAnonymous({ children }: { children: ReactNode }) {
  const { status } = useAuth()

  if (status === 'loading') return <RouteFallback />
  if (status === 'authenticated') return <Navigate to="/" replace />

  return <>{children}</>
}

/**
 * Guards `/onboarding` + `/onboarding/interview`. Checks
 * `onboarding_state.completed_at`, not just auth, so a user who already
 * finished onboarding can't silently re-run it and overwrite their Voice
 * Card. A user who only *skipped* it can still return (they haven't
 * completed it), which is what lets "finish later" mean something.
 */
export function RequireOnboardingIncomplete({ children }: { children: ReactNode }) {
  const { status, onboardingCompletedAt } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <RouteFallback />
  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  if (onboardingCompletedAt === undefined) return <RouteFallback />
  if (onboardingCompletedAt !== null) return <Navigate to="/" replace />

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

import { lazy, Suspense } from 'react'
import { useAuth } from '@/state/AuthContext'
import { RouteFallback } from '@/routes/RouteFallback'

const DrafterPage = lazy(() => import('@/features/drafter/DrafterPage').then((m) => ({ default: m.DrafterPage })))
const VoiceSetup = lazy(() => import('@/features/onboarding/VoiceSetup').then((m) => ({ default: m.VoiceSetup })))

/** One front door. New people land in voice setup, in the same app frame
 * as the drafter; once the voice is set up (or they chose to skip for now)
 * the drafter is home. */
export function HomePage() {
  const { onboardingCompletedAt, onboardingSkipped } = useAuth()
  if (onboardingCompletedAt === undefined) return <RouteFallback />
  const needsSetup = onboardingCompletedAt === null && !onboardingSkipped
  return <Suspense fallback={<RouteFallback />}>{needsSetup ? <VoiceSetup /> : <DrafterPage />}</Suspense>
}

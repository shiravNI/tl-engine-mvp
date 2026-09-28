import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RouteFallback } from '@/routes/RouteFallback'
import { RouteErrorBoundary } from '@/routes/RouteErrorBoundary'
import { RequireAuth, RequireAnonymous, RequireOnboardingIncomplete } from '@/routes/RequireAuth'
import { TopBar } from '@/components/chrome/TopBar'

const LoginPage = lazy(() => import('@/features/onboarding/LoginPage').then((m) => ({ default: m.LoginPage })))
const OnboardingMapPage = lazy(() =>
  import('@/features/onboarding/OnboardingMapPage').then((m) => ({ default: m.OnboardingMapPage })),
)
const InterviewPage = lazy(() =>
  import('@/features/onboarding/InterviewPage').then((m) => ({ default: m.InterviewPage })),
)
const DrafterPage = lazy(() => import('@/features/drafter/DrafterPage').then((m) => ({ default: m.DrafterPage })))

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <RequireAnonymous>
        <Suspense fallback={<RouteFallback />}>
          <LoginPage />
        </Suspense>
      </RequireAnonymous>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/onboarding',
    element: (
      <RequireOnboardingIncomplete>
        <Suspense fallback={<RouteFallback />}>
          <OnboardingMapPage />
        </Suspense>
      </RequireOnboardingIncomplete>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/onboarding/interview',
    element: (
      <RequireOnboardingIncomplete>
        <Suspense fallback={<RouteFallback />}>
          <InterviewPage />
        </Suspense>
      </RequireOnboardingIncomplete>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <div className="flex min-h-screen flex-col">
          <TopBar />
          <main className="flex-1">
            <Suspense fallback={<RouteFallback />}>
              <DrafterPage />
            </Suspense>
          </main>
        </div>
      </RequireAuth>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  { path: '*', element: <Navigate to="/" replace /> },
])

import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RouteFallback } from '@/routes/RouteFallback'
import { RouteErrorBoundary } from '@/routes/RouteErrorBoundary'
import { RequireAnonymous, RequireSession, RequireVoiceSetupOpen } from '@/routes/RequireAuth'
import { TopBar } from '@/components/chrome/TopBar'

const LoginPage = lazy(() => import('@/features/onboarding/LoginPage').then((m) => ({ default: m.LoginPage })))
const HomePage = lazy(() => import('@/features/home/HomePage').then((m) => ({ default: m.HomePage })))
const VoiceSetup = lazy(() => import('@/features/onboarding/VoiceSetup').then((m) => ({ default: m.VoiceSetup })))
const InterviewChatPage = lazy(() =>
  import('@/features/onboarding/InterviewChatPage').then((m) => ({ default: m.InterviewChatPage })),
)
const InterviewDemoPage = lazy(() =>
  import('@/features/onboarding/InterviewChatPage').then((m) => ({ default: () => <m.InterviewChatPage demo /> })),
)
const VoiceCardPage = lazy(() =>
  import('@/features/voice-card/VoiceCardPage').then((m) => ({ default: m.VoiceCardPage })),
)

// Matches vite.config.ts's GitHub Pages base path — react-router's own
// basename is separate from Vite's asset base and has to be set explicitly
// too, or route matching breaks once the app is served under a subpath.
/** The one app frame: shared top bar, page below. */
function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <main className="flex-1">
        <Suspense fallback={<RouteFallback />}>{children}</Suspense>
      </main>
    </div>
  )
}

const basename = import.meta.env.BASE_URL !== '/' ? import.meta.env.BASE_URL : undefined

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
  // The old separate onboarding screens now live inside the app itself.
  { path: '/onboarding', element: <Navigate to="/" replace /> },
  { path: '/onboarding/interview', element: <Navigate to="/voice-setup" replace /> },
  {
    path: '/voice-setup',
    element: (
      <RequireVoiceSetupOpen>
        <AppShell>
          <VoiceSetup startInChat />
        </AppShell>
      </RequireVoiceSetupOpen>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    // Full interview, zero persistence — a test page for walking through
    // the real flow. Needs a signed-in session only so the edge function
    // accepts the call; nothing it does is written anywhere.
    path: '/interview-demo',
    element: (
      <RequireSession>
        <Suspense fallback={<RouteFallback />}>
          <InterviewDemoPage />
        </Suspense>
      </RequireSession>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/',
    element: (
      <RequireSession>
        <AppShell>
          <HomePage />
        </AppShell>
      </RequireSession>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/voice-card',
    element: (
      <RequireSession>
        <AppShell>
          <VoiceCardPage />
        </AppShell>
      </RequireSession>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  { path: '*', element: <Navigate to="/" replace /> },
], { basename })

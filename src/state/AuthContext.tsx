import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import type { UserRole } from '@/data/types'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

/** Row -> camelCase mapper's output for `public.profiles`. */
export interface Profile {
  userId: string
  email: string
  name: string
  initials: string
  role: UserRole
  title: string
}

function rowToProfile(row: {
  user_id: string
  email: string
  name: string
  initials: string
  role: string
  title: string
}): Profile {
  return {
    userId: row.user_id,
    email: row.email,
    name: row.name,
    initials: row.initials,
    role: row.role as UserRole,
    title: row.title,
  }
}

interface AuthContextValue {
  status: AuthStatus
  session: Session | null
  profile: Profile | null
  /**
   * `onboarding_state.completed_at` for the signed-in user. `undefined`
   * while still loading; `null` once loaded if onboarding isn't complete
   * yet.
   */
  onboardingCompletedAt: string | null | undefined
  /** `onboarding_state.skipped` — lets a user who hit "finish later" into
   * the app without permanently blocking a return trip to `/onboarding`
   * (that still hinges on `completedAt`). */
  onboardingSkipped: boolean | undefined
  refreshOnboardingState: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessionChecked, setSessionChecked] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [onboardingCompletedAt, setOnboardingCompletedAt] = useState<string | null | undefined>(
    undefined,
  )
  const [onboardingSkipped, setOnboardingSkipped] = useState<boolean | undefined>(undefined)

  const loadProfileAndOnboarding = useCallback(async (userId: string) => {
    const [profileResult, onboardingResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', userId).single(),
      supabase.from('onboarding_state').select('completed_at, skipped').eq('user_id', userId).single(),
    ])
    if (!profileResult.error && profileResult.data) {
      setProfile(rowToProfile(profileResult.data))
    }
    setOnboardingCompletedAt(onboardingResult.data?.completed_at ?? null)
    setOnboardingSkipped(onboardingResult.data?.skipped ?? false)
  }, [])

  useEffect(() => {
    let cancelled = false

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      const nextSession = data.session ?? null
      setSession(nextSession)
      setSessionChecked(true)
      if (nextSession) void loadProfileAndOnboarding(nextSession.user.id)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (cancelled) return
      setSession(nextSession)
      setSessionChecked(true)
      if (nextSession) {
        void loadProfileAndOnboarding(nextSession.user.id)
      } else {
        setProfile(null)
        setOnboardingCompletedAt(undefined)
        setOnboardingSkipped(undefined)
      }
    })

    return () => {
      cancelled = true
      listener.subscription.unsubscribe()
    }
  }, [loadProfileAndOnboarding])

  const refreshOnboardingState = useCallback(async () => {
    if (!session) return
    const { data } = await supabase
      .from('onboarding_state')
      .select('completed_at, skipped')
      .eq('user_id', session.user.id)
      .single()
    setOnboardingCompletedAt(data?.completed_at ?? null)
    setOnboardingSkipped(data?.skipped ?? false)
  }, [session])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  // Only "authenticated" once the profile has actually loaded.
  const status: AuthStatus = !sessionChecked
    ? 'loading'
    : session === null
      ? 'unauthenticated'
      : profile
        ? 'authenticated'
        : 'loading'

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      profile,
      onboardingCompletedAt,
      onboardingSkipped,
      refreshOnboardingState,
      signOut,
    }),
    [status, session, profile, onboardingCompletedAt, onboardingSkipped, refreshOnboardingState, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

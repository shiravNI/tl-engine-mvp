import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Real `@supabase/supabase-js` usage against the schema in
// `supabase/schema.sql`. Guarded so the app boots even when no real
// Supabase project exists yet (unset/placeholder env vars) — auth calls
// simply fail/reject at runtime in that case instead of throwing at
// module-eval time and taking the whole app down.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

function isConfigured(url: string | undefined, key: string | undefined): boolean {
  if (!url || !key) return false
  if (url.includes('your-project-ref') || key.includes('your-anon-public-key')) return false
  if (url.includes('placeholder') || key.includes('placeholder')) return false
  try {
    void new URL(url)
    return true
  } catch {
    return false
  }
}

/** True once real `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are set. */
export const isSupabaseConfigured = isConfigured(supabaseUrl, supabaseAnonKey)

// A syntactically-valid placeholder URL/key so `createClient` never throws
// at module-eval time when the project doesn't exist yet — every real
// call against this fake project simply rejects over the network, which
// every call site already handles.
const FALLBACK_URL = 'https://placeholder.supabase.co'
const FALLBACK_ANON_KEY = 'placeholder-anon-key'

export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? supabaseUrl! : FALLBACK_URL,
  isSupabaseConfigured ? supabaseAnonKey! : FALLBACK_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)

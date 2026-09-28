import { useState } from 'react'
import { Icon } from '@/components/icons/Icon'
import { Button } from '@/components/primitives/Button'
import { Pill } from '@/components/primitives/Pill'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'

/** Login gate. Real magic-link auth via `supabase.auth.signInWithOtp`
 * (sign-up is restricted to @naturalint.com at the DB trigger level — see
 * supabase/schema.sql). The "Continue with Okta" path stays visible but
 * disabled: Okta app registration is still pending, so magic-link is the
 * one real, working path for now. */
export function LoginPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleMagicLink() {
    const trimmed = email.trim()
    if (!trimmed) {
      setStatus('error')
      setErrorMessage('Enter your work email first.')
      return
    }
    setStatus('sending')
    setErrorMessage('')
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) {
      setStatus('error')
      setErrorMessage(
        !isSupabaseConfigured
          ? 'No Supabase project is connected yet — this is expected until VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set.'
          : error.message,
      )
      return
    }
    setStatus('sent')
  }

  return (
    <div className="flex min-h-screen">
      <div className="flex w-[480px] flex-none flex-col justify-between bg-gradient-to-br from-umber to-espresso p-12 text-cream">
        <div className="flex items-center gap-2.5">
          <div className="flex h-[26px] w-[26px] items-center justify-center rounded-[9px] bg-accent font-mono text-[11px] font-medium">
            TL
          </div>
          <span className="text-[14px] font-semibold">TL Engine</span>
          <Pill className="border-transparent bg-white/15 text-cream">Internal · NI</Pill>
        </div>

        <div className="flex flex-col gap-6">
          <h1 className="max-w-[380px] text-[36px] font-bold leading-[1.02] tracking-tight">
            Turn what you know into a post worth posting.
          </h1>
          <div className="flex flex-col gap-4">
            {[
              {
                icon: 'core' as const,
                title: 'Build your Voice Card',
                body: 'A real interview — or upload one you already have — becomes your POV fingerprint.',
              },
              {
                icon: 'pen' as const,
                title: 'Draft in your voice',
                body: 'Give it a topic. Get one LinkedIn post back, written from your Voice Card.',
              },
              {
                icon: 'shield' as const,
                title: 'Review before you post',
                body: 'A real BS Detector, a real Humanizer, and the AI tells to watch for.',
              },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <Icon name={item.icon} className="mt-0.5 h-[18px] w-[18px] text-clay" />
                <div>
                  <div className="text-[13px] font-semibold">{item.title}</div>
                  <p className="mt-0.5 max-w-[330px] text-[12px] text-cream/65">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[12px] text-cream/65">Natural Intelligence · TL Engine MVP</p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-surface p-12">
        <div className="flex w-[360px] flex-col gap-6">
          <div>
            <p className="mb-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted">Sign in</p>
            <h2 className="text-[24px] font-bold">Welcome to TL Engine</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-body">
              Access is managed by NI IT. Use your work account — no separate password.
            </p>
          </div>
          <Button variant="primary" className="justify-center py-3.5 text-[14px]" disabled>
            <Icon name="lock" className="h-[18px] w-[18px]" />
            Continue with Okta
          </Button>
          <div className="flex items-center gap-2.5">
            <div className="h-px flex-1 bg-border-soft" />
            <span className="text-[12px] text-muted">or</span>
            <div className="h-px flex-1 bg-border-soft" />
          </div>
          {status === 'sent' ? (
            <div className="flex gap-2.5 rounded-lg border border-success-fg/30 bg-success-bg p-3">
              <Icon name="check" className="h-4 w-4 flex-none text-success-fg" />
              <p className="text-[12px] leading-relaxed text-success-fg">
                Magic link sent to <b>{email.trim()}</b> — check your inbox and follow the link to sign in.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <label htmlFor="work-email" className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
                Work email
              </label>
              <input
                id="work-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleMagicLink()
                }}
                placeholder="name@naturalint.com"
                className="flex h-[42px] items-center rounded-lg border border-border bg-transparent px-3 text-[13px] text-ink outline-none placeholder:text-muted focus:border-accent focus:shadow-[0_0_0_4px_var(--tl-accent-10)]"
              />
              <Button
                variant="secondary"
                className="justify-center py-3"
                onClick={() => void handleMagicLink()}
                disabled={status === 'sending'}
              >
                {status === 'sending' ? 'Sending…' : 'Email me a magic link'}
              </Button>
              {status === 'error' && (
                <p className="text-[12px] text-danger-fg">{errorMessage}</p>
              )}
            </div>
          )}
          <div className="flex gap-2.5 rounded-lg border border-warn-border bg-warn-bg p-3">
            <Icon name="alert" className="h-4 w-4 flex-none text-warn-fg" />
            <p className="text-[12px] leading-relaxed text-warn-fg">
              Okta app registration is pending. This screen is the gate — magic-link fallback is the interim
              path for pilot cast members.
            </p>
          </div>
          <p className="text-[12px] text-muted">
            Trouble signing in? <span className="font-semibold text-accent-dark">Ping #tl-engine-help</span>
          </p>
        </div>
      </div>
    </div>
  )
}

/** Full-page loading fallback shown while a lazy-loaded route chunk is
 * fetched, or while auth/onboarding state is still resolving. */
export function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center p-8">
      <p className="animate-pulse text-[13px] text-muted">Loading…</p>
    </div>
  )
}

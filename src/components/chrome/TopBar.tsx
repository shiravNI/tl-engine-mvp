import { Icon } from '@/components/icons/Icon'
import { Avatar } from '@/components/primitives/Avatar'
import { Button } from '@/components/primitives/Button'
import { useAuth } from '@/state/AuthContext'

/** Minimal one-screen-product chrome: just enough to feel like an app —
 * the signed-in person's name/initials and a sign-out button. No side
 * nav, no search, no notifications, no streaks — those belong to the
 * larger app this MVP deliberately isn't. */
export function TopBar() {
  const { profile, signOut } = useAuth()

  return (
    <header className="flex h-[58px] flex-none items-center gap-3 border-b border-border bg-surface px-5">
      <div className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[9px] bg-espresso font-mono text-[11px] font-medium text-cream">
        TL
      </div>
      <span className="font-display text-[14px] font-bold text-ink">TL Engine</span>
      <div className="flex-1" />
      {profile && (
        <>
          <Avatar initials={profile.initials} />
          <span className="text-[13px] font-semibold text-ink">{profile.name}</span>
        </>
      )}
      <Button variant="ghost" size="sm" onClick={() => void signOut()}>
        <Icon name="signout" className="h-[14px] w-[14px]" />
        Sign out
      </Button>
    </header>
  )
}

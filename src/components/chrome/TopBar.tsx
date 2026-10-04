import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '@/components/icons/Icon'
import { Avatar } from '@/components/primitives/Avatar'
import { useAuth } from '@/state/AuthContext'

/** Minimal chrome: the drafter is the app. The profile menu (top right)
 * is where the person's Core, their Voice Card, lives. */
export function TopBar() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function go(path: string) {
    setOpen(false)
    navigate(path)
  }

  return (
    <header className="relative z-20 flex h-[58px] flex-none items-center gap-3 border-b border-border bg-surface px-5">
      <Link to="/" className="flex items-center gap-3">
        <div className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[9px] bg-espresso font-mono text-[11px] font-medium text-cream">
          TL
        </div>
        <span className="font-display text-[14px] font-bold text-ink">TL Engine</span>
      </Link>
      <div className="flex-1" />
      {profile && (
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={open}
            className="flex items-center gap-2 rounded-full border border-transparent py-1 pl-1 pr-3 hover:border-border"
          >
            <Avatar initials={profile.initials} />
            <span className="text-[13px] font-semibold text-ink">{profile.name}</span>
          </button>
          {open && (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+6px)] w-[230px] rounded-xl border border-border bg-[#fffdf8] p-1.5 shadow-soft"
            >
              <p className="truncate px-3 pb-1 pt-2 text-[11.5px] text-muted">{profile.email}</p>
              <MenuItem icon="core" label="Core" hint="Your Voice Card" onClick={() => go('/voice-card')} />
              <MenuItem icon="pen" label="Drafter" onClick={() => go('/')} />
              <div className="my-1 h-px bg-border-soft" />
              <MenuItem
                icon="signout"
                label="Sign out"
                onClick={() => {
                  setOpen(false)
                  void signOut()
                }}
              />
            </div>
          )}
        </div>
      )}
    </header>
  )
}

function MenuItem({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: 'core' | 'pen' | 'signout'
  label: string
  hint?: string
  onClick: () => void
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-semibold text-ink hover:bg-accent-05"
    >
      <Icon name={icon} className="h-[15px] w-[15px] text-accent-dark" />
      <span>{label}</span>
      {hint && <span className="ml-auto text-[11.5px] font-normal text-muted">{hint}</span>}
    </button>
  )
}

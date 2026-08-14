import { useState } from 'react'
import { Menu, Moon, Sun, Bell, LogOut } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  front_desk: 'Front Desk',
  technician: 'Technician',
  accountant: 'Accountant',
}

export function Topbar({ title, onToggleSidebar }: { title: string; onToggleSidebar: () => void }) {
  const { dark, toggle } = useTheme()
  const { profile, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [overflowOpen, setOverflowOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-3 dark:border-slate-800 dark:bg-slate-900 sm:px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <button
          onClick={onToggleSidebar}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="Toggle navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="truncate text-base font-semibold text-slate-900 dark:text-slate-50">{title}</h1>
      </div>

      {/* Desktop/tablet: full icon row */}
      <div className="hidden items-center gap-1 sm:flex">
        <button
          onClick={toggle}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="Toggle dark mode"
        >
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <button className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
          <Bell className="h-5 w-5" />
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-600 text-sm font-semibold text-white">
              {profile?.full_name?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div className="hidden text-left lg:block">
              <div className="text-sm font-medium text-slate-900 dark:text-slate-50">{profile?.full_name}</div>
              <div className="text-xs text-slate-400">{profile ? ROLE_LABELS[profile.role] : ''}</div>
            </div>
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
              <button
                onClick={signOut}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: single overflow menu instead of a cramped icon row */}
      <div className="relative sm:hidden">
        <button
          onClick={() => setOverflowOpen((o) => !o)}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="More options"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-600 text-xs font-semibold text-white">
            {profile?.full_name?.charAt(0).toUpperCase() ?? '?'}
          </div>
        </button>
        {overflowOpen && (
          <div className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
            <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
              <div className="text-sm font-medium text-slate-900 dark:text-slate-50">{profile?.full_name}</div>
              <div className="text-xs text-slate-400">{profile ? ROLE_LABELS[profile.role] : ''}</div>
            </div>
            <button
              onClick={toggle}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} {dark ? 'Light mode' : 'Dark mode'}
            </button>
            <button className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800">
              <Bell className="h-4 w-4" /> Notifications
            </button>
            <button
              onClick={signOut}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

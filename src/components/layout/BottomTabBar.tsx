import { NavLink } from 'react-router-dom'
import { Menu } from 'lucide-react'
import clsx from 'clsx'
import { NAV_GROUPS } from '../../config/nav'
import { useAuth } from '../../contexts/AuthContext'

// Primary destinations for the mobile bottom tab bar, in priority order.
// Filtered by role at render time; capped to 4 plus the always-present
// "More" tab that opens the full nav drawer.
const PRIORITY_PATHS = ['/', '/job-sheets', '/customers', '/invoices']

export function BottomTabBar({ onOpenMore }: { onOpenMore: () => void }) {
  const { profile } = useAuth()
  if (!profile) return null

  const allItems = NAV_GROUPS.flatMap((g) => g.items)
  const tabs = PRIORITY_PATHS.map((path) => allItems.find((item) => item.to === path))
    .filter((item): item is NonNullable<typeof item> => !!item && item.roles.includes(profile.role))
    .slice(0, 4)

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-stretch border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-slate-800 dark:bg-slate-900 md:hidden">
      {tabs.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            clsx(
              'flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium',
              isActive ? 'text-primary-600 dark:text-primary-400' : 'text-slate-500 dark:text-slate-400'
            )
          }
        >
          <item.icon className="h-5 w-5" />
          {item.label}
        </NavLink>
      ))}
      <button
        onClick={onOpenMore}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400"
      >
        <Menu className="h-5 w-5" />
        More
      </button>
    </nav>
  )
}

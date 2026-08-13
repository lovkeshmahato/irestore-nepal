import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ChevronDown, Wrench } from 'lucide-react'
import clsx from 'clsx'
import { NAV_GROUPS } from '../../config/nav'
import { useAuth } from '../../contexts/AuthContext'

export function Sidebar({ collapsed }: { collapsed: boolean }) {
  const { profile } = useAuth()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Overview: true,
    Operations: true,
    Inventory: true,
    Administration: true,
  })

  if (!profile) return null

  return (
    <aside
      className={clsx(
        'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200 bg-white transition-all dark:border-slate-800 dark:bg-slate-900',
        collapsed ? 'w-0 overflow-hidden' : 'w-[260px]'
      )}
    >
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5 dark:border-slate-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white">
          <Wrench className="h-4 w-4" />
        </div>
        <span className="text-lg font-semibold text-slate-900 dark:text-slate-50">i-Restore</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((item) => item.roles.includes(profile.role))
          if (items.length === 0) return null
          const isOpen = openGroups[group.label] ?? true
          return (
            <div key={group.label} className="mb-2">
              <button
                onClick={() => setOpenGroups((s) => ({ ...s, [group.label]: !isOpen }))}
                className="flex w-full items-center justify-between rounded-md px-2 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              >
                {group.label}
                <ChevronDown className={clsx('h-3.5 w-3.5 transition-transform', !isOpen && '-rotate-90')} />
              </button>
              {isOpen && (
                <ul className="space-y-0.5">
                  {items.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.to === '/'}
                        className={({ isActive }) =>
                          clsx(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-primary-50 text-primary-700 dark:bg-primary-600/20 dark:text-primary-300'
                              : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                          )
                        }
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}

import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ChevronDown, ChevronsRight, Wrench } from 'lucide-react'
import clsx from 'clsx'
import { NAV_GROUPS } from '../../config/nav'
import { useAuth } from '../../contexts/AuthContext'

interface SidebarProps {
  // 'permanent': the always-mounted rail — full width on desktop (>=lg),
  // icon-only on tablet-portrait (md-lg), hidden below md (mobile uses the
  // overlay drawer instead).
  // 'overlay': a full-width slide-in drawer with a backdrop, used both as
  // the primary mobile nav (triggered by the topbar hamburger) and as the
  // tablet-portrait "expand" affordance from the icon rail.
  mode: 'permanent' | 'overlay'
  collapsed?: boolean
  open?: boolean
  onClose?: () => void
  // Tablet-portrait only: lets the icon-only rail expand into the full
  // overlay drawer on demand instead of permanently eating screen width.
  onExpandOverlay?: () => void
}

export function Sidebar({ mode, collapsed = false, open = false, onClose, onExpandOverlay }: SidebarProps) {
  const { profile } = useAuth()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Overview: true,
    Operations: true,
    Inventory: true,
    Administration: true,
  })

  if (!profile) return null
  if (mode === 'overlay' && !open) return null

  // Icon-only rail: permanent mode, not collapsed, and viewport is in the
  // md-lg (tablet-portrait) band — achieved purely via responsive classes
  // rather than JS breakpoint tracking, so labels/group headers hide at
  // `md` and reappear at `lg`.
  const isPermanent = mode === 'permanent'

  return (
    <>
      {mode === 'overlay' && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 md:hidden" onClick={onClose} />
      )}
      <aside
        className={clsx(
          'flex flex-col overflow-hidden border-r border-slate-200 bg-white transition-all dark:border-slate-800 dark:bg-slate-900',
          isPermanent
            ? clsx(
                'fixed inset-y-0 left-0 z-40 hidden md:flex',
                collapsed ? 'md:w-0 lg:w-0' : 'md:w-[72px] lg:w-[260px]'
              )
            : 'fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw]'
        )}
      >
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-slate-200 px-5 dark:border-slate-800">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white">
            <Wrench className="h-4 w-4" />
          </div>
          <span
            className={clsx(
              'text-lg font-semibold text-slate-900 dark:text-slate-50',
              isPermanent && 'hidden lg:inline'
            )}
          >
            i-Restore
          </span>
          {isPermanent && !collapsed && (
            <button
              onClick={onExpandOverlay}
              title="Expand sidebar"
              aria-label="Expand sidebar"
              className="ml-auto hidden rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 md:flex lg:hidden"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          )}
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
                  className={clsx(
                    'flex w-full items-center justify-between rounded-md px-2 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300',
                    isPermanent && 'hidden lg:flex'
                  )}
                >
                  {group.label}
                  <ChevronDown className={clsx('h-3.5 w-3.5 transition-transform', !isOpen && '-rotate-90')} />
                </button>
                {(isOpen || isPermanent) && (
                  <ul className="space-y-0.5">
                    {items.map((item) => (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          end={item.to === '/'}
                          onClick={mode === 'overlay' ? onClose : undefined}
                          title={item.label}
                          className={({ isActive }) =>
                            clsx(
                              'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                              isActive
                                ? 'bg-primary-50 text-primary-700 dark:bg-primary-600/20 dark:text-primary-300'
                                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                            )
                          }
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span className={clsx(isPermanent && 'hidden lg:inline')}>{item.label}</span>
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
    </>
  )
}

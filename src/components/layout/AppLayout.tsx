import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { NAV_GROUPS } from '../../config/nav'

function useCurrentTitle() {
  const location = useLocation()
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)) {
        return item.label
      }
    }
  }
  return 'i-Restore'
}

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const title = useCurrentTitle()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar collapsed={collapsed} />
      <div className={clsx('flex min-h-screen flex-col transition-all', collapsed ? 'ml-0' : 'ml-0 md:ml-[260px]')}>
        <Topbar title={title} onToggleSidebar={() => setCollapsed((c) => !c)} />
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { BottomTabBar } from './BottomTabBar'
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
  const [overlayOpen, setOverlayOpen] = useState(false)
  const title = useCurrentTitle()

  // Below `lg` (1024px) there's no permanent sidebar to collapse — the
  // hamburger instead opens the overlay drawer (also used as the
  // tablet-portrait "expand the icon rail" affordance).
  function handleToggleSidebar() {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setCollapsed((c) => !c)
    } else {
      setOverlayOpen(true)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar mode="permanent" collapsed={collapsed} onExpandOverlay={() => setOverlayOpen(true)} />
      <Sidebar mode="overlay" open={overlayOpen} onClose={() => setOverlayOpen(false)} />
      <div
        className={clsx(
          'flex min-h-screen flex-col transition-all',
          collapsed ? 'md:ml-0' : 'md:ml-[72px] lg:ml-[260px]'
        )}
      >
        <Topbar title={title} onToggleSidebar={handleToggleSidebar} />
        <main className="flex-1 p-4 pb-20 sm:p-6 md:pb-6">
          <Outlet />
        </main>
      </div>
      <BottomTabBar onOpenMore={() => setOverlayOpen(true)} />
    </div>
  )
}

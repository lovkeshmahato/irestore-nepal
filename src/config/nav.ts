import type { UserRole } from '../types'
import {
  LayoutDashboard,
  Users,
  Wrench,
  FileText,
  ShieldCheck,
  Repeat,
  Package,
  Truck,
  UserCog,
  BarChart3,
  Settings as SettingsIcon,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  roles: UserRole[]
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

const ALL: UserRole[] = ['super_admin', 'admin', 'front_desk', 'technician', 'accountant']

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', to: '/', icon: LayoutDashboard, roles: ALL },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Customers', to: '/customers', icon: Users, roles: ['super_admin', 'admin', 'front_desk', 'accountant'] },
      { label: 'Job Sheets', to: '/job-sheets', icon: Wrench, roles: ALL },
      { label: 'Invoices', to: '/invoices', icon: FileText, roles: ['super_admin', 'admin', 'front_desk', 'accountant'] },
      { label: 'Warranties', to: '/warranties', icon: ShieldCheck, roles: ['super_admin', 'admin', 'front_desk', 'accountant'] },
      { label: 'Sell Requests', to: '/sell-requests', icon: Repeat, roles: ['super_admin', 'admin', 'front_desk'] },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { label: 'Parts', to: '/inventory', icon: Package, roles: ['super_admin', 'admin'] },
      { label: 'Vendors', to: '/vendors', icon: Truck, roles: ['super_admin', 'admin', 'accountant'] },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Staff', to: '/staff', icon: UserCog, roles: ['super_admin', 'admin'] },
      { label: 'Reports', to: '/reports', icon: BarChart3, roles: ['super_admin', 'admin', 'accountant'] },
      { label: 'Settings', to: '/settings', icon: SettingsIcon, roles: ['super_admin'] },
    ],
  },
]

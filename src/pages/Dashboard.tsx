import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Smartphone,
  Wrench,
  CheckCircle2,
  PackageCheck,
  CreditCard,
  DollarSign,
  AlertTriangle,
  UserPlus,
  FilePlus2,
  Search,
  ClipboardList,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { Card } from '../components/ui/Card'
import { StatCard } from '../components/ui/StatCard'
import { StatusBadge } from '../components/ui/Badge'
import { PageHeader } from '../components/ui/PageHeader'
import { FullPageSpinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { JOB_STATUS_LABELS, type JobSheet, type Part } from '../types'
import { format, formatDistanceToNow, subMonths, subDays, startOfMonth, startOfDay, endOfDay } from 'date-fns'
import { LeadsWidget } from './dashboard/LeadsWidget'
import { TrackRepairLookup } from '../components/TrackRepairLookup'
import { CustomerFormModal } from './customers/CustomerFormModal'

type RevenueRange = 'daily' | 'weekly' | 'monthly'

interface DashboardData {
  totalDevices: number
  underRepair: number
  completed: number
  readyForPickup: number
  pendingPayment: number
  totalRevenue: number
  recentJobs: JobSheet[]
  lowStockParts: Part[]
  revenueByDay: { label: string; revenue: number }[]
  revenueByWeek: { label: string; revenue: number }[]
  revenueByMonth: { label: string; revenue: number }[]
  todaysJobSheetCount: number
  todaysReadyCount: number
  todaysCollected: number
}

// Section-header treatment reused from the sidebar's uppercase group labels,
// so Dashboard/Reports panels read as one system with the nav.
const sectionLabelClasses = 'text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500'

export function Dashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData | null>(null)
  const [revenueRange, setRevenueRange] = useState<RevenueRange>('monthly')
  const [showTrackRepair, setShowTrackRepair] = useState(false)
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const isNarrow = useMediaQuery('(max-width: 480px)')
  const canSeeFinancials = profile && ['super_admin', 'admin', 'front_desk', 'accountant'].includes(profile.role)
  const canSeeInventory = profile && ['super_admin', 'admin'].includes(profile.role)
  const canCreateJobs = profile && ['super_admin', 'admin', 'front_desk'].includes(profile.role)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const todayStart = startOfDay(new Date()).toISOString()
      const todayEnd = endOfDay(new Date()).toISOString()

      const [jobSheetsRes, recentJobsRes, todaysJobsRes] = await Promise.all([
        supabase.from('job_sheets').select('id, status'),
        supabase
          .from('job_sheets')
          .select('*, customers(*), devices(*)')
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('job_sheets')
          .select('id, status')
          .gte('created_at', todayStart)
          .lte('created_at', todayEnd),
      ])

      const jobSheets = jobSheetsRes.data ?? []
      const underRepair = jobSheets.filter((j) => j.status === 'in_repair').length
      const completed = jobSheets.filter((j) => j.status === 'delivered').length
      const readyForPickup = jobSheets.filter((j) => j.status === 'ready_for_pickup').length

      const todaysJobs = todaysJobsRes.data ?? []
      const todaysJobSheetCount = todaysJobs.length
      const todaysReadyCount = todaysJobs.filter((j) => j.status === 'ready_for_pickup').length

      let pendingPayment = 0
      let totalRevenue = 0
      let revenueByDay: { label: string; revenue: number }[] = []
      let revenueByWeek: { label: string; revenue: number }[] = []
      let revenueByMonth: { label: string; revenue: number }[] = []
      let todaysCollected = 0
      if (canSeeFinancials) {
        const [invoicesRes, paymentsRes] = await Promise.all([
          supabase.from('invoices').select('id, status, balance_due, total'),
          supabase.from('payments').select('amount, paid_at'),
        ])
        pendingPayment = (invoicesRes.data ?? []).filter((i) => i.status !== 'paid' && i.status !== 'draft').length
        const payments = paymentsRes.data ?? []
        totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0)
        todaysCollected = payments
          .filter((p) => p.paid_at >= todayStart && p.paid_at <= todayEnd)
          .reduce((sum, p) => sum + Number(p.amount), 0)

        const days = Array.from({ length: 14 }).map((_, i) => startOfDay(subDays(new Date(), 13 - i)))
        revenueByDay = days.map((d) => {
          const dayStart = startOfDay(d)
          const dayEnd = endOfDay(d)
          const revenue = payments
            .filter((p) => new Date(p.paid_at) >= dayStart && new Date(p.paid_at) <= dayEnd)
            .reduce((sum, p) => sum + Number(p.amount), 0)
          return { label: format(d, 'MMM d'), revenue }
        })

        revenueByWeek = Array.from({ length: 8 }).map((_, i) => {
          const bucketEnd = endOfDay(subDays(new Date(), (7 - i) * 7))
          const bucketStart = startOfDay(subDays(bucketEnd, 6))
          const revenue = payments
            .filter((p) => new Date(p.paid_at) >= bucketStart && new Date(p.paid_at) <= bucketEnd)
            .reduce((sum, p) => sum + Number(p.amount), 0)
          return { label: format(bucketStart, 'MMM d'), revenue }
        })

        const months = Array.from({ length: 6 }).map((_, i) => startOfMonth(subMonths(new Date(), 5 - i)))
        revenueByMonth = months.map((m) => {
          const label = format(m, 'MMM')
          const next = new Date(m.getFullYear(), m.getMonth() + 1, 1)
          const revenue = payments
            .filter((p) => new Date(p.paid_at) >= m && new Date(p.paid_at) < next)
            .reduce((sum, p) => sum + Number(p.amount), 0)
          return { label, revenue }
        })
      }

      let lowStockParts: Part[] = []
      if (canSeeInventory) {
        const { data: parts } = await supabase.from('parts').select('*')
        lowStockParts = (parts ?? []).filter((p) => p.stock_qty <= p.reorder_threshold)
      }

      if (!cancelled) {
        setData({
          totalDevices: jobSheets.length,
          underRepair,
          completed,
          readyForPickup,
          pendingPayment,
          totalRevenue,
          recentJobs: (recentJobsRes.data ?? []) as JobSheet[],
          lowStockParts,
          revenueByDay,
          revenueByWeek,
          revenueByMonth,
          todaysJobSheetCount,
          todaysReadyCount,
          todaysCollected,
        })
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [canSeeFinancials, canSeeInventory])

  const stats = useMemo(() => {
    if (!data) return []
    const base: { icon: typeof Smartphone; label: string; value: string | number; tone: 'primary' | 'success' | 'warning' | 'info' | 'danger' }[] = [
      { icon: Smartphone, label: 'Total Devices', value: data.totalDevices, tone: 'info' as const },
      { icon: Wrench, label: 'Under Repair', value: data.underRepair, tone: 'warning' as const },
      { icon: CheckCircle2, label: 'Completed', value: data.completed, tone: 'success' as const },
      { icon: PackageCheck, label: 'Ready for Pickup', value: data.readyForPickup, tone: 'info' as const },
    ]
    if (canSeeFinancials) {
      base.push(
        { icon: CreditCard, label: 'Pending Payment', value: data.pendingPayment, tone: 'danger' as const },
        { icon: DollarSign, label: 'Total Revenue', value: `Rs. ${data.totalRevenue.toLocaleString()}`, tone: 'success' as const }
      )
    }
    return base
  }, [data, canSeeFinancials])

  const revenueSeries = useMemo(() => {
    if (!data) return []
    if (revenueRange === 'daily') return data.revenueByDay
    if (revenueRange === 'weekly') return data.revenueByWeek
    return data.revenueByMonth
  }, [data, revenueRange])

  if (!data) return <FullPageSpinner />

  const glanceParts: string[] = [`${data.todaysJobSheetCount} job sheet${data.todaysJobSheetCount === 1 ? '' : 's'} today`]
  glanceParts.push(`${data.todaysReadyCount} ready for pickup`)
  if (canSeeFinancials) glanceParts.push(`Rs. ${data.todaysCollected.toLocaleString()} collected today`)

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of your service centre" />

      {/* Row 1: headline strip — quick actions + today-at-a-glance */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          {canCreateJobs && (
            <button
              onClick={() => setShowNewCustomer(true)}
              className="flex flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-primary-300 hover:bg-primary-50/50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-600/20">
                <UserPlus className="h-5 w-5" />
              </span>
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">New Customer</span>
            </button>
          )}
          {canCreateJobs && (
            <button
              onClick={() => navigate('/job-sheets/new')}
              className="flex flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-primary-300 hover:bg-primary-50/50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success-50 text-success-600 dark:bg-success-600/20">
                <FilePlus2 className="h-5 w-5" />
              </span>
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">New Job Sheet</span>
            </button>
          )}
          <button
            onClick={() => setShowTrackRepair(true)}
            className="flex flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-primary-300 hover:bg-primary-50/50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-info-50 text-info-600 dark:bg-info-600/20">
              <Search className="h-5 w-5" />
            </span>
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Track Repair</span>
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 lg:shrink-0">
          <ClipboardList className="h-4 w-4 shrink-0 text-primary-600" />
          <span className="tabular-nums">{glanceParts.join(' · ')}</span>
        </div>
      </div>

      {/* Row 2: bento grid — revenue chart + stat card stack */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {canSeeFinancials && (
          <Card className="p-5 md:col-span-2 lg:col-span-2">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className={sectionLabelClasses}>Revenue Overview</h2>
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
                {(['daily', 'weekly', 'monthly'] as RevenueRange[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRevenueRange(r)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                      revenueRange === r
                        ? 'bg-primary-600 text-white'
                        : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueSeries} margin={{ left: 0, right: 8 }}>
                <defs>
                  <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.25} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  fontSize={isNarrow ? 10 : 12}
                  interval={isNarrow && revenueSeries.length > 7 ? 1 : 0}
                  stroke="#94a3b8"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={isNarrow ? 10 : 12}
                  width={isNarrow ? 36 : 48}
                  stroke="#94a3b8"
                  tickFormatter={(v) => Number(v).toLocaleString()}
                />
                <Tooltip formatter={(v) => `Rs. ${Number(v).toLocaleString()}`} />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" fill="url(#revenue)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        )}

        <div
          className={`grid grid-cols-2 gap-3 sm:grid-cols-3 md:col-span-2 md:grid-cols-4 lg:grid-cols-2 ${
            canSeeFinancials ? 'lg:col-span-1' : 'lg:col-span-3 lg:grid-cols-4'
          }`}
        >
          {stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>
      </div>

      {/* Row 3: three side-by-side panels */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {canCreateJobs ? (
          <LeadsWidget />
        ) : (
          <Card className="p-5">
            <h2 className={`mb-3 ${sectionLabelClasses}`}>New Leads</h2>
            <p className="text-sm text-slate-400">You don&apos;t have access to leads.</p>
          </Card>
        )}

        <Card className="p-5">
          <h2 className={`mb-3 ${sectionLabelClasses}`}>Recent Job Sheets</h2>
          {data.recentJobs.length === 0 ? (
            <EmptyState title="No job sheets yet" />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.recentJobs.map((job) => (
                <button
                  key={job.id}
                  onClick={() => navigate(`/job-sheets/${job.id}`)}
                  className="flex w-full items-center justify-between gap-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                      {job.job_number} — {job.customers?.full_name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {job.devices?.model} · {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <StatusBadge status={job.status} kind="job" label={JOB_STATUS_LABELS[job.status]} />
                </button>
              ))}
            </div>
          )}
        </Card>

        {canSeeInventory ? (
          <Card className="p-5">
            <h2 className={`mb-3 flex items-center gap-2 ${sectionLabelClasses}`}>
              <AlertTriangle className="h-3.5 w-3.5 text-danger-600" /> Low Stock Alerts
            </h2>
            {data.lowStockParts.length === 0 ? (
              <p className="text-sm text-slate-400">Stock levels are healthy.</p>
            ) : (
              <ul className="space-y-1">
                {data.lowStockParts.map((part) => (
                  <li key={part.id}>
                    <button
                      onClick={() => navigate('/inventory')}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <span className="truncate text-slate-700 dark:text-slate-200">{part.name}</span>
                      <span className="shrink-0 font-semibold tabular-nums text-danger-600">{part.stock_qty} left</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ) : (
          <Card className="p-5">
            <h2 className={`mb-3 ${sectionLabelClasses}`}>Low Stock Alerts</h2>
            <p className="text-sm text-slate-400">You don&apos;t have access to inventory.</p>
          </Card>
        )}
      </div>

      <TrackRepairLookup open={showTrackRepair} onClose={() => setShowTrackRepair(false)} />
      <CustomerFormModal
        open={showNewCustomer}
        onClose={() => setShowNewCustomer(false)}
        onSaved={(customer) => {
          setShowNewCustomer(false)
          navigate(`/customers/${customer.id}`)
        }}
      />
    </div>
  )
}

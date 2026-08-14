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
  ShieldCheck,
  UserPlus,
  FilePlus2,
  Search,
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
import { Card } from '../components/ui/Card'
import { StatCard } from '../components/ui/StatCard'
import { StatusBadge } from '../components/ui/Badge'
import { PageHeader } from '../components/ui/PageHeader'
import { FullPageSpinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { JOB_STATUS_LABELS, type JobSheet, type Part } from '../types'
import { format, subMonths, startOfMonth } from 'date-fns'
import { LeadsWidget } from './dashboard/LeadsWidget'
import { TrackRepairLookup } from '../components/TrackRepairLookup'
import { CustomerFormModal } from './customers/CustomerFormModal'

interface DashboardData {
  totalDevices: number
  underRepair: number
  completed: number
  readyForPickup: number
  pendingPayment: number
  totalRevenue: number
  recentJobs: JobSheet[]
  todaysPickups: JobSheet[]
  warrantyClaimsThisMonth: number
  lowStockParts: Part[]
  revenueByMonth: { month: string; revenue: number }[]
}

export function Dashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData | null>(null)
  const [showTrackRepair, setShowTrackRepair] = useState(false)
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const canSeeFinancials = profile && ['super_admin', 'admin', 'front_desk', 'accountant'].includes(profile.role)
  const canSeeInventory = profile && ['super_admin', 'admin'].includes(profile.role)
  const canCreateJobs = profile && ['super_admin', 'admin', 'front_desk'].includes(profile.role)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [jobSheetsRes, recentJobsRes] = await Promise.all([
        supabase.from('job_sheets').select('id, status'),
        supabase
          .from('job_sheets')
          .select('*, customers(*), devices(*)')
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      const jobSheets = jobSheetsRes.data ?? []
      const underRepair = jobSheets.filter((j) => j.status === 'in_repair').length
      const completed = jobSheets.filter((j) => j.status === 'delivered').length
      const readyForPickup = jobSheets.filter((j) => j.status === 'ready_for_pickup').length

      let pendingPayment = 0
      let totalRevenue = 0
      let revenueByMonth: { month: string; revenue: number }[] = []
      if (canSeeFinancials) {
        const [invoicesRes, paymentsRes] = await Promise.all([
          supabase.from('invoices').select('id, status, balance_due, total'),
          supabase.from('payments').select('amount, paid_at'),
        ])
        pendingPayment = (invoicesRes.data ?? []).filter((i) => i.status !== 'paid' && i.status !== 'draft').length
        totalRevenue = (paymentsRes.data ?? []).reduce((sum, p) => sum + Number(p.amount), 0)

        const months = Array.from({ length: 6 }).map((_, i) => startOfMonth(subMonths(new Date(), 5 - i)))
        revenueByMonth = months.map((m) => {
          const label = format(m, 'MMM')
          const next = new Date(m.getFullYear(), m.getMonth() + 1, 1)
          const revenue = (paymentsRes.data ?? [])
            .filter((p) => new Date(p.paid_at) >= m && new Date(p.paid_at) < next)
            .reduce((sum, p) => sum + Number(p.amount), 0)
          return { month: label, revenue }
        })
      }

      let lowStockParts: Part[] = []
      if (canSeeInventory) {
        const { data: parts } = await supabase.from('parts').select('*')
        lowStockParts = (parts ?? []).filter((p) => p.stock_qty <= p.reorder_threshold)
      }

      const monthStart = startOfMonth(new Date()).toISOString()
      const { count: warrantyClaimsThisMonth } = await supabase
        .from('warranty_claims')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', monthStart)

      const { data: pickups } = await supabase
        .from('job_sheets')
        .select('*, customers(*), devices(*)')
        .eq('status', 'ready_for_pickup')
        .order('updated_at', { ascending: false })
        .limit(10)

      if (!cancelled) {
        setData({
          totalDevices: jobSheets.length,
          underRepair,
          completed,
          readyForPickup,
          pendingPayment,
          totalRevenue,
          recentJobs: (recentJobsRes.data ?? []) as JobSheet[],
          todaysPickups: (pickups ?? []) as JobSheet[],
          warrantyClaimsThisMonth: warrantyClaimsThisMonth ?? 0,
          lowStockParts,
          revenueByMonth,
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
      { icon: Smartphone, label: 'Total Devices', value: data.totalDevices, tone: 'primary' as const },
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

  if (!data) return <FullPageSpinner />

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of your service centre" />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {canCreateJobs && (
          <button
            onClick={() => setShowNewCustomer(true)}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-primary-300 hover:bg-primary-50/50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-600/20">
              <UserPlus className="h-5 w-5" />
            </span>
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">New Customer</span>
          </button>
        )}
        {canCreateJobs && (
          <button
            onClick={() => navigate('/job-sheets/new')}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-primary-300 hover:bg-primary-50/50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-50 text-success-600 dark:bg-success-600/20">
              <FilePlus2 className="h-5 w-5" />
            </span>
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">New Job Sheet</span>
          </button>
        )}
        <button
          onClick={() => setShowTrackRepair(true)}
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-primary-300 hover:bg-primary-50/50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-info-50 text-info-600 dark:bg-info-600/20">
            <Search className="h-5 w-5" />
          </span>
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Track Repair</span>
        </button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {canCreateJobs && (
        <div className="mb-6">
          <LeadsWidget />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {canSeeFinancials && (
            <Card className="p-5">
              <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Revenue Overview</h2>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={data.revenueByMonth}>
                  <defs>
                    <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} width={40} />
                  <Tooltip formatter={(v) => `Rs. ${Number(v).toLocaleString()}`} />
                  <Area type="monotone" dataKey="revenue" stroke="#2563eb" fill="url(#revenue)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          )}

          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Recent Job Sheets</h2>
            {data.recentJobs.length === 0 ? (
              <EmptyState title="No job sheets yet" />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.recentJobs.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => navigate(`/job-sheets/${job.id}`)}
                    className="flex w-full items-center justify-between py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {job.job_number} — {job.customers?.full_name}
                      </p>
                      <p className="text-xs text-slate-400">{job.devices?.model}</p>
                    </div>
                    <StatusBadge status={job.status} kind="job" label={JOB_STATUS_LABELS[job.status]} />
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <PackageCheck className="h-4 w-4 text-info-600" /> Today's Pickups
            </h2>
            {data.todaysPickups.length === 0 ? (
              <p className="text-sm text-slate-400">Nothing ready for pickup.</p>
            ) : (
              <ul className="space-y-2">
                {data.todaysPickups.map((job) => (
                  <li key={job.id}>
                    <button
                      onClick={() => navigate(`/job-sheets/${job.id}`)}
                      className="w-full rounded-lg px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {job.job_number} · {job.customers?.full_name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <ShieldCheck className="h-4 w-4 text-primary-600" /> Warranty Claims
            </h2>
            <p className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{data.warrantyClaimsThisMonth}</p>
            <p className="text-xs text-slate-400">this month</p>
          </Card>

          {canSeeInventory && (
            <Card className="p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <AlertTriangle className="h-4 w-4 text-danger-600" /> Low Stock Alerts
              </h2>
              {data.lowStockParts.length === 0 ? (
                <p className="text-sm text-slate-400">Stock levels are healthy.</p>
              ) : (
                <ul className="space-y-2">
                  {data.lowStockParts.map((part) => (
                    <li key={part.id}>
                      <button
                        onClick={() => navigate('/inventory')}
                        className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <span className="text-slate-700 dark:text-slate-200">{part.name}</span>
                        <span className="font-medium text-danger-600">{part.stock_qty} left</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
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

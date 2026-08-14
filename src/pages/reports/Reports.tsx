import { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { startOfDay, endOfDay, startOfWeek, startOfMonth, format, eachDayOfInterval } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { FullPageSpinner } from '../../components/ui/Spinner'
import { Select } from '../../components/ui/Field'

type RangePreset = 'today' | 'week' | 'month' | 'custom'

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

interface ReportData {
  revenueByDay: { day: string; revenue: number }[]
  totalRevenueInRange: number
  totalPendingAllTime: number
  topDeviceModels: { model: string; count: number }[]
  topIssues: { issue: string; count: number }[]
  pendingInvoices: { id: string; invoice_number: string; customer: string; total: number; balance_due: number; created_at: string }[]
  parts: { id: string; name: string; stock_qty: number; reorder_threshold: number }[]
  partsConsumption: { name: string; quantity: number }[]
  technicianLeaderboard: { name: string; jobsClosed: number; avgTurnaroundDays: number }[]
  profitByJob: { jobNumber: string; profit: number }[]
  repeatCustomerRate: number
}

// Section-header treatment reused from the sidebar's uppercase group labels,
// matching the same classes Dashboard uses for its panel headers.
const sectionLabelClasses = 'text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500'

function SectionHeader({ title, subtitle, onExport }: { title: string; subtitle?: string; onExport: () => void }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className={sectionLabelClasses}>{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
      </div>
      <Button size="sm" variant="secondary" onClick={onExport} className="shrink-0">
        <Download className="h-3.5 w-3.5" /> Export CSV
      </Button>
    </div>
  )
}

export function Reports() {
  const [preset, setPreset] = useState<RangePreset>('month')
  const [customStart, setCustomStart] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [customEnd, setCustomEnd] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [data, setData] = useState<ReportData | null>(null)

  const { rangeStart, rangeEnd } = useMemo(() => {
    const now = new Date()
    if (preset === 'today') return { rangeStart: startOfDay(now), rangeEnd: endOfDay(now) }
    if (preset === 'week') return { rangeStart: startOfWeek(now), rangeEnd: endOfDay(now) }
    if (preset === 'month') return { rangeStart: startOfMonth(now), rangeEnd: endOfDay(now) }
    return { rangeStart: startOfDay(new Date(customStart)), rangeEnd: endOfDay(new Date(customEnd)) }
  }, [preset, customStart, customEnd])

  useEffect(() => {
    async function load() {
      const [
        { data: payments },
        { data: pendingInvoices },
        { data: jobsInRange },
        { data: parts },
        { data: partsUsedInRange },
        { data: closedJobsInRange },
        { data: invoicesInRange },
        { data: partsUsedAll },
        { data: allJobsForRepeat },
        { data: allCustomers },
      ] = await Promise.all([
        supabase.from('payments').select('amount, paid_at').gte('paid_at', rangeStart.toISOString()).lte('paid_at', rangeEnd.toISOString()),
        supabase
          .from('invoices')
          .select('id, invoice_number, total, balance_due, created_at, customers(full_name)')
          .gt('balance_due', 0)
          .order('created_at', { ascending: true }),
        supabase
          .from('job_sheets')
          .select('reported_issue, created_at, devices(model)')
          .gte('created_at', rangeStart.toISOString())
          .lte('created_at', rangeEnd.toISOString()),
        supabase.from('parts').select('id, name, stock_qty, reorder_threshold').order('name'),
        supabase
          .from('job_parts_used')
          .select('quantity, created_at, parts(name)')
          .gte('created_at', rangeStart.toISOString())
          .lte('created_at', rangeEnd.toISOString()),
        supabase
          .from('job_sheets')
          .select('assigned_technician_id, created_at, delivered_at, status, profiles:assigned_technician_id(full_name)')
          .eq('status', 'delivered')
          .gte('created_at', rangeStart.toISOString())
          .lte('created_at', rangeEnd.toISOString()),
        supabase
          .from('invoices')
          .select('total, job_sheet_id')
          .gte('created_at', rangeStart.toISOString())
          .lte('created_at', rangeEnd.toISOString())
          .not('job_sheet_id', 'is', null),
        supabase.from('job_parts_used').select('job_sheet_id, quantity, unit_cost'),
        supabase.from('job_sheets').select('customer_id'),
        supabase.from('customers').select('id'),
      ])

      const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd })
      const revenueByDay = days.map((d) => {
        const dayStart = startOfDay(d)
        const dayEnd = endOfDay(d)
        const revenue = (payments ?? [])
          .filter((p) => new Date(p.paid_at) >= dayStart && new Date(p.paid_at) <= dayEnd)
          .reduce((sum, p) => sum + Number(p.amount), 0)
        return { day: format(d, 'MMM d'), revenue }
      })
      const totalRevenueInRange = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0)
      const totalPendingAllTime = (pendingInvoices ?? []).reduce((sum, i) => sum + Number(i.balance_due), 0)

      const modelCounts: Record<string, number> = {}
      const issueCounts: Record<string, number> = {}
      for (const j of jobsInRange ?? []) {
        const model = (j as unknown as { devices?: { model?: string } }).devices?.model ?? 'Unknown'
        modelCounts[model] = (modelCounts[model] ?? 0) + 1
        issueCounts[j.reported_issue] = (issueCounts[j.reported_issue] ?? 0) + 1
      }
      const topDeviceModels = Object.entries(modelCounts)
        .map(([model, count]) => ({ model, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
      const topIssues = Object.entries(issueCounts)
        .map(([issue, count]) => ({ issue, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)

      const partsConsumptionMap: Record<string, number> = {}
      for (const pu of partsUsedInRange ?? []) {
        const name = (pu as unknown as { parts?: { name?: string } }).parts?.name ?? 'Unknown'
        partsConsumptionMap[name] = (partsConsumptionMap[name] ?? 0) + pu.quantity
      }

      const techMap: Record<string, { name: string; jobsClosed: number; totalDays: number }> = {}
      for (const j of closedJobsInRange ?? []) {
        if (!j.assigned_technician_id) continue
        const name = (j as unknown as { profiles?: { full_name?: string } }).profiles?.full_name ?? 'Unknown'
        const days = j.delivered_at ? (new Date(j.delivered_at).getTime() - new Date(j.created_at).getTime()) / 86400000 : 0
        if (!techMap[j.assigned_technician_id]) techMap[j.assigned_technician_id] = { name, jobsClosed: 0, totalDays: 0 }
        techMap[j.assigned_technician_id].jobsClosed += 1
        techMap[j.assigned_technician_id].totalDays += days
      }
      const technicianLeaderboard = Object.values(techMap)
        .map((t) => ({ name: t.name, jobsClosed: t.jobsClosed, avgTurnaroundDays: Math.round((t.totalDays / t.jobsClosed) * 10) / 10 }))
        .sort((a, b) => b.jobsClosed - a.jobsClosed)

      const partsCostByJob: Record<string, number> = {}
      for (const pu of partsUsedAll ?? []) {
        partsCostByJob[pu.job_sheet_id] = (partsCostByJob[pu.job_sheet_id] ?? 0) + pu.quantity * pu.unit_cost
      }
      const profitByJob = (invoicesInRange ?? []).map((inv) => ({
        jobNumber: inv.job_sheet_id as string,
        profit: Number(inv.total) - (partsCostByJob[inv.job_sheet_id as string] ?? 0),
      }))

      const jobCounts: Record<string, number> = {}
      for (const j of allJobsForRepeat ?? []) {
        if (j.customer_id) jobCounts[j.customer_id] = (jobCounts[j.customer_id] ?? 0) + 1
      }
      const repeatCount = Object.values(jobCounts).filter((c) => c > 1).length
      const repeatCustomerRate = (allCustomers?.length ?? 0) > 0 ? (repeatCount / (allCustomers?.length ?? 1)) * 100 : 0

      setData({
        revenueByDay,
        totalRevenueInRange,
        totalPendingAllTime,
        topDeviceModels,
        topIssues,
        pendingInvoices: (pendingInvoices ?? []).map((i) => ({
          id: i.id,
          invoice_number: i.invoice_number,
          customer: (i as unknown as { customers?: { full_name?: string } }).customers?.full_name ?? 'Unknown',
          total: Number(i.total),
          balance_due: Number(i.balance_due),
          created_at: i.created_at,
        })),
        parts: parts ?? [],
        partsConsumption: Object.entries(partsConsumptionMap).map(([name, quantity]) => ({ name, quantity })),
        technicianLeaderboard,
        profitByJob,
        repeatCustomerRate: Math.round(repeatCustomerRate * 10) / 10,
      })
    }
    load()
  }, [rangeStart, rangeEnd])

  if (!data) return <FullPageSpinner />

  const lowStockParts = data.parts.filter((p) => p.stock_qty <= p.reorder_threshold)

  return (
    <div>
      <PageHeader title="Reports" description="Revenue, performance, and inventory insights" />

      {/* Sticky filter bar */}
      <Card className="sticky top-20 z-20 mb-6 flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Date Range</label>
          <Select value={preset} onChange={(e) => setPreset(e.target.value as RangePreset)} className="w-40">
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="custom">Custom Range</option>
          </Select>
        </div>
        {preset === 'custom' && (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">From</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">To</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              />
            </div>
          </>
        )}
      </Card>

      {/* Summary strip — the visual anchor of the page */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="border-t-4 border-t-success-600 p-6">
          <p className={sectionLabelClasses}>Total Revenue (selected range)</p>
          <p className="mt-2 text-4xl font-bold tabular-nums text-success-600 sm:text-5xl">
            Rs. {data.totalRevenueInRange.toLocaleString()}
          </p>
        </Card>
        <Card className="border-t-4 border-t-danger-600 p-6">
          <p className={sectionLabelClasses}>Total Pending (all outstanding)</p>
          <p className="mt-2 text-4xl font-bold tabular-nums text-danger-600 sm:text-5xl">
            Rs. {data.totalPendingAllTime.toLocaleString()}
          </p>
        </Card>
      </div>

      {/* Sectioned detail reports */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5 lg:col-span-2">
          <SectionHeader
            title="Revenue Report"
            subtitle="Daily revenue for the selected range"
            onExport={() => downloadCsv('revenue-report.csv', [['Day', 'Revenue'], ...data.revenueByDay.map((r) => [r.day, r.revenue])])}
          />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.revenueByDay}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.25} />
              <XAxis dataKey="day" fontSize={11} tickLine={false} axisLine={false} stroke="#94a3b8" />
              <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="#94a3b8" tickFormatter={(v) => Number(v).toLocaleString()} />
              <Tooltip formatter={(v) => `Rs. ${Number(v).toLocaleString()}`} />
              <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <SectionHeader
            title="Device Repair Trends"
            subtitle="Top device models and reported issues in range"
            onExport={() =>
              downloadCsv('device-trends.csv', [
                ['Type', 'Name', 'Count'],
                ...data.topDeviceModels.map((m) => ['Model', m.model, m.count]),
                ...data.topIssues.map((i) => ['Issue', i.issue, i.count]),
              ])
            }
          />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.topDeviceModels} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#94a3b8" strokeOpacity={0.25} />
                  <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} stroke="#94a3b8" allowDecimals={false} />
                  <YAxis type="category" dataKey="model" fontSize={11} tickLine={false} axisLine={false} width={90} stroke="#94a3b8" />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0891b2" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="mt-1 text-center text-xs text-slate-400">Top device models</p>
            </div>
            <div>
              {data.topIssues.length === 0 ? (
                <p className="text-sm text-slate-400">No job sheets in this range.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-slate-400">
                    <tr>
                      <th className="pb-2">Issue</th>
                      <th className="pb-2 text-right">Jobs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.topIssues.map((i) => (
                      <tr key={i.issue}>
                        <td className="py-2 pr-2 text-slate-800 dark:text-slate-200">{i.issue}</td>
                        <td className="py-2 text-right font-medium tabular-nums text-slate-500">{i.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="mt-1 text-center text-xs text-slate-400">Top reported issues</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <SectionHeader
            title="Pending Payment Report"
            subtitle={`Sorted oldest first · ${data.pendingInvoices.length} invoices`}
            onExport={() =>
              downloadCsv('pending-payments.csv', [
                ['Invoice #', 'Customer', 'Total', 'Balance Due', 'Created'],
                ...data.pendingInvoices.map((i) => [i.invoice_number, i.customer, i.total, i.balance_due, i.created_at]),
              ])
            }
          />
          {data.pendingInvoices.length === 0 ? (
            <p className="text-sm text-slate-400">No outstanding invoices.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-slate-400">
                  <tr>
                    <th className="pb-2">Invoice #</th>
                    <th className="pb-2">Customer</th>
                    <th className="pb-2">Created</th>
                    <th className="pb-2 text-right">Balance Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.pendingInvoices.map((i) => (
                    <tr key={i.id}>
                      <td className="py-2 text-slate-800 dark:text-slate-200">{i.invoice_number}</td>
                      <td className="py-2 text-slate-500">{i.customer}</td>
                      <td className="py-2 text-slate-500">{new Date(i.created_at).toLocaleDateString()}</td>
                      <td className="py-2 text-right font-semibold tabular-nums text-danger-600">Rs. {i.balance_due.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 font-semibold dark:border-slate-700">
                    <td colSpan={3} className="py-2 text-slate-700 dark:text-slate-200">
                      Total Pending
                    </td>
                    <td className="py-2 text-right tabular-nums text-danger-600">
                      Rs. {data.pendingInvoices.reduce((s, i) => s + i.balance_due, 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>

        <Card className="p-5 lg:col-span-2">
          <SectionHeader
            title="Inventory Report"
            subtitle="Stock levels, low-stock flags, and parts consumption"
            onExport={() =>
              downloadCsv('inventory-report.csv', [
                ['Part', 'Stock Qty', 'Reorder Threshold', 'Quantity Used In Range'],
                ...data.parts.map((p) => [
                  p.name,
                  p.stock_qty,
                  p.reorder_threshold,
                  data.partsConsumption.find((c) => c.name === p.name)?.quantity ?? 0,
                ]),
              ])
            }
          />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">Stock Levels</h3>
              {lowStockParts.length > 0 && (
                <p className="mb-2 text-sm text-danger-600">{lowStockParts.length} part(s) at or below reorder threshold</p>
              )}
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.parts.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2 text-slate-800 dark:text-slate-200">{p.name}</td>
                        <td className="py-2 text-right">
                          {p.stock_qty <= p.reorder_threshold ? (
                            <Badge tone="danger">{p.stock_qty} left</Badge>
                          ) : (
                            <span className="tabular-nums text-slate-500">{p.stock_qty} in stock</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">Parts Consumption (selected range)</h3>
              {data.partsConsumption.length === 0 ? (
                <p className="text-sm text-slate-400">No parts used in this range.</p>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {data.partsConsumption.map((p) => (
                        <tr key={p.name}>
                          <td className="py-2 text-slate-800 dark:text-slate-200">{p.name}</td>
                          <td className="py-2 text-right tabular-nums text-slate-500">{p.quantity} used</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader
            title="Technician Leaderboard"
            onExport={() =>
              downloadCsv('technician-leaderboard.csv', [
                ['Technician', 'Jobs Closed', 'Avg Turnaround (days)'],
                ...data.technicianLeaderboard.map((t) => [t.name, t.jobsClosed, t.avgTurnaroundDays]),
              ])
            }
          />
          {data.technicianLeaderboard.length === 0 ? (
            <p className="text-sm text-slate-400">No jobs delivered in this range.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-400">
                <tr>
                  <th className="pb-2">Technician</th>
                  <th className="pb-2">Jobs Closed</th>
                  <th className="pb-2">Avg Turnaround</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.technicianLeaderboard.map((t) => (
                  <tr key={t.name}>
                    <td className="py-2 text-slate-800 dark:text-slate-200">{t.name}</td>
                    <td className="py-2 tabular-nums text-slate-500">{t.jobsClosed}</td>
                    <td className="py-2 tabular-nums text-slate-500">{t.avgTurnaroundDays} days</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card className="p-5">
          <h2 className={sectionLabelClasses}>Customer Loyalty</h2>
          <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-50">{data.repeatCustomerRate}%</p>
          <p className="text-sm text-slate-500">repeat customer rate (all-time)</p>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <SectionHeader
            title="Profit Margin per Job"
            subtitle="Invoice total minus parts cost"
            onExport={() => downloadCsv('profit-by-job.csv', [['Job Sheet ID', 'Profit'], ...data.profitByJob.map((p) => [p.jobNumber, p.profit])])}
          />
          <p className="text-sm text-slate-500">{data.profitByJob.length} invoiced jobs in this range. Export CSV for full detail.</p>
        </Card>
      </div>
    </div>
  )
}

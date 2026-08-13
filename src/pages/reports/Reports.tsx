import { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../../lib/supabase'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { FullPageSpinner } from '../../components/ui/Spinner'

interface ReportData {
  revenueByModel: { model: string; revenue: number }[]
  technicianLeaderboard: { name: string; jobsClosed: number; avgTurnaroundDays: number }[]
  partsConsumption: { name: string; quantity: number }[]
  profitByJob: { jobNumber: string; profit: number }[]
  repeatCustomerRate: number
}

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

export function Reports() {
  const [data, setData] = useState<ReportData | null>(null)

  useEffect(() => {
    async function load() {
      const [{ data: invoices }, { data: jobs }, { data: partsUsed }, { data: customers }] = await Promise.all([
        supabase.from('invoices').select('total, job_sheet_id, job_sheets(devices(model))'),
        supabase.from('job_sheets').select('id, job_number, assigned_technician_id, created_at, delivered_at, status, customer_id, profiles:assigned_technician_id(full_name)'),
        supabase.from('job_parts_used').select('quantity, unit_cost, job_sheet_id, parts(name)'),
        supabase.from('customers').select('id'),
      ])

      const revenueByModelMap: Record<string, number> = {}
      for (const inv of invoices ?? []) {
        const model = (inv as unknown as { job_sheets?: { devices?: { model?: string } } }).job_sheets?.devices?.model ?? 'Other'
        revenueByModelMap[model] = (revenueByModelMap[model] ?? 0) + Number(inv.total)
      }

      const techMap: Record<string, { name: string; jobsClosed: number; totalDays: number }> = {}
      for (const j of jobs ?? []) {
        if (j.status !== 'delivered' || !j.assigned_technician_id) continue
        const name = (j as unknown as { profiles?: { full_name?: string } }).profiles?.full_name ?? 'Unknown'
        const days = j.delivered_at ? (new Date(j.delivered_at).getTime() - new Date(j.created_at).getTime()) / 86400000 : 0
        if (!techMap[j.assigned_technician_id]) techMap[j.assigned_technician_id] = { name, jobsClosed: 0, totalDays: 0 }
        techMap[j.assigned_technician_id].jobsClosed += 1
        techMap[j.assigned_technician_id].totalDays += days
      }

      const partsMap: Record<string, number> = {}
      for (const pu of partsUsed ?? []) {
        const name = (pu as unknown as { parts?: { name?: string } }).parts?.name ?? 'Unknown'
        partsMap[name] = (partsMap[name] ?? 0) + pu.quantity
      }

      const partsCostByJob: Record<string, number> = {}
      for (const pu of partsUsed ?? []) {
        partsCostByJob[pu.job_sheet_id] = (partsCostByJob[pu.job_sheet_id] ?? 0) + pu.quantity * pu.unit_cost
      }
      const profitByJob = (invoices ?? [])
        .filter((inv) => inv.job_sheet_id)
        .map((inv) => ({
          jobNumber: inv.job_sheet_id as string,
          profit: Number(inv.total) - (partsCostByJob[inv.job_sheet_id as string] ?? 0),
        }))

      const customerIds = (jobs ?? []).map((j) => j.customer_id).filter(Boolean) as unknown as string[]
      const counts: Record<string, number> = {}
      for (const cid of customerIds) counts[cid] = (counts[cid] ?? 0) + 1
      const repeatCount = Object.values(counts).filter((c) => c > 1).length
      const repeatCustomerRate = (customers?.length ?? 0) > 0 ? (repeatCount / (customers?.length ?? 1)) * 100 : 0

      setData({
        revenueByModel: Object.entries(revenueByModelMap).map(([model, revenue]) => ({ model, revenue })),
        technicianLeaderboard: Object.values(techMap).map((t) => ({
          name: t.name,
          jobsClosed: t.jobsClosed,
          avgTurnaroundDays: t.jobsClosed ? Math.round((t.totalDays / t.jobsClosed) * 10) / 10 : 0,
        })),
        partsConsumption: Object.entries(partsMap).map(([name, quantity]) => ({ name, quantity })),
        profitByJob,
        repeatCustomerRate: Math.round(repeatCustomerRate * 10) / 10,
      })
    }
    load()
  }, [])

  const totalRevenue = useMemo(() => data?.revenueByModel.reduce((s, r) => s + r.revenue, 0) ?? 0, [data])

  if (!data) return <FullPageSpinner />

  return (
    <div>
      <PageHeader title="Reports" description="Revenue, performance, and inventory insights" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Revenue by Device Model</h2>
            <Button size="sm" variant="secondary" onClick={() => downloadCsv('revenue-by-model.csv', [['Model', 'Revenue'], ...data.revenueByModel.map((r) => [r.model, r.revenue])])}>
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
          </div>
          <p className="mb-2 text-sm text-slate-500">Total: Rs. {totalRevenue.toLocaleString()}</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.revenueByModel}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="model" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v) => `Rs. ${Number(v).toLocaleString()}`} />
              <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Technician Leaderboard</h2>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                downloadCsv('technician-leaderboard.csv', [
                  ['Technician', 'Jobs Closed', 'Avg Turnaround (days)'],
                  ...data.technicianLeaderboard.map((t) => [t.name, t.jobsClosed, t.avgTurnaroundDays]),
                ])
              }
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
          </div>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="pb-2">Technician</th>
                <th className="pb-2">Jobs Closed</th>
                <th className="pb-2">Avg Turnaround</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.technicianLeaderboard
                .sort((a, b) => b.jobsClosed - a.jobsClosed)
                .map((t) => (
                  <tr key={t.name}>
                    <td className="py-2 text-slate-800 dark:text-slate-200">{t.name}</td>
                    <td className="py-2 text-slate-500">{t.jobsClosed}</td>
                    <td className="py-2 text-slate-500">{t.avgTurnaroundDays} days</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Parts Consumption</h2>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => downloadCsv('parts-consumption.csv', [['Part', 'Quantity Used'], ...data.partsConsumption.map((p) => [p.name, p.quantity])])}
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.partsConsumption.map((p) => (
                <tr key={p.name}>
                  <td className="py-2 text-slate-800 dark:text-slate-200">{p.name}</td>
                  <td className="py-2 text-right text-slate-500">{p.quantity} used</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Customer Loyalty</h2>
          <p className="text-3xl font-semibold text-slate-900 dark:text-slate-50">{data.repeatCustomerRate}%</p>
          <p className="text-sm text-slate-500">repeat customer rate</p>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Profit Margin per Job (Invoice − Parts Cost)</h2>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => downloadCsv('profit-by-job.csv', [['Job Sheet ID', 'Profit'], ...data.profitByJob.map((p) => [p.jobNumber, p.profit])])}
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
          </div>
          <p className="text-sm text-slate-500">{data.profitByJob.length} invoiced jobs analyzed. Export CSV for full detail.</p>
        </Card>
      </div>
    </div>
  )
}

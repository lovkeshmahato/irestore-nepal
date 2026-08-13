import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Invoice, InvoiceStatus } from '../../types'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Field'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { FullPageSpinner } from '../../components/ui/Spinner'

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  partially_paid: 'Partially Paid',
  overdue: 'Overdue',
}

export function InvoicesList() {
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState<Invoice[] | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<InvoiceStatus | ''>('')

  async function load() {
    let query = supabase.from('invoices').select('*, customers(*)').order('created_at', { ascending: false })
    if (status) query = query.eq('status', status)
    const { data } = await query
    let filtered = (data ?? []) as Invoice[]
    if (search.trim()) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        (i) => i.invoice_number.toLowerCase().includes(q) || i.customers?.full_name.toLowerCase().includes(q)
      )
    }
    setInvoices(filtered)
  }

  useEffect(() => {
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status])

  if (!invoices) return <FullPageSpinner />

  return (
    <div>
      <PageHeader
        title="Invoices"
        description={`${invoices.length} invoices`}
        actions={
          <Button onClick={() => navigate('/invoices/new')}>
            <Plus className="h-4 w-4" /> New Invoice
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Search invoice #, customer…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatus | '')} className="max-w-xs">
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </div>

      <Card className="overflow-hidden">
        {invoices.length === 0 ? (
          <EmptyState title="No invoices found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Invoice #</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Balance Due</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-4 py-3 font-medium text-primary-600">{inv.invoice_number}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{inv.customers?.full_name}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">Rs. {inv.total.toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">Rs. {inv.balance_due.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={inv.status} kind="invoice" label={STATUS_LABELS[inv.status]} />
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{new Date(inv.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

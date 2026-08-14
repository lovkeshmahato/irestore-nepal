import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Phone, Mail, MapPin, History } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Customer, JobSheet, SellRequest, LegacyServiceRecord } from '../../types'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge, StatusBadge } from '../../components/ui/Badge'
import { FullPageSpinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { JOB_STATUS_LABELS, SELL_REQUEST_STATUS_LABELS } from '../../types'
import { CustomerFormModal } from './CustomerFormModal'

type TimelineItem =
  | { kind: 'job'; date: string; job: JobSheet }
  | { kind: 'legacy'; date: string; record: LegacyServiceRecord }

export function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [jobSheets, setJobSheets] = useState<JobSheet[]>([])
  const [legacyRecords, setLegacyRecords] = useState<LegacyServiceRecord[]>([])
  const [totalSpend, setTotalSpend] = useState(0)
  const [sellRequests, setSellRequests] = useState<SellRequest[]>([])
  const [showEdit, setShowEdit] = useState(false)

  async function load() {
    if (!id) return
    const { data: c } = await supabase.from('customers').select('*').eq('id', id).single()
    const [{ data: jobs }, { data: legacy }, { data: invoices }, { data: sells }] = await Promise.all([
      supabase.from('job_sheets').select('*, devices(*)').eq('customer_id', id).order('created_at', { ascending: false }),
      supabase.from('legacy_service_records').select('*').eq('customer_id', id).order('service_date', { ascending: false }),
      supabase.from('invoices').select('amount_paid').eq('customer_id', id),
      supabase.from('sell_requests').select('*').eq('seller_phone', c?.phone ?? '').order('created_at', { ascending: false }),
    ])
    setCustomer(c)
    setJobSheets((jobs ?? []) as JobSheet[])
    setLegacyRecords((legacy ?? []) as LegacyServiceRecord[])
    setTotalSpend((invoices ?? []).reduce((sum, i) => sum + Number(i.amount_paid), 0))
    setSellRequests((sells ?? []) as SellRequest[])
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!customer) return <FullPageSpinner />

  const timeline: TimelineItem[] = [
    ...jobSheets.map((job): TimelineItem => ({ kind: 'job', date: job.created_at, job })),
    ...legacyRecords.map((record): TimelineItem => ({ kind: 'legacy', date: record.service_date ?? record.created_at, record })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div>
      <button
        onClick={() => navigate('/customers')}
        className="mb-4 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Customers
      </button>

      <PageHeader
        title={customer.full_name}
        description="Customer profile"
        actions={
          <Button variant="secondary" onClick={() => setShowEdit(true)}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Contact Info</h2>
          <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-slate-400" /> {customer.phone}
            </div>
            {customer.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" /> {customer.email}
              </div>
            )}
            {customer.address && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-400" /> {customer.address}
              </div>
            )}
          </div>
          {customer.notes && (
            <>
              <h3 className="mb-1 mt-4 text-xs font-semibold uppercase text-slate-400">Notes</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">{customer.notes}</p>
            </>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <div>
              <p className="text-xs text-slate-400">Total Spend</p>
              <p className="text-lg font-semibold text-success-600">Rs. {totalSpend.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Job Sheets</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">{jobSheets.length}</p>
            </div>
          </div>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Device / Repair History</h2>
            {timeline.length === 0 ? (
              <EmptyState title="No job sheets or history yet" />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {timeline.map((item) =>
                  item.kind === 'job' ? (
                    <button
                      key={`job-${item.job.id}`}
                      onClick={() => navigate(`/job-sheets/${item.job.id}`)}
                      className="flex w-full items-center justify-between py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.job.job_number}</p>
                        <p className="text-xs text-slate-400">
                          {item.job.devices?.model} · {new Date(item.job.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <StatusBadge status={item.job.status} kind="job" label={JOB_STATUS_LABELS[item.job.status]} />
                    </button>
                  ) : (
                    <div key={`legacy-${item.record.id}`} className="flex items-center justify-between py-3">
                      <div>
                        <p className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                          <History className="h-3.5 w-3.5 text-slate-400" />
                          {item.record.device} — {item.record.issue}
                        </p>
                        <p className="text-xs text-slate-400">
                          {item.record.service_date ? new Date(item.record.service_date).toLocaleDateString() : 'Date unknown'}
                          {item.record.notes && ` · ${item.record.notes}`}
                        </p>
                      </div>
                      <Badge tone="neutral">Legacy Record</Badge>
                    </div>
                  )
                )}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Buyback History</h2>
            {sellRequests.length === 0 ? (
              <EmptyState title="No sell requests" />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {sellRequests.map((sr) => (
                  <button
                    key={sr.id}
                    onClick={() => navigate(`/sell-requests/${sr.id}`)}
                    className="flex w-full items-center justify-between py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{sr.request_number}</p>
                      <p className="text-xs text-slate-400">
                        {sr.model} · {new Date(sr.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <StatusBadge status={sr.status} kind="sell_request" label={SELL_REQUEST_STATUS_LABELS[sr.status]} />
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <CustomerFormModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        customer={customer}
        onSaved={() => {
          setShowEdit(false)
          load()
        }}
      />
    </div>
  )
}

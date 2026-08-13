import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { SellRequest, SellRequestStatus } from '../../types'
import { SELL_REQUEST_STATUS_LABELS } from '../../types'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { FullPageSpinner } from '../../components/ui/Spinner'
import { Select } from '../../components/ui/Field'

export function SellRequestsList() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState<SellRequest[] | null>(null)
  const [status, setStatus] = useState<SellRequestStatus | ''>('')

  async function load() {
    let query = supabase.from('sell_requests').select('*').order('created_at', { ascending: false })
    if (status) query = query.eq('status', status)
    const { data } = await query
    setRequests(data ?? [])
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  if (!requests) return <FullPageSpinner />

  return (
    <div>
      <PageHeader title="Sell Requests" description={`${requests.length} buyback requests`} />

      <div className="mb-4 max-w-xs">
        <Select value={status} onChange={(e) => setStatus(e.target.value as SellRequestStatus | '')}>
          <option value="">All statuses</option>
          {Object.entries(SELL_REQUEST_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </div>

      <Card className="overflow-hidden">
        {requests.length === 0 ? (
          <EmptyState title="No sell requests yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Request #</th>
                  <th className="px-4 py-3 font-medium">Seller</th>
                  <th className="px-4 py-3 font-medium">Device</th>
                  <th className="px-4 py-3 font-medium">Offer</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {requests.map((r) => (
                  <tr key={r.id} onClick={() => navigate(`/sell-requests/${r.id}`)} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-medium text-primary-600">{r.request_number}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{r.seller_name}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {r.device_type} {r.model}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{r.offer_price ? `Rs. ${r.offer_price.toLocaleString()}` : '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} kind="sell_request" label={SELL_REQUEST_STATUS_LABELS[r.status]} />
                    </td>
                    <td className="px-4 py-3 text-slate-500">{new Date(r.created_at).toLocaleDateString()}</td>
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

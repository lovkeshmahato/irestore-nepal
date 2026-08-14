import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Inbox } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { SellRequest } from '../../types'
import { SELL_REQUEST_STATUS_LABELS } from '../../types'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'

export function LeadsWidget() {
  const navigate = useNavigate()
  const [leads, setLeads] = useState<SellRequest[] | null>(null)

  async function load() {
    const { data } = await supabase
      .from('sell_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(8)
    setLeads(data ?? [])
  }

  useEffect(() => {
    load()

    const channel = supabase
      .channel('dashboard-leads')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sell_requests' }, () => load())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  if (!leads) return null

  const newCount = leads.filter((l) => l.status === 'new').length

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <Inbox className="h-4 w-4 text-primary-600" /> Leads (Sell Requests)
          {newCount > 0 && (
            <span className="rounded-full bg-primary-600 px-2 py-0.5 text-xs font-semibold text-white">{newCount} new</span>
          )}
        </h2>
        <button onClick={() => navigate('/sell-requests')} className="text-xs font-medium text-primary-600 hover:underline">
          View all
        </button>
      </div>

      {leads.length === 0 ? (
        <p className="text-sm text-slate-400">No buyback leads yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {leads.map((lead) => (
            <button
              key={lead.id}
              onClick={() => navigate(`/sell-requests/${lead.id}`)}
              className="rounded-lg border border-slate-200 p-3 text-left hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">{lead.request_number}</span>
                <StatusBadge status={lead.status} kind="sell_request" label={SELL_REQUEST_STATUS_LABELS[lead.status]} />
              </div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{lead.seller_name}</p>
              <p className="text-xs text-slate-500">
                {lead.device_type} {lead.model} · {lead.seller_phone}
              </p>
            </button>
          ))}
        </div>
      )}
    </Card>
  )
}

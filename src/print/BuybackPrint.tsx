import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { SellRequest } from '../types'
import { FullPageSpinner } from '../components/ui/Spinner'
import { PrintLayout } from './PrintLayout'

interface Payout {
  amount: number
  method: string
  paid_at: string
}

export function BuybackPrint() {
  const { id } = useParams()
  const [request, setRequest] = useState<SellRequest | null>(null)
  const [payout, setPayout] = useState<Payout | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from('sell_requests').select('*').eq('id', id).single(),
      supabase.from('sell_request_payouts').select('*').eq('sell_request_id', id).order('paid_at', { ascending: false }).limit(1).maybeSingle(),
    ]).then(([r, p]) => {
      setRequest(r.data as SellRequest)
      setPayout(p.data)
    })
  }, [id])

  if (!request) return <FullPageSpinner />

  return (
    <PrintLayout title="Buyback Receipt">
      <div className="mb-4 print:text-black">
        <h3 className="text-xl font-bold text-slate-900 print:text-black dark:text-slate-50">{request.request_number}</h3>
        <p className="text-sm text-slate-500 print:text-black">{new Date(request.created_at).toLocaleDateString()}</p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-6 text-sm print:text-black">
        <div>
          <h4 className="mb-1 text-xs font-semibold uppercase text-slate-400 print:text-black">Seller</h4>
          <p className="text-slate-800 print:text-black dark:text-slate-200">{request.seller_name}</p>
          <p className="text-slate-500 print:text-black">{request.seller_phone}</p>
        </div>
        <div>
          <h4 className="mb-1 text-xs font-semibold uppercase text-slate-400 print:text-black">Device</h4>
          <p className="text-slate-800 print:text-black dark:text-slate-200">
            {request.device_type} — {request.model} ({request.color})
          </p>
          <p className="text-slate-500 print:text-black">{request.storage_capacity}</p>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-slate-200 p-4 text-sm print:text-black">
        <p className="mb-1">
          <span className="font-semibold">Agreed Price:</span> Rs. {(payout?.amount ?? request.offer_price ?? 0).toLocaleString()}
        </p>
        <p className="mb-1">
          <span className="font-semibold">Payout Method:</span> {payout?.method?.replace('_', ' ') ?? '—'}
        </p>
        <p>
          <span className="font-semibold">Paid On:</span> {payout ? new Date(payout.paid_at).toLocaleDateString() : '—'}
        </p>
      </div>

      <p className="mt-6 border-t border-slate-200 pt-3 text-xs text-slate-400 print:text-black">
        By signing below, the seller confirms ownership of the device and agrees to the sale terms above.
      </p>
    </PrintLayout>
  )
}

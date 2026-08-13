import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { SellRequest, SellRequestStatus } from '../../types'
import { SELL_REQUEST_STATUS_FLOW, SELL_REQUEST_STATUS_LABELS } from '../../types'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'
import { FullPageSpinner } from '../../components/ui/Spinner'
import { FormRow, Input, Select, TextArea } from '../../components/ui/Field'

const CONDITION_ITEMS = [
  { key: 'powers_on', label: 'Powers on normally' },
  { key: 'screen_intact', label: 'Screen is not cracked' },
  { key: 'battery_healthy', label: 'Battery health is good' },
  { key: 'all_buttons_work', label: 'All buttons work' },
  { key: 'no_water_damage', label: 'No water damage' },
  { key: 'body_intact', label: 'Body/back glass not cracked' },
]

export function SellRequestDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [request, setRequest] = useState<SellRequest | null>(null)
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [offerPrice, setOfferPrice] = useState(0)
  const [offerNotes, setOfferNotes] = useState('')
  const [functionalTest, setFunctionalTest] = useState<Record<string, boolean>>({})
  const [inspectionNotes, setInspectionNotes] = useState('')
  const [payoutAmount, setPayoutAmount] = useState(0)
  const [payoutMethod, setPayoutMethod] = useState('cash')
  const canManage = profile && ['super_admin', 'admin', 'front_desk'].includes(profile.role)

  async function load() {
    if (!id) return
    const { data: r } = await supabase.from('sell_requests').select('*').eq('id', id).single()
    setRequest(r)
    setOfferPrice(r?.offer_price ?? 0)
    setOfferNotes(r?.offer_notes ?? '')

    const { data: photos } = await supabase.from('sell_request_photos').select('*').eq('sell_request_id', id)
    const urls = await Promise.all(
      (photos ?? []).map(async (p) => {
        const { data } = await supabase.storage.from('sell-request-photos').createSignedUrl(p.storage_path, 3600)
        return data?.signedUrl ?? ''
      })
    )
    setPhotoUrls(urls.filter(Boolean))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function updateStatus(status: SellRequestStatus) {
    if (!request) return
    await supabase.from('sell_requests').update({ status }).eq('id', request.id)
    load()
  }

  async function saveOffer() {
    if (!request) return
    await supabase.from('sell_requests').update({ offer_price: offerPrice, offer_notes: offerNotes, status: 'offer_sent' }).eq('id', request.id)
    load()
  }

  const mismatches = CONDITION_ITEMS.filter(
    (item) => !!request?.condition_self_report[item.key] !== !!functionalTest[item.key]
  )

  async function saveInspection() {
    if (!request) return
    await supabase.from('sell_request_inspection').insert({
      sell_request_id: request.id,
      functional_test: functionalTest,
      mismatch_flags: mismatches.map((m) => m.key),
      inspected_by: profile?.id,
      notes: inspectionNotes || null,
    })
    await supabase.from('sell_requests').update({ status: 'inspected' }).eq('id', request.id)
    load()
  }

  async function recordPayout() {
    if (!request) return
    await supabase.from('sell_request_payouts').insert({
      sell_request_id: request.id,
      amount: payoutAmount,
      method: payoutMethod,
      paid_by: profile?.id,
    })
    await supabase.from('sell_requests').update({ status: 'paid_out' }).eq('id', request.id)
    await supabase.from('refurb_items').insert({ sell_request_id: request.id, status: 'in_refurb' })
    load()
  }

  if (!request) return <FullPageSpinner />

  return (
    <div>
      <button onClick={() => navigate('/sell-requests')} className="mb-4 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
        <ArrowLeft className="h-4 w-4" /> Back to Sell Requests
      </button>
      <PageHeader
        title={request.request_number}
        description={`${request.seller_name} · ${request.device_type} ${request.model}`}
        actions={
          <>
            <StatusBadge status={request.status} kind="sell_request" label={SELL_REQUEST_STATUS_LABELS[request.status]} />
            <Button variant="secondary" onClick={() => navigate(`/print/buyback/${request.id}`)}>
              <Printer className="h-4 w-4" /> Print Receipt
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Device Details</h2>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-400">Type</p>
                <p className="text-slate-800 dark:text-slate-200">{request.device_type}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Model</p>
                <p className="text-slate-800 dark:text-slate-200">{request.model}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Color</p>
                <p className="text-slate-800 dark:text-slate-200">{request.color ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Storage</p>
                <p className="text-slate-800 dark:text-slate-200">{request.storage_capacity ?? '—'}</p>
              </div>
            </div>
            {request.additional_details && (
              <>
                <p className="mt-3 text-xs text-slate-400">Additional Details</p>
                <p className="text-sm text-slate-700 dark:text-slate-200">{request.additional_details}</p>
              </>
            )}
            {photoUrls.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {photoUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt="" className="h-20 w-20 rounded-lg border border-slate-200 object-cover dark:border-slate-700" />
                  </a>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Customer's Self-Reported Condition</h2>
            <div className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
              {CONDITION_ITEMS.map((item) => (
                <p key={item.key} className={request.condition_self_report[item.key] ? 'text-success-600' : 'text-slate-400'}>
                  {request.condition_self_report[item.key] ? '✓' : '✗'} {item.label}
                </p>
              ))}
            </div>
          </Card>

          {canManage && ['device_received', 'accepted'].includes(request.status) && (
            <Card className="p-5">
              <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Physical Inspection</h2>
              <div className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
                {CONDITION_ITEMS.map((item) => (
                  <label key={item.key} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={!!functionalTest[item.key]}
                      onChange={(e) => setFunctionalTest((f) => ({ ...f, [item.key]: e.target.checked }))}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    {item.label}
                  </label>
                ))}
              </div>
              {mismatches.length > 0 && (
                <p className="mt-2 text-sm font-medium text-danger-600">
                  ⚠ {mismatches.length} mismatch(es) vs self-report: {mismatches.map((m) => m.label).join(', ')}
                </p>
              )}
              <FormRow label="Inspection notes">
                <TextArea rows={2} value={inspectionNotes} onChange={(e) => setInspectionNotes(e.target.value)} />
              </FormRow>
              <Button size="sm" onClick={saveInspection} className="mt-2">
                Save Inspection
              </Button>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Pipeline</h2>
            <div className="mb-3 flex flex-wrap gap-1">
              {SELL_REQUEST_STATUS_FLOW.map((s) => (
                <span
                  key={s}
                  className={
                    s === request.status
                      ? 'rounded-full bg-primary-600 px-2 py-1 text-xs font-medium text-white'
                      : 'rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-400 dark:bg-slate-800'
                  }
                >
                  {SELL_REQUEST_STATUS_LABELS[s]}
                </span>
              ))}
            </div>
            {canManage && (
              <div className="flex flex-wrap gap-2">
                {request.status === 'new' && (
                  <Button size="sm" onClick={() => updateStatus('under_review')}>
                    Start Review
                  </Button>
                )}
                {request.status === 'under_review' && (
                  <Button size="sm" onClick={() => updateStatus('offer_sent')}>
                    Ready to Offer
                  </Button>
                )}
                {['offer_sent', 'negotiating'].includes(request.status) && (
                  <>
                    <Button size="sm" onClick={() => updateStatus('accepted')}>
                      Accepted
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => updateStatus('negotiating')}>
                      Negotiating
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => updateStatus('rejected')}>
                      Rejected
                    </Button>
                  </>
                )}
                {request.status === 'accepted' && (
                  <Button size="sm" onClick={() => updateStatus('device_received')}>
                    Device Received
                  </Button>
                )}
              </div>
            )}
          </Card>

          {canManage && ['under_review', 'offer_sent', 'negotiating'].includes(request.status) && (
            <Card className="p-5">
              <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Offer</h2>
              <FormRow label="Offer price (Rs.)">
                <Input type="number" value={offerPrice} onChange={(e) => setOfferPrice(Number(e.target.value))} />
              </FormRow>
              <FormRow label="Notes">
                <TextArea rows={2} value={offerNotes} onChange={(e) => setOfferNotes(e.target.value)} />
              </FormRow>
              <Button size="sm" onClick={saveOffer} className="mt-2">
                Send Offer
              </Button>
            </Card>
          )}

          {canManage && request.status === 'inspected' && (
            <Card className="p-5">
              <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Payout</h2>
              <FormRow label="Amount (Rs.)">
                <Input type="number" value={payoutAmount || request.offer_price || 0} onChange={(e) => setPayoutAmount(Number(e.target.value))} />
              </FormRow>
              <FormRow label="Method">
                <Select value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value)}>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="esewa">eSewa</option>
                  <option value="khalti">Khalti</option>
                </Select>
              </FormRow>
              <Button size="sm" onClick={recordPayout} className="mt-2">
                Record Payout
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

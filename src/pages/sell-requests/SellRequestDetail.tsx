import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Printer, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { SellRequest, SellRequestStatus } from '../../types'
import { SELL_REQUEST_STATUS_FLOW, SELL_REQUEST_STATUS_LABELS, DEVICE_ISSUE_OPTIONS } from '../../types'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'
import { FullPageSpinner } from '../../components/ui/Spinner'
import { Modal } from '../../components/ui/Modal'
import { FormRow, Input, Select, TextArea } from '../../components/ui/Field'
import { ChipSelect } from '../../components/ui/ChipSelect'

const CONDITION_ITEMS = [
  { key: 'powers_on', label: 'Powers on normally' },
  { key: 'screen_intact', label: 'Screen is not cracked' },
  { key: 'battery_healthy', label: 'Battery health is good' },
  { key: 'all_buttons_work', label: 'All buttons work' },
  { key: 'no_water_damage', label: 'No water damage' },
  { key: 'body_intact', label: 'Body/back glass not cracked' },
]

const DEVICE_TYPES = ['iPhone', 'iPad', 'MacBook', 'iMac', 'Apple Watch', 'AirPods', 'Other']
const ACCESSORY_OPTIONS = ['Charger', 'Cable', 'Box', 'Case', 'Original Bill', 'Other']

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
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const canManage = profile && ['super_admin', 'admin', 'front_desk'].includes(profile.role)
  const canDelete = profile && ['super_admin', 'admin'].includes(profile.role)

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
            {canManage && (
              <Button variant="secondary" onClick={() => setShowEdit(true)}>
                <Pencil className="h-4 w-4" /> Edit Request
              </Button>
            )}
            {canDelete && (
              <Button variant="danger" onClick={() => setShowDelete(true)}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            )}
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

      <EditSellRequestModal
        request={request}
        open={showEdit}
        onClose={() => setShowEdit(false)}
        onSaved={() => {
          setShowEdit(false)
          load()
        }}
      />
      <DeleteSellRequestModal
        request={showDelete ? request : null}
        onClose={() => setShowDelete(false)}
        onDeleted={() => {
          setShowDelete(false)
          navigate('/sell-requests')
        }}
      />
    </div>
  )
}

function EditSellRequestModal({
  request,
  open,
  onClose,
  onSaved,
}: {
  request: SellRequest | null
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [deviceType, setDeviceType] = useState('iPhone')
  const [model, setModel] = useState('')
  const [color, setColor] = useState('')
  const [storage, setStorage] = useState('')
  const [condition, setCondition] = useState<Record<string, boolean>>({})
  const [accessories, setAccessories] = useState<string[]>([])
  const [deviceIssues, setDeviceIssues] = useState<string[]>([])
  const [issueDetails, setIssueDetails] = useState('')
  const [details, setDetails] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!request || !open) return
    setName(request.seller_name)
    setPhone(request.seller_phone)
    setEmail(request.seller_email ?? '')
    setDeviceType(request.device_type)
    setModel(request.model)
    setColor(request.color ?? '')
    setStorage(request.storage_capacity ?? '')
    setCondition(request.condition_self_report ?? {})
    setAccessories(request.accessories ?? [])
    setDeviceIssues(request.device_issues ?? [])
    setIssueDetails(request.issue_details ?? '')
    setDetails(request.additional_details ?? '')
    setError(null)
  }, [request, open])

  async function handleSubmit() {
    if (!request) return
    if (!name || !phone || !model) {
      setError('Please fill in seller name, phone, and device model.')
      return
    }
    setSaving(true)
    setError(null)
    const { error } = await supabase
      .from('sell_requests')
      .update({
        seller_name: name,
        seller_phone: phone,
        seller_email: email || null,
        device_type: deviceType,
        model,
        color: color || null,
        storage_capacity: storage || null,
        condition_self_report: condition,
        accessories,
        device_issues: deviceIssues,
        issue_details: issueDetails || null,
        additional_details: details || null,
      })
      .eq('id', request.id)
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Sell Request" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormRow label="Seller name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </FormRow>
          <FormRow label="Phone" required>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </FormRow>
        </div>
        <FormRow label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormRow>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormRow label="Device type" required>
            <Select value={deviceType} onChange={(e) => setDeviceType(e.target.value)}>
              {DEVICE_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </FormRow>
          <FormRow label="Model" required>
            <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. iPhone 13 Pro" />
          </FormRow>
          <FormRow label="Color">
            <Input value={color} onChange={(e) => setColor(e.target.value)} />
          </FormRow>
          <FormRow label="Storage">
            <Input value={storage} onChange={(e) => setStorage(e.target.value)} placeholder="e.g. 128GB" />
          </FormRow>
        </div>

        <FormRow label="Condition self-report">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {CONDITION_ITEMS.map((item) => (
              <label key={item.key} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={!!condition[item.key]}
                  onChange={(e) => setCondition((c) => ({ ...c, [item.key]: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-primary-600"
                />
                {item.label}
              </label>
            ))}
          </div>
        </FormRow>

        <FormRow label="Accessories included">
          <ChipSelect options={ACCESSORY_OPTIONS} value={accessories} onChange={setAccessories} />
        </FormRow>

        <FormRow label="Device Issue / Damage Details">
          <ChipSelect options={[...DEVICE_ISSUE_OPTIONS]} value={deviceIssues} onChange={setDeviceIssues} />
        </FormRow>

        <FormRow label="Describe the issue(s)">
          <TextArea rows={2} value={issueDetails} onChange={(e) => setIssueDetails(e.target.value)} />
        </FormRow>

        <FormRow label="Additional details">
          <TextArea rows={3} value={details} onChange={(e) => setDetails(e.target.value)} />
        </FormRow>

        {error && <p className="text-sm text-danger-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function DeleteSellRequestModal({
  request,
  onClose,
  onDeleted,
}: {
  request: SellRequest | null
  onClose: () => void
  onDeleted: () => void
}) {
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setError(null)
  }, [request])

  async function handleConfirm() {
    if (!request) return
    setWorking(true)
    setError(null)

    const [{ count: inspectionCount, error: inspectionError }, { count: payoutCount, error: payoutError }, { count: refurbCount, error: refurbError }] =
      await Promise.all([
        supabase.from('sell_request_inspection').select('id', { count: 'exact', head: true }).eq('sell_request_id', request.id),
        supabase.from('sell_request_payouts').select('id', { count: 'exact', head: true }).eq('sell_request_id', request.id),
        supabase.from('refurb_items').select('id', { count: 'exact', head: true }).eq('sell_request_id', request.id),
      ])

    if (inspectionError || payoutError || refurbError) {
      setWorking(false)
      setError((inspectionError ?? payoutError ?? refurbError)?.message ?? 'Could not check linked records.')
      return
    }

    if ((inspectionCount ?? 0) > 0 || (payoutCount ?? 0) > 0 || (refurbCount ?? 0) > 0) {
      setWorking(false)
      setError('Cannot delete — this request has inspection/payout/refurbishment records on file.')
      return
    }

    const { data: photos } = await supabase.from('sell_request_photos').select('id, storage_path').eq('sell_request_id', request.id)
    if (photos && photos.length > 0) {
      try {
        const paths = photos.map((p) => p.storage_path).filter(Boolean)
        if (paths.length > 0) await supabase.storage.from('sell-request-photos').remove(paths)
      } catch {
        // best-effort only — storage cleanup failures should not block deletion
      }
      await supabase.from('sell_request_photos').delete().eq('sell_request_id', request.id)
    }

    const { error } = await supabase.from('sell_requests').delete().eq('id', request.id)
    setWorking(false)
    if (error) {
      setError(error.message)
      return
    }
    onDeleted()
  }

  return (
    <Modal open={!!request} onClose={onClose} title="Delete Sell Request" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          This will permanently delete this sell request{request ? ` (${request.request_number})` : ''} and its photos. This
          action cannot be undone.
        </p>
        {error && <p className="text-sm text-danger-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={handleConfirm} disabled={working}>
            {working ? 'Deleting…' : 'Delete Request'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

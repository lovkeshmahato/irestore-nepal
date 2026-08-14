import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { SellRequest, SellRequestStatus } from '../../types'
import { SELL_REQUEST_STATUS_LABELS, DEVICE_ISSUE_OPTIONS } from '../../types'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { FullPageSpinner } from '../../components/ui/Spinner'
import { Modal } from '../../components/ui/Modal'
import { FormRow, Input, Select, TextArea } from '../../components/ui/Field'
import { ChipSelect } from '../../components/ui/ChipSelect'

const DEVICE_TYPES = ['iPhone', 'iPad', 'MacBook', 'iMac', 'Apple Watch', 'AirPods', 'Other']
const ACCESSORY_OPTIONS = ['Charger', 'Cable', 'Box', 'Case', 'Original Bill', 'Other']
const CONDITION_ITEMS = [
  { key: 'powers_on', label: 'Powers on normally' },
  { key: 'screen_intact', label: 'Screen is not cracked' },
  { key: 'battery_healthy', label: 'Battery health is good' },
  { key: 'all_buttons_work', label: 'All buttons work' },
  { key: 'no_water_damage', label: 'No water damage' },
  { key: 'body_intact', label: 'Body/back glass not cracked' },
]

export function SellRequestsList() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [requests, setRequests] = useState<SellRequest[] | null>(null)
  const [status, setStatus] = useState<SellRequestStatus | ''>('')
  const [showForm, setShowForm] = useState(false)
  const canCreate = profile && ['super_admin', 'admin', 'front_desk'].includes(profile.role)

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
      <PageHeader
        title="Sell Requests"
        description={`${requests.length} buyback requests`}
        actions={
          canCreate && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> New Sell Request
            </Button>
          )
        }
      />

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

      <NewSellRequestModal
        open={showForm}
        onClose={() => setShowForm(false)}
        onSaved={() => {
          setShowForm(false)
          load()
        }}
      />
    </div>
  )
}

function NewSellRequestModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
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

  function reset() {
    setName('')
    setPhone('')
    setEmail('')
    setDeviceType('iPhone')
    setModel('')
    setColor('')
    setStorage('')
    setCondition({})
    setAccessories([])
    setDeviceIssues([])
    setIssueDetails('')
    setDetails('')
    setError(null)
  }

  async function handleSubmit() {
    if (!name || !phone || !model) {
      setError('Please fill in seller name, phone, and device model.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const { data: reqNumber, error: numError } = await supabase.rpc('next_sell_request_number')
      if (numError) throw numError

      const { error: reqError } = await supabase.from('sell_requests').insert({
        id: crypto.randomUUID(),
        request_number: reqNumber,
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
        status: 'new',
      })
      if (reqError) throw reqError

      reset()
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Sell Request" size="lg">
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
            {saving ? 'Creating…' : 'Create Request'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

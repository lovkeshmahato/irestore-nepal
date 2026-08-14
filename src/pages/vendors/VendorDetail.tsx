import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, PackageCheck, Wallet } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { Part, PurchaseOrder, Vendor, VendorPayment } from '../../types'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { FullPageSpinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { FormRow, Input, Select, TextArea } from '../../components/ui/Field'

const PAYMENT_METHODS = ['cash', 'bank_transfer', 'card', 'esewa', 'khalti', 'other']
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  card: 'Card',
  esewa: 'eSewa',
  khalti: 'Khalti',
  other: 'Other',
}

export function VendorDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [pos, setPos] = useState<PurchaseOrder[]>([])
  const [payments, setPayments] = useState<VendorPayment[]>([])
  const [showPO, setShowPO] = useState(false)
  const [showPayment, setShowPayment] = useState(false)

  async function load() {
    if (!id) return
    const [{ data: v }, { data: p }, { data: pay }] = await Promise.all([
      supabase.from('vendors').select('*').eq('id', id).single(),
      supabase.from('purchase_orders').select('*').eq('vendor_id', id).order('created_at', { ascending: false }),
      supabase
        .from('vendor_payments')
        .select('*, purchase_orders(po_number)')
        .eq('vendor_id', id)
        .order('payment_date', { ascending: false }),
    ])
    setVendor(v)
    setPos(p ?? [])
    setPayments((pay ?? []) as unknown as VendorPayment[])
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function receivePO(poId: string) {
    await supabase.rpc('receive_purchase_order', { p_po_id: poId })
    load()
  }

  if (!vendor) return <FullPageSpinner />

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
  const totalOutstanding = pos
    .filter((po) => po.status !== 'cancelled')
    .reduce((sum, po) => sum + Math.max(po.total_amount - po.amount_paid, 0), 0)
  const advanceBalance = payments
    .filter((p) => p.is_advance && !p.po_id)
    .reduce((sum, p) => sum + p.amount, 0)

  return (
    <div>
      <button onClick={() => navigate('/vendors')} className="mb-4 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
        <ArrowLeft className="h-4 w-4" /> Back to Vendors
      </button>
      <PageHeader
        title={vendor.name}
        description={vendor.contact_person ?? undefined}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowPayment(true)}>
              <Wallet className="h-4 w-4" /> Log Payment
            </Button>
            <Button onClick={() => setShowPO(true)}>
              <Plus className="h-4 w-4" /> New Purchase Order
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase text-slate-400">Total Paid</p>
          <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">Rs. {totalPaid.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase text-slate-400">Total Outstanding</p>
          <p className={`mt-1 text-xl font-semibold ${totalOutstanding > 0 ? 'text-danger-600' : 'text-slate-900 dark:text-slate-50'}`}>
            Rs. {totalOutstanding.toLocaleString()}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase text-slate-400">Advance Balance</p>
          <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">Rs. {advanceBalance.toLocaleString()}</p>
        </Card>
      </div>

      <Card className="mb-6 p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Purchase Orders</h2>
        {pos.length === 0 ? (
          <EmptyState title="No purchase orders yet" />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {pos.map((po) => (
              <div key={po.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{po.po_number}</p>
                  <p className="text-xs text-slate-400">Rs. {po.total_amount.toLocaleString()} · {po.payment_status}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={po.status === 'received' ? 'success' : po.status === 'cancelled' ? 'danger' : 'warning'}>{po.status}</Badge>
                  {po.status !== 'received' && po.status !== 'cancelled' && (
                    <Button size="sm" variant="secondary" onClick={() => receivePO(po.id)}>
                      <PackageCheck className="h-3.5 w-3.5" /> Mark Received
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Payments</h2>
        {payments.length === 0 ? (
          <EmptyState title="No payments logged yet" />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Rs. {p.amount.toLocaleString()} · {PAYMENT_METHOD_LABELS[p.method] ?? p.method}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(p.payment_date).toLocaleDateString()}
                    {p.purchase_orders?.po_number ? ` · ${p.purchase_orders.po_number}` : ''}
                    {p.notes ? ` · ${p.notes}` : ''}
                  </p>
                </div>
                <Badge tone={p.is_advance ? 'warning' : 'neutral'}>{p.is_advance ? 'Advance' : 'Regular'}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      <NewPOModal
        open={showPO}
        onClose={() => setShowPO(false)}
        vendorId={vendor.id}
        onSaved={() => {
          setShowPO(false)
          load()
        }}
      />

      <LogPaymentModal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        vendorId={vendor.id}
        purchaseOrders={pos}
        onSaved={() => {
          setShowPayment(false)
          load()
        }}
      />
    </div>
  )
}

function LogPaymentModal({
  open,
  onClose,
  vendorId,
  purchaseOrders,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  vendorId: string
  purchaseOrders: PurchaseOrder[]
  onSaved: () => void
}) {
  const { profile } = useAuth()
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [amount, setAmount] = useState(0)
  const [method, setMethod] = useState('cash')
  const [isAdvance, setIsAdvance] = useState(false)
  const [poId, setPoId] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setPaymentDate(new Date().toISOString().slice(0, 10))
    setAmount(0)
    setMethod('cash')
    setIsAdvance(false)
    setPoId('')
    setNotes('')
    setError(null)
  }, [open])

  async function handleSubmit() {
    if (amount <= 0) {
      setError('Enter an amount greater than zero.')
      return
    }
    setSaving(true)
    setError(null)
    const { error } = await supabase.from('vendor_payments').insert({
      vendor_id: vendorId,
      po_id: poId || null,
      amount,
      method,
      is_advance: isAdvance,
      payment_date: paymentDate,
      notes: notes || null,
      created_by: profile?.id,
    })
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title="Log Payment">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormRow label="Date" required>
            <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          </FormRow>
          <FormRow label="Amount" required>
            <Input type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          </FormRow>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormRow label="Method">
            <Select value={method} onChange={(e) => setMethod(e.target.value)}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_METHOD_LABELS[m]}
                </option>
              ))}
            </Select>
          </FormRow>
          <FormRow label="Linked Purchase Order">
            <Select value={poId} onChange={(e) => setPoId(e.target.value)}>
              <option value="">None</option>
              {purchaseOrders.map((po) => (
                <option key={po.id} value={po.id}>
                  {po.po_number}
                </option>
              ))}
            </Select>
          </FormRow>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={isAdvance}
            onChange={(e) => setIsAdvance(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-primary-600"
          />
          Advance payment
        </label>
        <FormRow label="Notes">
          <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormRow>
        {error && <p className="text-sm text-danger-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : 'Log Payment'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

interface DraftItem {
  part_id: string
  quantity: number
  unit_cost: number
}

function NewPOModal({
  open,
  onClose,
  vendorId,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  vendorId: string
  onSaved: () => void
}) {
  const { profile } = useAuth()
  const [parts, setParts] = useState<Part[]>([])
  const [items, setItems] = useState<DraftItem[]>([{ part_id: '', quantity: 1, unit_cost: 0 }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    supabase.from('parts').select('*').order('name').then(({ data }) => setParts(data ?? []))
  }, [open])

  function updateItem(i: number, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
  }

  const total = items.reduce((s, i) => s + i.quantity * i.unit_cost, 0)

  async function handleSubmit() {
    const validItems = items.filter((i) => i.part_id)
    if (validItems.length === 0) {
      setError('Add at least one part.')
      return
    }
    setSaving(true)
    setError(null)
    const { data: poNumber, error: numError } = await supabase.rpc('next_po_number')
    if (numError) {
      setError(numError.message)
      setSaving(false)
      return
    }
    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .insert({ po_number: poNumber, vendor_id: vendorId, status: 'ordered', total_amount: total, created_by: profile?.id })
      .select()
      .single()
    if (poError) {
      setError(poError.message)
      setSaving(false)
      return
    }
    await supabase.from('po_items').insert(validItems.map((i) => ({ po_id: po.id, part_id: i.part_id, quantity: i.quantity, unit_cost: i.unit_cost })))
    setSaving(false)
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title="New Purchase Order" size="lg">
      <div className="space-y-4">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <Select className="flex-1" value={item.part_id} onChange={(e) => updateItem(i, { part_id: e.target.value })}>
              <option value="">Select part…</option>
              {parts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            <Input type="number" className="w-24" min={1} value={item.quantity} onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })} />
            <Input type="number" className="w-28" value={item.unit_cost} onChange={(e) => updateItem(i, { unit_cost: Number(e.target.value) })} />
          </div>
        ))}
        <button
          type="button"
          onClick={() => setItems((prev) => [...prev, { part_id: '', quantity: 1, unit_cost: 0 }])}
          className="text-sm font-medium text-primary-600 hover:underline"
        >
          + Add another item
        </button>
        <FormRow label="Total">
          <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">Rs. {total.toLocaleString()}</p>
        </FormRow>
        {error && <p className="text-sm text-danger-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Creating…' : 'Create PO'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

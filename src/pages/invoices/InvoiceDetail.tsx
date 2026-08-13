import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Printer, Plus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { Invoice, InvoiceItem, Payment, CreditNote } from '../../types'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'
import { FullPageSpinner } from '../../components/ui/Spinner'
import { Modal } from '../../components/ui/Modal'
import { FormRow, Input, Select, TextArea } from '../../components/ui/Field'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  partially_paid: 'Partially Paid',
  overdue: 'Overdue',
}

const PAYMENT_METHODS = ['cash', 'esewa', 'khalti', 'bank_transfer', 'card']

export function InvoiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([])
  const [showPayment, setShowPayment] = useState(false)
  const [showCredit, setShowCredit] = useState(false)

  async function load() {
    if (!id) return
    const [{ data: inv }, { data: its }, { data: pays }, { data: credits }] = await Promise.all([
      supabase.from('invoices').select('*, customers(*)').eq('id', id).single(),
      supabase.from('invoice_items').select('*').eq('invoice_id', id),
      supabase.from('payments').select('*').eq('invoice_id', id).order('paid_at', { ascending: false }),
      supabase.from('credit_notes').select('*').eq('invoice_id', id).order('created_at', { ascending: false }),
    ])
    setInvoice(inv as Invoice)
    setItems(its ?? [])
    setPayments(pays ?? [])
    setCreditNotes(credits ?? [])
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!invoice) return <FullPageSpinner />

  return (
    <div>
      <button
        onClick={() => navigate('/invoices')}
        className="mb-4 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Invoices
      </button>

      <PageHeader
        title={invoice.invoice_number}
        description={invoice.customers?.full_name}
        actions={
          <>
            <StatusBadge status={invoice.status} kind="invoice" label={STATUS_LABELS[invoice.status]} />
            <Button variant="secondary" onClick={() => navigate(`/print/invoice/${invoice.id}`)}>
              <Printer className="h-4 w-4" /> Print
            </Button>
            {invoice.balance_due > 0 && (
              <Button onClick={() => setShowPayment(true)}>
                <Plus className="h-4 w-4" /> Record Payment
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Line Items</h2>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-400">
                <tr>
                  <th className="pb-2">Description</th>
                  <th className="pb-2">Qty</th>
                  <th className="pb-2">Unit Price</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2 text-slate-800 dark:text-slate-200">{item.description}</td>
                    <td className="py-2 text-slate-500">{item.quantity}</td>
                    <td className="py-2 text-slate-500">Rs. {item.unit_price.toLocaleString()}</td>
                    <td className="py-2 text-right text-slate-800 dark:text-slate-200">Rs. {item.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span>Rs. {invoice.subtotal.toLocaleString()}</span>
              </div>
              {invoice.vat_enabled && (
                <div className="flex justify-between">
                  <span className="text-slate-500">VAT ({invoice.vat_rate}%)</span>
                  <span>Rs. {invoice.vat_amount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold text-slate-900 dark:text-slate-50">
                <span>Total</span>
                <span>Rs. {invoice.total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-success-600">
                <span>Paid</span>
                <span>Rs. {invoice.amount_paid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold text-danger-600">
                <span>Balance Due</span>
                <span>Rs. {invoice.balance_due.toLocaleString()}</span>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Payment History</h2>
            {payments.length === 0 ? (
              <p className="text-sm text-slate-400">No payments recorded yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <p className="text-slate-800 dark:text-slate-200">Rs. {p.amount.toLocaleString()} · {p.method.replace('_', ' ')}</p>
                      <p className="text-xs text-slate-400">{new Date(p.paid_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Tax Info</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">PAN/VAT: {invoice.pan_vat_number ?? '—'}</p>
          </Card>

          {profile && ['super_admin', 'admin', 'accountant'].includes(profile.role) && (
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Credit Notes</h2>
                <Button size="sm" variant="secondary" onClick={() => setShowCredit(true)}>
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </div>
              {creditNotes.length === 0 ? (
                <p className="text-sm text-slate-400">None issued.</p>
              ) : (
                <div className="space-y-2">
                  {creditNotes.map((c) => (
                    <div key={c.id} className="text-sm">
                      <p className="text-slate-800 dark:text-slate-200">Rs. {c.amount.toLocaleString()}</p>
                      <p className="text-xs text-slate-400">{c.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      <RecordPaymentModal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        invoiceId={invoice.id}
        maxAmount={invoice.balance_due}
        onSaved={() => {
          setShowPayment(false)
          load()
        }}
      />
      <CreditNoteModal
        open={showCredit}
        onClose={() => setShowCredit(false)}
        invoiceId={invoice.id}
        onSaved={() => {
          setShowCredit(false)
          load()
        }}
      />
    </div>
  )
}

function RecordPaymentModal({
  open,
  onClose,
  invoiceId,
  maxAmount,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  invoiceId: string
  maxAmount: number
  onSaved: () => void
}) {
  const { profile } = useAuth()
  const [amount, setAmount] = useState(maxAmount)
  const [method, setMethod] = useState('cash')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => setAmount(maxAmount), [maxAmount, open])

  async function handleSubmit() {
    setSaving(true)
    await supabase.from('payments').insert({
      invoice_id: invoiceId,
      amount,
      method,
      reference_note: note || null,
      received_by: profile?.id,
    })
    setSaving(false)
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title="Record Payment">
      <div className="space-y-4">
        <FormRow label="Amount" required>
          <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} max={maxAmount} />
        </FormRow>
        <FormRow label="Method" required>
          <Select value={method} onChange={(e) => setMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m.replace('_', ' ')}
              </option>
            ))}
          </Select>
        </FormRow>
        <FormRow label="Reference / Note">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Transaction ID, cheque no…" />
        </FormRow>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saving || amount <= 0}>
            {saving ? 'Saving…' : 'Record Payment'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function CreditNoteModal({
  open,
  onClose,
  invoiceId,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  invoiceId: string
  onSaved: () => void
}) {
  const { profile } = useAuth()
  const [amount, setAmount] = useState(0)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!reason.trim() || amount <= 0) return
    setSaving(true)
    await supabase.from('credit_notes').insert({ invoice_id: invoiceId, amount, reason, created_by: profile?.id })
    setSaving(false)
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Credit Note">
      <div className="space-y-4">
        <FormRow label="Amount" required>
          <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        </FormRow>
        <FormRow label="Reason" required>
          <TextArea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </FormRow>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : 'Add Credit Note'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

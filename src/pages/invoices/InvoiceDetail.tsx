import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Printer, Plus, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { Invoice, Payment, CreditNote } from '../../types'
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
  const [payments, setPayments] = useState<Payment[]>([])
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([])
  const [showPayment, setShowPayment] = useState(false)
  const [showCredit, setShowCredit] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  const canEdit = profile && ['super_admin', 'admin', 'front_desk', 'accountant'].includes(profile.role)
  const canDelete = profile?.role === 'super_admin'

  async function load() {
    if (!id) return
    const [{ data: inv }, { data: pays }, { data: credits }] = await Promise.all([
      supabase.from('invoices').select('*, customers(*), job_sheets(job_number)').eq('id', id).single(),
      supabase.from('payments').select('*').eq('invoice_id', id).order('paid_at', { ascending: false }),
      supabase.from('credit_notes').select('*').eq('invoice_id', id).order('created_at', { ascending: false }),
    ])
    setInvoice(inv as Invoice)
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
            {canEdit && (
              <Button variant="secondary" onClick={() => setShowEdit(true)}>
                <Pencil className="h-4 w-4" /> Edit
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
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Charges</h2>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Repair Charge</span>
                <span className="text-slate-800 dark:text-slate-200">Rs. {invoice.repair_charge.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Parts Cost</span>
                <span className="text-slate-800 dark:text-slate-200">Rs. {invoice.parts_cost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Labour Charge</span>
                <span className="text-slate-800 dark:text-slate-200">Rs. {invoice.labour_charge.toLocaleString()}</span>
              </div>
            </div>
            <div className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span>Rs. {invoice.subtotal.toLocaleString()}</span>
              </div>
              {invoice.discount_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">
                    Discount ({invoice.discount_type === 'percent' ? `${invoice.discount_value}%` : 'fixed'})
                  </span>
                  <span className="text-danger-600">-Rs. {invoice.discount_amount.toLocaleString()}</span>
                </div>
              )}
              {invoice.vat_enabled && (
                <div className="flex justify-between">
                  <span className="text-slate-500">VAT ({invoice.vat_rate}%)</span>
                  <span>Rs. {invoice.vat_amount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold text-primary-600">
                <span>Grand Total</span>
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
            {invoice.notes && (
              <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                <p className="text-xs text-slate-400">Notes</p>
                <p className="text-sm text-slate-700 dark:text-slate-200">{invoice.notes}</p>
              </div>
            )}
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
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Details</h2>
            <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
              <p>PAN/VAT: {invoice.pan_vat_number ?? '—'}</p>
              {invoice.job_sheets?.job_number && (
                <button onClick={() => navigate(`/job-sheets/${invoice.job_sheet_id}`)} className="text-primary-600 hover:underline">
                  Job Sheet: {invoice.job_sheets.job_number}
                </button>
              )}
              {invoice.payment_method && <p className="capitalize">Payment Method: {invoice.payment_method.replace('_', ' ')}</p>}
            </div>
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
      <EditInvoiceModal
        open={showEdit}
        invoice={invoice}
        onClose={() => setShowEdit(false)}
        onSaved={() => {
          setShowEdit(false)
          load()
        }}
      />
      <DeleteInvoiceModal
        open={showDelete}
        invoice={invoice}
        onClose={() => setShowDelete(false)}
        onDeleted={() => navigate('/invoices')}
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

function clampNonNegative(v: number) {
  return Number.isFinite(v) && v >= 0 ? v : 0
}

function formatNpr(value: number) {
  return `NPR ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function EditInvoiceModal({
  open,
  invoice,
  onClose,
  onSaved,
}: {
  open: boolean
  invoice: Invoice
  onClose: () => void
  onSaved: () => void
}) {
  const [repairCharge, setRepairCharge] = useState(0)
  const [partsCost, setPartsCost] = useState(0)
  const [labourCharge, setLabourCharge] = useState(0)
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed')
  const [discountValue, setDiscountValue] = useState(0)
  const [taxRate, setTaxRate] = useState(13)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [notes, setNotes] = useState('')
  const [showVat, setShowVat] = useState(true)
  const [showLogo, setShowLogo] = useState(true)
  const [showAddress, setShowAddress] = useState(true)
  const [showPhone, setShowPhone] = useState(true)
  const [showEmail, setShowEmail] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setRepairCharge(invoice.repair_charge)
    setPartsCost(invoice.parts_cost)
    setLabourCharge(invoice.labour_charge)
    setDiscountType(invoice.discount_type)
    setDiscountValue(invoice.discount_value)
    setTaxRate(invoice.vat_rate)
    setPaymentMethod(invoice.payment_method ?? 'cash')
    setNotes(invoice.notes ?? '')
    setShowVat(invoice.doc_show_vat)
    setShowLogo(invoice.doc_show_logo)
    setShowAddress(invoice.doc_show_address)
    setShowPhone(invoice.doc_show_phone)
    setShowEmail(invoice.doc_show_email)
    setError(null)
  }, [open, invoice])

  function handleDiscountValueChange(v: number) {
    const nonNeg = clampNonNegative(v)
    setDiscountValue(discountType === 'percent' ? Math.min(nonNeg, 100) : nonNeg)
  }

  const subtotal = repairCharge + partsCost + labourCharge
  const rawDiscount = discountType === 'fixed' ? discountValue : (subtotal * discountValue) / 100
  const discount = Math.min(Math.max(rawDiscount, 0), subtotal)
  const taxableAmount = Math.max(subtotal - discount, 0)
  const vat = (taxableAmount * taxRate) / 100
  const grandTotal = Math.max(taxableAmount + vat, 0)
  const willBeOverpaid = invoice.amount_paid > grandTotal

  async function handleSubmit() {
    if (subtotal <= 0) {
      setError('Enter at least one charge greater than zero.')
      return
    }
    setSaving(true)
    setError(null)
    const newBalanceDue = Math.max(grandTotal - invoice.amount_paid, 0)
    const { error } = await supabase
      .from('invoices')
      .update({
        repair_charge: repairCharge,
        parts_cost: partsCost,
        labour_charge: labourCharge,
        discount_type: discountType,
        discount_value: discountValue,
        discount_amount: discount,
        vat_rate: taxRate,
        subtotal,
        vat_amount: vat,
        total: grandTotal,
        balance_due: newBalanceDue,
        payment_method: paymentMethod,
        notes: notes || null,
        doc_show_vat: showVat,
        doc_show_logo: showLogo,
        doc_show_address: showAddress,
        doc_show_phone: showPhone,
        doc_show_email: showEmail,
      })
      .eq('id', invoice.id)
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Invoice" size="xl">
      <div className="space-y-6">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Charges</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormRow label="Repair Charge (NPR)">
              <Input type="number" min={0} value={repairCharge} onChange={(e) => setRepairCharge(clampNonNegative(Number(e.target.value)))} />
            </FormRow>
            <FormRow label="Parts Cost (NPR)">
              <Input type="number" min={0} value={partsCost} onChange={(e) => setPartsCost(clampNonNegative(Number(e.target.value)))} />
            </FormRow>
            <FormRow label="Labour Charge (NPR)">
              <Input type="number" min={0} value={labourCharge} onChange={(e) => setLabourCharge(clampNonNegative(Number(e.target.value)))} />
            </FormRow>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Discount & Tax</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormRow label="Discount Type">
              <Select
                value={discountType}
                onChange={(e) => {
                  setDiscountType(e.target.value as 'fixed' | 'percent')
                  setDiscountValue(0)
                }}
              >
                <option value="fixed">Fixed (NPR)</option>
                <option value="percent">Percent (%)</option>
              </Select>
            </FormRow>
            <FormRow label="Discount Value">
              <Input
                type="number"
                min={0}
                max={discountType === 'percent' ? 100 : undefined}
                value={discountValue}
                onChange={(e) => handleDiscountValueChange(Number(e.target.value))}
              />
            </FormRow>
            <FormRow label="Tax Rate (%)">
              <Input type="number" min={0} value={taxRate} onChange={(e) => setTaxRate(clampNonNegative(Number(e.target.value)))} />
            </FormRow>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Payment Method</h3>
          <FormRow label="Payment Method">
            <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m.replace('_', ' ')}
                </option>
              ))}
            </Select>
          </FormRow>
        </div>

        <FormRow label="Notes">
          <TextArea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormRow>

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Show on Document</h3>
          <div className="flex flex-wrap gap-4">
            {[
              { label: 'VAT', checked: showVat, set: setShowVat },
              { label: 'Logo', checked: showLogo, set: setShowLogo },
              { label: 'Address', checked: showAddress, set: setShowAddress },
              { label: 'Phone', checked: showPhone, set: setShowPhone },
              { label: 'Email', checked: showEmail, set: setShowEmail },
            ].map((item) => (
              <label
                key={item.label}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={(e) => item.set(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-primary-600"
                />
                {item.label}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-1.5 rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-800/50">
          <div className="flex justify-between">
            <span className="text-slate-500">Subtotal</span>
            <span className="text-slate-800 dark:text-slate-200">{formatNpr(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-500">Discount</span>
              <span className="text-danger-600">-{formatNpr(discount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500">VAT ({taxRate}%)</span>
            <span className="text-slate-800 dark:text-slate-200">{formatNpr(vat)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-primary-600 dark:border-slate-700">
            <span>Grand Total</span>
            <span>{formatNpr(grandTotal)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Already Paid</span>
            <span>{formatNpr(invoice.amount_paid)}</span>
          </div>
        </div>

        {willBeOverpaid && (
          <p className="text-sm text-warning-600">
            New total is less than amount already paid; the invoice will show as overpaid.
          </p>
        )}
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

function DeleteInvoiceModal({
  open,
  invoice,
  onClose,
  onDeleted,
}: {
  open: boolean
  invoice: Invoice
  onClose: () => void
  onDeleted: () => void
}) {
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [blocked, setBlocked] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setBlocked(null)
  }, [open])

  async function handleConfirm() {
    setWorking(true)
    setError(null)
    setBlocked(null)

    const { data: pays, error: payError } = await supabase.from('payments').select('amount').eq('invoice_id', invoice.id)
    if (payError) {
      setWorking(false)
      setError(payError.message)
      return
    }

    const totalPaid = (pays ?? []).reduce((sum, p) => sum + p.amount, 0)
    if (totalPaid > 0) {
      setWorking(false)
      setBlocked(
        `Cannot delete — NPR ${totalPaid.toLocaleString()} has been recorded as paid against this invoice. This financial record should not be removed; consider a credit note or contact an administrator.`
      )
      return
    }

    const { error } = await supabase.from('invoices').delete().eq('id', invoice.id)
    setWorking(false)
    if (error) {
      setError(error.message)
      return
    }
    onDeleted()
  }

  return (
    <Modal open={open} onClose={onClose} title="Delete Invoice" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          This will <span className="font-semibold text-danger-600">permanently delete</span> invoice{' '}
          <span className="font-semibold">{invoice.invoice_number}</span>. This is only allowed when no payments have been
          recorded against it. This action cannot be undone.
        </p>
        {error && <p className="text-sm text-danger-600">{error}</p>}
        {blocked && <p className="text-sm text-danger-600">{blocked}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={handleConfirm} disabled={working || !!blocked}>
            {working ? 'Deleting…' : 'Delete Permanently'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { Customer, Settings } from '../../types'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
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

function formatNpr(value: number) {
  return `NPR ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

interface JobSheetOption {
  id: string
  job_number: string
  customer_id: string
  estimated_cost: number | null
  customers?: { full_name: string }
}

export function InvoiceNew() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [params] = useSearchParams()
  const preselectedJobSheetId = params.get('jobSheetId')

  const [jobSheets, setJobSheets] = useState<JobSheetOption[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)

  const [jobSheetId, setJobSheetId] = useState('')
  const [customerId, setCustomerId] = useState('')

  const [repairCharge, setRepairCharge] = useState(0)
  const [partsCost, setPartsCost] = useState(0)
  const [labourCharge, setLabourCharge] = useState(0)

  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed')
  const [discountValue, setDiscountValue] = useState(0)
  const [taxRate, setTaxRate] = useState(13)

  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [amountPaid, setAmountPaid] = useState(0)

  const [notes, setNotes] = useState('')

  const [showVat, setShowVat] = useState(true)
  const [showLogo, setShowLogo] = useState(true)
  const [showAddress, setShowAddress] = useState(true)
  const [showPhone, setShowPhone] = useState(true)
  const [showEmail, setShowEmail] = useState(true)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('job_sheets')
      .select('id, job_number, customer_id, estimated_cost, customers(full_name)')
      .order('created_at', { ascending: false })
      .limit(150)
      .then(({ data }) => setJobSheets((data ?? []) as unknown as JobSheetOption[]))
    supabase
      .from('customers')
      .select('*')
      .is('merged_into', null)
      .order('full_name')
      .then(({ data }) => setCustomers(data ?? []))
    supabase
      .from('settings')
      .select('*')
      .limit(1)
      .single()
      .then(({ data }) => setSettings(data as Settings))
  }, [])

  // Preselect job sheet from query param (e.g. "Generate Invoice" from a job sheet detail page)
  useEffect(() => {
    if (preselectedJobSheetId) setJobSheetId(preselectedJobSheetId)
  }, [preselectedJobSheetId])

  // Selecting a job sheet auto-populates customer + known estimate values.
  useEffect(() => {
    if (!jobSheetId) return
    const job = jobSheets.find((j) => j.id === jobSheetId)
    if (!job) return
    setCustomerId(job.customer_id)

    supabase
      .from('job_parts_used')
      .select('quantity, unit_price')
      .eq('job_sheet_id', jobSheetId)
      .then(({ data }) => {
        const partsTotal = (data ?? []).reduce((sum, p) => sum + p.quantity * p.unit_price, 0)
        setPartsCost(partsTotal)
        setRepairCharge(Math.max((job.estimated_cost ?? 0) - partsTotal, 0))
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobSheetId, jobSheets])

  const subtotal = repairCharge + partsCost + labourCharge
  const rawDiscount = discountType === 'fixed' ? discountValue : (subtotal * discountValue) / 100
  const discount = Math.min(Math.max(rawDiscount, 0), subtotal)
  const taxableAmount = Math.max(subtotal - discount, 0)
  const vat = (taxableAmount * taxRate) / 100
  const grandTotal = Math.max(taxableAmount + vat, 0)

  const paymentStatus = amountPaid <= 0 ? 'Unpaid' : amountPaid >= grandTotal ? 'Paid' : 'Partial'
  const remainingBalance = Math.max(grandTotal - amountPaid, 0)

  function clampNonNegative(v: number) {
    return Number.isFinite(v) && v >= 0 ? v : 0
  }

  function handleAmountPaidChange(v: number) {
    // TODO: overpayment handling (e.g. auto-create a credit note) is not implemented yet —
    // for now amount paid is hard-capped at the grand total.
    setAmountPaid(Math.min(clampNonNegative(v), grandTotal))
  }

  function handleDiscountValueChange(v: number) {
    const nonNeg = clampNonNegative(v)
    setDiscountValue(discountType === 'percent' ? Math.min(nonNeg, 100) : nonNeg)
  }

  async function handleSubmit() {
    if (!customerId) {
      setError('Select a customer.')
      return
    }
    if (subtotal <= 0) {
      setError('Enter at least one charge greater than zero.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const { data: invoiceNumber, error: numError } = await supabase.rpc('next_invoice_number')
      if (numError) throw numError

      const { data: invoice, error: invError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          customer_id: customerId,
          job_sheet_id: jobSheetId || null,
          pan_vat_number: settings?.pan_vat_number ?? null,
          vat_enabled: true,
          vat_rate: taxRate,
          subtotal,
          vat_amount: vat,
          total: grandTotal,
          status: 'sent',
          notes: notes || null,
          repair_charge: repairCharge,
          parts_cost: partsCost,
          labour_charge: labourCharge,
          discount_type: discountType,
          discount_value: discountValue,
          discount_amount: discount,
          payment_method: paymentMethod,
          doc_show_vat: showVat,
          doc_show_logo: showLogo,
          doc_show_address: showAddress,
          doc_show_phone: showPhone,
          doc_show_email: showEmail,
          created_by: profile?.id,
        })
        .select()
        .single()
      if (invError) throw invError

      if (amountPaid > 0) {
        const { error: paymentError } = await supabase.from('payments').insert({
          invoice_id: invoice.id,
          amount: amountPaid,
          method: paymentMethod,
          received_by: profile?.id,
        })
        if (paymentError) throw paymentError
      }

      navigate(`/invoices/${invoice.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create invoice')
      setSaving(false)
    }
  }

  return (
    <div>
      <button
        onClick={() => navigate('/invoices')}
        className="mb-4 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Invoices
      </button>
      <PageHeader title="New Invoice" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormRow label="Link Job Sheet">
                <Select value={jobSheetId} onChange={(e) => setJobSheetId(e.target.value)}>
                  <option value="">-- Select Job Sheet --</option>
                  {jobSheets.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.job_number} — {j.customers?.full_name}
                    </option>
                  ))}
                </Select>
              </FormRow>
              <FormRow label="Customer" required>
                <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                  <option value="">-- Select Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} — {c.phone}
                    </option>
                  ))}
                </Select>
              </FormRow>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Charges</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormRow label="Repair Charge (NPR)">
                <Input
                  type="number"
                  min={0}
                  value={repairCharge}
                  onChange={(e) => setRepairCharge(clampNonNegative(Number(e.target.value)))}
                />
              </FormRow>
              <FormRow label="Parts Cost (NPR)">
                <Input
                  type="number"
                  min={0}
                  value={partsCost}
                  onChange={(e) => setPartsCost(clampNonNegative(Number(e.target.value)))}
                />
              </FormRow>
              <FormRow label="Labour Charge (NPR)">
                <Input
                  type="number"
                  min={0}
                  value={labourCharge}
                  onChange={(e) => setLabourCharge(clampNonNegative(Number(e.target.value)))}
                />
              </FormRow>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Discount & Tax</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Payment</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormRow label="Payment Method">
                <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {PAYMENT_METHOD_LABELS[m]}
                    </option>
                  ))}
                </Select>
              </FormRow>
              <FormRow label="Payment Status">
                <Select value={paymentStatus} disabled>
                  <option>{paymentStatus}</option>
                </Select>
              </FormRow>
              <FormRow label="Amount Paid (NPR)">
                <Input
                  type="number"
                  min={0}
                  max={grandTotal}
                  value={amountPaid}
                  onChange={(e) => handleAmountPaidChange(Number(e.target.value))}
                />
              </FormRow>
            </div>
            {paymentStatus === 'Partial' && (
              <p className="mt-2 text-sm text-danger-600">Remaining balance: {formatNpr(remainingBalance)}</p>
            )}
          </Card>

          <Card className="p-5">
            <FormRow label="Notes">
              <TextArea rows={3} placeholder="Optional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </FormRow>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Show on Document
            </h2>
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
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50 focus-within:ring-2 focus-within:ring-primary-200 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) => item.set(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </Card>
        </div>

        <div>
          <Card className="sticky top-20 p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Summary</h2>
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
            </div>

            {error && <p className="mt-3 text-sm text-danger-600">{error}</p>}
            <div className="mt-4 flex justify-between gap-2">
              <Button type="button" variant="secondary" onClick={() => navigate('/invoices')}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? 'Creating…' : 'Create Invoice'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { Customer, InvoiceItem } from '../../types'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { FormRow, Input } from '../../components/ui/Field'
import { CustomerPicker } from '../../components/CustomerPicker'

type DraftItem = Pick<InvoiceItem, 'description' | 'item_type' | 'quantity' | 'unit_price'>

export function InvoiceNew() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [params] = useSearchParams()
  const jobSheetId = params.get('jobSheetId')

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [panVat, setPanVat] = useState('')
  const [vatEnabled, setVatEnabled] = useState(false)
  const [vatRate, setVatRate] = useState(13)
  const [items, setItems] = useState<DraftItem[]>([{ description: '', item_type: 'other', quantity: 1, unit_price: 0 }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!jobSheetId) return
    async function prefill() {
      const [{ data: job }, { data: partsUsed }] = await Promise.all([
        supabase.from('job_sheets').select('*, customers(*)').eq('id', jobSheetId).single(),
        supabase.from('job_parts_used').select('*, parts(*)').eq('job_sheet_id', jobSheetId),
      ])
      if (job?.customers) setCustomer(job.customers as Customer)
      const partItems: DraftItem[] = (partsUsed ?? []).map((u) => ({
        description: u.parts?.name ?? 'Part',
        item_type: 'part',
        quantity: u.quantity,
        unit_price: u.unit_price,
      }))
      const partsTotal = partItems.reduce((s, i) => s + i.quantity * i.unit_price, 0)
      const laborTotal = Math.max(0, (job?.estimated_cost ?? 0) - partsTotal)
      const laborItem: DraftItem[] = laborTotal > 0 ? [{ description: 'Labor / service charge', item_type: 'labor', quantity: 1, unit_price: laborTotal }] : []
      setItems([...partItems, ...laborItem].length > 0 ? [...partItems, ...laborItem] : items)
    }
    prefill()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobSheetId])

  function updateItem(index: number, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)))
  }

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const vatAmount = vatEnabled ? subtotal * (vatRate / 100) : 0
  const total = subtotal + vatAmount

  async function handleSubmit() {
    if (!customer) {
      setError('Select a customer first.')
      return
    }
    if (items.length === 0 || items.some((i) => !i.description.trim())) {
      setError('Add at least one valid line item.')
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
          customer_id: customer.id,
          job_sheet_id: jobSheetId,
          pan_vat_number: panVat || null,
          vat_enabled: vatEnabled,
          vat_rate: vatRate,
          subtotal,
          vat_amount: vatAmount,
          total,
          balance_due: total,
          status: 'sent',
          created_by: profile?.id,
        })
        .select()
        .single()
      if (invError) throw invError

      const { error: itemsError } = await supabase.from('invoice_items').insert(
        items.map((i) => ({
          invoice_id: invoice.id,
          description: i.description,
          item_type: i.item_type,
          quantity: i.quantity,
          unit_price: i.unit_price,
          total: i.quantity * i.unit_price,
        }))
      )
      if (itemsError) throw itemsError

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
      <PageHeader title="New Invoice" description={jobSheetId ? 'Generated from job sheet' : 'Standalone sale'} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Customer</h2>
            <CustomerPicker value={customer} onSelect={setCustomer} />
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Tax Details (Nepal)</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormRow label="PAN / VAT Number">
                <Input value={panVat} onChange={(e) => setPanVat(e.target.value)} />
              </FormRow>
              <FormRow label="VAT Rate (%)">
                <Input type="number" value={vatRate} onChange={(e) => setVatRate(Number(e.target.value))} disabled={!vatEnabled} />
              </FormRow>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={vatEnabled} onChange={(e) => setVatEnabled(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
              Apply VAT
            </label>
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Line Items</h2>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setItems((prev) => [...prev, { description: '', item_type: 'other', quantity: 1, unit_price: 0 }])}
              >
                <Plus className="h-3.5 w-3.5" /> Add line
              </Button>
            </div>
            <div className="space-y-3">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    className="flex-1"
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateItem(i, { description: e.target.value })}
                  />
                  <Input
                    type="number"
                    className="w-20"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })}
                  />
                  <Input
                    type="number"
                    className="w-28"
                    value={item.unit_price}
                    onChange={(e) => updateItem(i, { unit_price: Number(e.target.value) })}
                  />
                  <button
                    onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-slate-400 hover:text-danger-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div>
          <Card className="sticky top-20 p-5">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span className="text-slate-800 dark:text-slate-200">Rs. {subtotal.toLocaleString()}</span>
              </div>
              {vatEnabled && (
                <div className="flex justify-between">
                  <span className="text-slate-500">VAT ({vatRate}%)</span>
                  <span className="text-slate-800 dark:text-slate-200">Rs. {vatAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-semibold text-slate-900 dark:border-slate-800 dark:text-slate-50">
                <span>Total</span>
                <span>Rs. {total.toLocaleString()}</span>
              </div>
            </div>
            {error && <p className="mt-3 text-sm text-danger-600">{error}</p>}
            <Button onClick={handleSubmit} disabled={saving} className="mt-4 w-full">
              {saving ? 'Creating…' : 'Create Invoice'}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}

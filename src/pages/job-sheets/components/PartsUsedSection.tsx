import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import type { JobPartUsed, Part } from '../../../types'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { FormRow, Input, Select } from '../../../components/ui/Field'
import { EmptyState } from '../../../components/ui/EmptyState'

export function PartsUsedSection({ jobSheetId, editable }: { jobSheetId: string; editable: boolean }) {
  const { profile } = useAuth()
  const showCost = profile && ['super_admin', 'admin', 'accountant'].includes(profile.role)
  const [used, setUsed] = useState<JobPartUsed[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [parts, setParts] = useState<Part[]>([])
  const [partId, setPartId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const { data } = await supabase
      .from('job_parts_used')
      .select('*, parts(*)')
      .eq('job_sheet_id', jobSheetId)
      .order('created_at')
    setUsed((data ?? []) as JobPartUsed[])
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobSheetId])

  useEffect(() => {
    if (!showAdd) return
    supabase.from('parts').select('*').order('name').then(({ data }) => setParts(data ?? []))
  }, [showAdd])

  const selectedPart = parts.find((p) => p.id === partId)

  async function handleAdd() {
    if (!selectedPart) return
    if (selectedPart.stock_qty < quantity) {
      setError(`Only ${selectedPart.stock_qty} in stock.`)
      return
    }
    setSaving(true)
    setError(null)
    const { error } = await supabase.rpc('use_part_on_job', {
      p_job_sheet_id: jobSheetId,
      p_part_id: selectedPart.id,
      p_quantity: quantity,
      p_unit_cost: selectedPart.cost_price,
      p_unit_price: selectedPart.sale_price,
    })
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setShowAdd(false)
    setPartId('')
    setQuantity(1)
    load()
  }

  const total = used.reduce((sum, u) => sum + u.quantity * u.unit_price, 0)

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Parts Used</h2>
        {editable && (
          <Button size="sm" variant="secondary" onClick={() => setShowAdd(true)}>
            <Plus className="h-3.5 w-3.5" /> Add part
          </Button>
        )}
      </div>

      {used.length === 0 ? (
        <EmptyState title="No parts used yet" />
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {used.map((u) => (
            <div key={u.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">{u.parts?.name}</p>
                <p className="text-xs text-slate-400">Qty: {u.quantity}</p>
              </div>
              {showCost && <p className="font-medium text-slate-700 dark:text-slate-300">Rs. {(u.quantity * u.unit_price).toLocaleString()}</p>}
            </div>
          ))}
          {showCost && (
            <div className="flex items-center justify-between pt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <span>Total</span>
              <span>Rs. {total.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add part used">
        <div className="space-y-4">
          <FormRow label="Part" required>
            <Select value={partId} onChange={(e) => setPartId(e.target.value)}>
              <option value="">Select part…</option>
              {parts.map((p) => (
                <option key={p.id} value={p.id} disabled={p.stock_qty <= 0}>
                  {p.name} ({p.stock_qty} in stock)
                </option>
              ))}
            </Select>
          </FormRow>
          <FormRow label="Quantity" required>
            <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
          </FormRow>
          {error && <p className="text-sm text-danger-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleAdd} disabled={saving || !partId}>
              {saving ? 'Adding…' : 'Add'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

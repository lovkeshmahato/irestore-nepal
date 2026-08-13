import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import type { Part } from '../../types'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { FormRow, Input, Select } from '../../components/ui/Field'

export function PartFormModal({
  open,
  onClose,
  onSaved,
  part,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  part: Part | null
}) {
  const [name, setName] = useState(part?.name ?? '')
  const [category, setCategory] = useState(part?.category ?? '')
  const [compatibleModels, setCompatibleModels] = useState((part?.compatible_models ?? []).join(', '))
  const [partType, setPartType] = useState(part?.part_type ?? 'compatible')
  const [costPrice, setCostPrice] = useState(part?.cost_price ?? 0)
  const [salePrice, setSalePrice] = useState(part?.sale_price ?? 0)
  const [stockQty, setStockQty] = useState(part?.stock_qty ?? 0)
  const [reorderThreshold, setReorderThreshold] = useState(part?.reorder_threshold ?? 3)
  const [isSerialized, setIsSerialized] = useState(part?.is_serialized ?? false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const payload = {
      name,
      category: category || null,
      compatible_models: compatibleModels.split(',').map((m) => m.trim()).filter(Boolean),
      part_type: partType,
      cost_price: costPrice,
      sale_price: salePrice,
      stock_qty: stockQty,
      reorder_threshold: reorderThreshold,
      is_serialized: isSerialized,
    }
    const query = part
      ? supabase.from('parts').update(payload).eq('id', part.id)
      : supabase.from('parts').insert(payload)
    const { error } = await query
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title={part ? 'Edit Part' : 'New Part'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormRow label="Name" required>
          <Input required value={name} onChange={(e) => setName(e.target.value)} />
        </FormRow>
        <div className="grid grid-cols-2 gap-4">
          <FormRow label="Category">
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Screen, Battery…" />
          </FormRow>
          <FormRow label="Type">
            <Select value={partType} onChange={(e) => setPartType(e.target.value as Part['part_type'])}>
              <option value="genuine">Genuine</option>
              <option value="oem">OEM</option>
              <option value="compatible">Compatible</option>
            </Select>
          </FormRow>
        </div>
        <FormRow label="Compatible models (comma-separated)">
          <Input value={compatibleModels} onChange={(e) => setCompatibleModels(e.target.value)} placeholder="iPhone 13, iPhone 13 Pro" />
        </FormRow>
        <div className="grid grid-cols-2 gap-4">
          <FormRow label="Cost price" required>
            <Input type="number" required value={costPrice} onChange={(e) => setCostPrice(Number(e.target.value))} />
          </FormRow>
          <FormRow label="Sale price" required>
            <Input type="number" required value={salePrice} onChange={(e) => setSalePrice(Number(e.target.value))} />
          </FormRow>
          <FormRow label="Stock quantity" required>
            <Input type="number" required value={stockQty} onChange={(e) => setStockQty(Number(e.target.value))} disabled={!!part} />
          </FormRow>
          <FormRow label="Reorder threshold">
            <Input type="number" value={reorderThreshold} onChange={(e) => setReorderThreshold(Number(e.target.value))} />
          </FormRow>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input type="checkbox" checked={isSerialized} onChange={(e) => setIsSerialized(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
          Track by individual serial number (high-value parts)
        </label>
        {part && <p className="text-xs text-slate-400">Use "Adjust Stock" on the list to change quantity so movements are logged.</p>}
        {error && <p className="text-sm text-danger-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

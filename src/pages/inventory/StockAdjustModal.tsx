import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { Part } from '../../types'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { FormRow, Input, Select, TextArea } from '../../components/ui/Field'

export function StockAdjustModal({
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
  const { profile } = useAuth()
  const [type, setType] = useState<'received' | 'adjusted' | 'damaged'>('received')
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!part) return
    setSaving(true)
    const signedQty = type === 'damaged' ? -Math.abs(quantity) : quantity
    await supabase.from('parts').update({ stock_qty: part.stock_qty + signedQty }).eq('id', part.id)
    await supabase.from('stock_movements').insert({
      part_id: part.id,
      movement_type: type,
      quantity: signedQty,
      reference_type: 'manual',
      notes: notes || null,
      created_by: profile?.id,
    })
    setSaving(false)
    onSaved()
  }

  if (!part) return null

  return (
    <Modal open={open} onClose={onClose} title={`Adjust Stock — ${part.name}`}>
      <div className="space-y-4">
        <p className="text-sm text-slate-500">Current stock: {part.stock_qty}</p>
        <FormRow label="Movement type">
          <Select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            <option value="received">Received from vendor</option>
            <option value="adjusted">Manual adjustment (+)</option>
            <option value="damaged">Damaged / written off (-)</option>
          </Select>
        </FormRow>
        <FormRow label="Quantity">
          <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
        </FormRow>
        <FormRow label="Notes">
          <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormRow>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

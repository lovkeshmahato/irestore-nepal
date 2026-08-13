import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Customer } from '../../types'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { FormRow, Select } from '../../components/ui/Field'

export function MergeCustomersModal({
  open,
  onClose,
  onMerged,
}: {
  open: boolean
  onClose: () => void
  onMerged: () => void
}) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [keepId, setKeepId] = useState('')
  const [mergeId, setMergeId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    supabase
      .from('customers')
      .select('*')
      .is('merged_into', null)
      .order('full_name')
      .then(({ data }) => setCustomers(data ?? []))
  }, [open])

  async function handleMerge() {
    if (!keepId || !mergeId || keepId === mergeId) {
      setError('Choose two different customers.')
      return
    }
    setSaving(true)
    setError(null)
    // Re-point all records referencing the duplicate customer to the one being kept.
    const tables: { table: string; column: string }[] = [
      { table: 'devices', column: 'customer_id' },
      { table: 'job_sheets', column: 'customer_id' },
      { table: 'invoices', column: 'customer_id' },
    ]
    for (const { table, column } of tables) {
      const { error } = await supabase.from(table).update({ [column]: keepId }).eq(column, mergeId)
      if (error) {
        setError(error.message)
        setSaving(false)
        return
      }
    }
    const { error: mergeError } = await supabase.from('customers').update({ merged_into: keepId }).eq('id', mergeId)
    setSaving(false)
    if (mergeError) {
      setError(mergeError.message)
      return
    }
    onMerged()
  }

  return (
    <Modal open={open} onClose={onClose} title="Merge duplicate customers">
      <div className="space-y-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          All devices, job sheets, and invoices from the duplicate will be moved to the customer you keep.
        </p>
        <FormRow label="Keep this customer">
          <Select value={keepId} onChange={(e) => setKeepId(e.target.value)}>
            <option value="">Select…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name} — {c.phone}
              </option>
            ))}
          </Select>
        </FormRow>
        <FormRow label="Merge & archive this duplicate">
          <Select value={mergeId} onChange={(e) => setMergeId(e.target.value)}>
            <option value="">Select…</option>
            {customers
              .filter((c) => c.id !== keepId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} — {c.phone}
                </option>
              ))}
          </Select>
        </FormRow>
        {error && <p className="text-sm text-danger-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleMerge} disabled={saving}>
            {saving ? 'Merging…' : 'Merge'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

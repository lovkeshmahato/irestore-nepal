import { useState, type FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { Customer } from '../../types'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { FormRow, Input, TextArea } from '../../components/ui/Field'

interface DraftHistoryEntry {
  device: string
  issue: string
  service_date: string
  notes: string
}

export function CustomerFormModal({
  open,
  onClose,
  onSaved,
  customer,
}: {
  open: boolean
  onClose: () => void
  onSaved: (customer: Customer) => void
  customer?: Customer
}) {
  const { profile } = useAuth()
  const [fullName, setFullName] = useState(customer?.full_name ?? '')
  const [phone, setPhone] = useState(customer?.phone ?? '')
  const [email, setEmail] = useState(customer?.email ?? '')
  const [address, setAddress] = useState(customer?.address ?? '')
  const [notes, setNotes] = useState(customer?.notes ?? '')
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<DraftHistoryEntry[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addHistoryEntry() {
    setShowHistory(true)
    setHistory((h) => [...h, { device: '', issue: '', service_date: '', notes: '' }])
  }

  function updateHistoryEntry(index: number, patch: Partial<DraftHistoryEntry>) {
    setHistory((h) => h.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)))
  }

  function removeHistoryEntry(index: number) {
    setHistory((h) => h.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const payload = { full_name: fullName, phone, email: email || null, address: address || null, notes: notes || null }
    const query = customer
      ? supabase.from('customers').update(payload).eq('id', customer.id).select().single()
      : supabase.from('customers').insert(payload).select().single()
    const { data, error } = await query
    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }

    const validHistory = history.filter((h) => h.device.trim() && h.issue.trim())
    if (!customer && validHistory.length > 0) {
      const { error: historyError } = await supabase.from('legacy_service_records').insert(
        validHistory.map((h) => ({
          customer_id: data.id,
          device: h.device,
          issue: h.issue,
          service_date: h.service_date || null,
          notes: h.notes || null,
          created_by: profile?.id,
        }))
      )
      if (historyError) {
        setError(`Customer saved, but history failed: ${historyError.message}`)
        setSaving(false)
        return
      }
    }

    setSaving(false)
    onSaved(data as Customer)
  }

  return (
    <Modal open={open} onClose={onClose} title={customer ? 'Edit Customer' : 'New Customer'} size={showHistory ? 'lg' : 'md'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormRow label="Full name" required>
          <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </FormRow>
        <FormRow label="Phone" required>
          <Input required value={phone} onChange={(e) => setPhone(e.target.value)} />
        </FormRow>
        <FormRow label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormRow>
        <FormRow label="Address">
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </FormRow>
        <FormRow label="Notes">
          <TextArea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormRow>

        {!customer && (
          <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Previous Service History</p>
                <p className="text-xs text-slate-400">Optional — log past repairs done before this system was in use.</p>
              </div>
              <Button type="button" size="sm" variant="secondary" onClick={addHistoryEntry}>
                <Plus className="h-3.5 w-3.5" /> Add entry
              </Button>
            </div>

            {history.length > 0 && (
              <div className="space-y-3">
                {history.map((entry, i) => (
                  <div key={i} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                        <Input
                          placeholder="Device (e.g. iPhone 11)"
                          value={entry.device}
                          onChange={(e) => updateHistoryEntry(i, { device: e.target.value })}
                        />
                        <Input
                          type="date"
                          value={entry.service_date}
                          onChange={(e) => updateHistoryEntry(i, { service_date: e.target.value })}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeHistoryEntry(i)}
                        className="mt-2 text-slate-400 hover:text-danger-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <Input
                      className="mb-2"
                      placeholder="Issue repaired"
                      value={entry.issue}
                      onChange={(e) => updateHistoryEntry(i, { issue: e.target.value })}
                    />
                    <TextArea
                      rows={2}
                      placeholder="Notes (optional)"
                      value={entry.notes}
                      onChange={(e) => updateHistoryEntry(i, { notes: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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

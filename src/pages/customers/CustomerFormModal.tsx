import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import type { Customer } from '../../types'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { FormRow, Input, TextArea } from '../../components/ui/Field'

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
  const [fullName, setFullName] = useState(customer?.full_name ?? '')
  const [phone, setPhone] = useState(customer?.phone ?? '')
  const [email, setEmail] = useState(customer?.email ?? '')
  const [address, setAddress] = useState(customer?.address ?? '')
  const [notes, setNotes] = useState(customer?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const payload = { full_name: fullName, phone, email: email || null, address: address || null, notes: notes || null }
    const query = customer
      ? supabase.from('customers').update(payload).eq('id', customer.id).select().single()
      : supabase.from('customers').insert(payload).select().single()
    const { data, error } = await query
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    onSaved(data as Customer)
  }

  return (
    <Modal open={open} onClose={onClose} title={customer ? 'Edit Customer' : 'New Customer'}>
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

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Vendor } from '../../types'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { FullPageSpinner } from '../../components/ui/Spinner'
import { Modal } from '../../components/ui/Modal'
import { FormRow, Input } from '../../components/ui/Field'

export function VendorsList() {
  const navigate = useNavigate()
  const [vendors, setVendors] = useState<Vendor[] | null>(null)
  const [outstanding, setOutstanding] = useState<Record<string, number>>({})
  const [showForm, setShowForm] = useState(false)
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [deletingVendor, setDeletingVendor] = useState<Vendor | null>(null)

  async function load() {
    const [{ data }, { data: pos }] = await Promise.all([
      supabase.from('vendors').select('*').order('name'),
      supabase.from('purchase_orders').select('vendor_id, total_amount, amount_paid, status').neq('status', 'cancelled'),
    ])
    setVendors(data ?? [])
    const totals: Record<string, number> = {}
    for (const po of pos ?? []) {
      totals[po.vendor_id] = (totals[po.vendor_id] ?? 0) + Math.max(po.total_amount - po.amount_paid, 0)
    }
    setOutstanding(totals)
  }

  useEffect(() => {
    load()
  }, [])

  if (!vendors) return <FullPageSpinner />

  return (
    <div>
      <PageHeader
        title="Vendors"
        description={`${vendors.length} vendors`}
        actions={
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> New Vendor
          </Button>
        }
      />

      <Card className="overflow-hidden">
        {vendors.length === 0 ? (
          <EmptyState title="No vendors yet" />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="hidden px-4 py-3 font-medium lg:table-cell">Contact</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="hidden px-4 py-3 font-medium lg:table-cell">Items Supplied</th>
                    <th className="px-4 py-3 font-medium">Outstanding</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {vendors.map((v) => {
                    const due = outstanding[v.id] ?? 0
                    return (
                      <tr key={v.id} onClick={() => navigate(`/vendors/${v.id}`)} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{v.name}</td>
                        <td className="hidden px-4 py-3 text-slate-500 lg:table-cell">{v.contact_person ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-500">{v.phone ?? '—'}</td>
                        <td className="hidden px-4 py-3 text-slate-500 lg:table-cell">{v.items_supplied ?? '—'}</td>
                        <td className={`px-4 py-3 font-medium ${due > 0 ? 'text-danger-600' : 'text-success-600'}`}>
                          Rs. {due.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingVendor(v)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeletingVendor(v)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-danger-600/20"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
              {vendors.map((v) => {
                const due = outstanding[v.id] ?? 0
                return (
                  <div
                    key={v.id}
                    onClick={() => navigate(`/vendors/${v.id}`)}
                    className="cursor-pointer p-4 active:bg-slate-50 dark:active:bg-slate-800/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{v.name}</span>
                      <span className={`text-xs font-medium ${due > 0 ? 'text-danger-600' : 'text-success-600'}`}>
                        Rs. {due.toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-1.5 space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {v.contact_person && <div>{v.contact_person}</div>}
                      <div>{v.phone ?? '—'}</div>
                      {v.items_supplied && <div>{v.items_supplied}</div>}
                    </div>
                    <div className="mt-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setEditingVendor(v)}
                        className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeletingVendor(v)}
                        className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-danger-600/20"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </Card>

      <VendorFormModal open={showForm} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} />
      <VendorFormModal
        open={!!editingVendor}
        vendor={editingVendor}
        onClose={() => setEditingVendor(null)}
        onSaved={() => {
          setEditingVendor(null)
          load()
        }}
      />
      <DeleteVendorModal
        vendor={deletingVendor}
        onClose={() => setDeletingVendor(null)}
        onDeleted={() => {
          setDeletingVendor(null)
          load()
        }}
      />
    </div>
  )
}

function VendorFormModal({
  open,
  onClose,
  onSaved,
  vendor,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  vendor?: Vendor | null
}) {
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [items, setItems] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(vendor?.name ?? '')
    setContact(vendor?.contact_person ?? '')
    setPhone(vendor?.phone ?? '')
    setEmail(vendor?.email ?? '')
    setAddress(vendor?.address ?? '')
    setItems(vendor?.items_supplied ?? '')
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, vendor])

  async function handleSubmit() {
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    const payload = {
      name,
      contact_person: contact || null,
      phone: phone || null,
      email: email || null,
      address: address || null,
      items_supplied: items || null,
    }
    const { error } = vendor
      ? await supabase.from('vendors').update(payload).eq('id', vendor.id)
      : await supabase.from('vendors').insert(payload)
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title={vendor ? 'Edit Vendor' : 'New Vendor'}>
      <div className="space-y-4">
        <FormRow label="Name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </FormRow>
        <FormRow label="Contact person">
          <Input value={contact} onChange={(e) => setContact(e.target.value)} />
        </FormRow>
        <div className="grid grid-cols-2 gap-4">
          <FormRow label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </FormRow>
          <FormRow label="Email">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </FormRow>
        </div>
        <FormRow label="Address">
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </FormRow>
        <FormRow label="Items supplied">
          <Input value={items} onChange={(e) => setItems(e.target.value)} placeholder="Screens, batteries…" />
        </FormRow>
        {error && <p className="text-sm text-danger-600">{error}</p>}
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

function DeleteVendorModal({
  vendor,
  onClose,
  onDeleted,
}: {
  vendor: Vendor | null
  onClose: () => void
  onDeleted: () => void
}) {
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [blocked, setBlocked] = useState<string | null>(null)

  useEffect(() => {
    setError(null)
    setBlocked(null)
  }, [vendor])

  async function handleConfirm() {
    if (!vendor) return
    setWorking(true)
    setError(null)
    setBlocked(null)

    const [
      { count: poCount, error: poError },
      { count: paymentCount, error: paymentError },
    ] = await Promise.all([
      supabase.from('purchase_orders').select('id', { count: 'exact', head: true }).eq('vendor_id', vendor.id),
      supabase.from('vendor_payments').select('id', { count: 'exact', head: true }).eq('vendor_id', vendor.id),
    ])

    if (poError || paymentError) {
      setWorking(false)
      setError((poError ?? paymentError)?.message ?? 'Could not check linked records.')
      return
    }

    const pos = poCount ?? 0
    const payments = paymentCount ?? 0

    if (pos > 0 || payments > 0) {
      const parts: string[] = []
      if (pos > 0) parts.push(`${pos} purchase order${pos === 1 ? '' : 's'}`)
      if (payments > 0) parts.push(`${payments} payment${payments === 1 ? '' : 's'}`)
      setWorking(false)
      setBlocked(`Cannot delete — this vendor has ${parts.join(' and ')} on file.`)
      return
    }

    const { error } = await supabase.from('vendors').delete().eq('id', vendor.id)
    setWorking(false)
    if (error) {
      setError(error.message)
      return
    }
    onDeleted()
  }

  return (
    <Modal open={!!vendor} onClose={onClose} title="Delete Vendor" size="sm">
      <div className="space-y-4">
        {!blocked && (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            This will permanently delete <span className="font-medium">{vendor?.name}</span>. This cannot be undone.
          </p>
        )}
        {blocked && <p className="text-sm text-danger-600">{blocked}</p>}
        {error && <p className="text-sm text-danger-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {blocked ? 'Close' : 'Cancel'}
          </Button>
          {!blocked && (
            <Button type="button" variant="danger" onClick={handleConfirm} disabled={working}>
              {working ? 'Checking…' : 'Delete Vendor'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

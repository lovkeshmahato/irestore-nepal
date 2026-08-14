import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
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
                  </div>
                )
              })}
            </div>
          </>
        )}
      </Card>

      <VendorFormModal open={showForm} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} />
    </div>
  )
}

function VendorFormModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [items, setItems] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!name.trim()) return
    setSaving(true)
    await supabase.from('vendors').insert({
      name,
      contact_person: contact || null,
      phone: phone || null,
      email: email || null,
      address: address || null,
      items_supplied: items || null,
    })
    setSaving(false)
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title="New Vendor">
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

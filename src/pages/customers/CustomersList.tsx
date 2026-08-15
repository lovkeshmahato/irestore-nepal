import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Merge, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Customer } from '../../types'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Field'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { FullPageSpinner } from '../../components/ui/Spinner'
import { Modal } from '../../components/ui/Modal'
import { CustomerFormModal } from './CustomerFormModal'
import { MergeCustomersModal } from './MergeCustomersModal'

export function CustomersList() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<Customer[] | null>(null)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showMerge, setShowMerge] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null)

  async function load() {
    let query = supabase.from('customers').select('*').is('merged_into', null).order('created_at', { ascending: false })
    if (search.trim()) {
      query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
    }
    const { data } = await query
    setCustomers(data ?? [])
  }

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  if (!customers) return <FullPageSpinner />

  return (
    <div>
      <PageHeader
        title="Customers"
        description={`${customers.length} customers`}
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowMerge(true)}>
              <Merge className="h-4 w-4" /> Merge duplicates
            </Button>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> New Customer
            </Button>
          </>
        }
      />

      <div className="mb-4 max-w-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search name, phone, email…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        {customers.length === 0 ? (
          <EmptyState title="No customers found" description="Add your first customer to get started." />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="hidden px-4 py-3 font-medium lg:table-cell">Email</th>
                    <th className="hidden px-4 py-3 font-medium lg:table-cell">Added</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {customers.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/customers/${c.id}`)}
                      className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{c.full_name}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{c.phone}</td>
                      <td className="hidden px-4 py-3 text-slate-500 lg:table-cell dark:text-slate-400">{c.email ?? '—'}</td>
                      <td className="hidden px-4 py-3 text-slate-500 lg:table-cell dark:text-slate-400">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingCustomer(c)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeletingCustomer(c)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-danger-600/20"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
              {customers.map((c) => (
                <div
                  key={c.id}
                  onClick={() => navigate(`/customers/${c.id}`)}
                  className="cursor-pointer p-4 active:bg-slate-50 dark:active:bg-slate-800/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{c.full_name}</div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setEditingCustomer(c)}
                        className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeletingCustomer(c)}
                        className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-danger-600/20"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-1.5 space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                    <div>{c.phone}</div>
                    {c.email && <div>{c.email}</div>}
                    <div>Added {new Date(c.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <CustomerFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        onSaved={() => {
          setShowForm(false)
          load()
        }}
      />
      <CustomerFormModal
        open={!!editingCustomer}
        customer={editingCustomer ?? undefined}
        onClose={() => setEditingCustomer(null)}
        onSaved={() => {
          setEditingCustomer(null)
          load()
        }}
      />
      <MergeCustomersModal
        open={showMerge}
        onClose={() => setShowMerge(false)}
        onMerged={() => {
          setShowMerge(false)
          load()
        }}
      />
      <DeleteCustomerModal
        customer={deletingCustomer}
        onClose={() => setDeletingCustomer(null)}
        onDeleted={() => {
          setDeletingCustomer(null)
          load()
        }}
      />
    </div>
  )
}

function DeleteCustomerModal({
  customer,
  onClose,
  onDeleted,
}: {
  customer: Customer | null
  onClose: () => void
  onDeleted: () => void
}) {
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [blocked, setBlocked] = useState<string | null>(null)

  useEffect(() => {
    setError(null)
    setBlocked(null)
  }, [customer])

  async function handleConfirm() {
    if (!customer) return
    setWorking(true)
    setError(null)
    setBlocked(null)

    const [
      { count: jobCount, error: jobError },
      { count: invoiceCount, error: invoiceError },
      { count: legacyCount, error: legacyError },
    ] = await Promise.all([
      supabase.from('job_sheets').select('id', { count: 'exact', head: true }).eq('customer_id', customer.id),
      supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('customer_id', customer.id),
      supabase.from('legacy_service_records').select('id', { count: 'exact', head: true }).eq('customer_id', customer.id),
    ])

    if (jobError || invoiceError || legacyError) {
      setWorking(false)
      setError((jobError ?? invoiceError ?? legacyError)?.message ?? 'Could not check linked records.')
      return
    }

    const jobs = jobCount ?? 0
    const invoices = invoiceCount ?? 0
    const legacy = legacyCount ?? 0

    if (jobs > 0 || invoices > 0 || legacy > 0) {
      const parts: string[] = []
      if (jobs > 0) parts.push(`${jobs} job sheet${jobs === 1 ? '' : 's'}`)
      if (invoices > 0) parts.push(`${invoices} invoice${invoices === 1 ? '' : 's'}`)
      if (legacy > 0) parts.push(`${legacy} service record${legacy === 1 ? '' : 's'}`)
      setWorking(false)
      setBlocked(
        `Cannot delete — this customer has ${parts.join(' and ')} on file. Editing or merging is recommended instead of deletion.`
      )
      return
    }

    const { error } = await supabase.from('customers').delete().eq('id', customer.id)
    setWorking(false)
    if (error) {
      setError(error.message)
      return
    }
    onDeleted()
  }

  return (
    <Modal open={!!customer} onClose={onClose} title="Delete Customer" size="sm">
      <div className="space-y-4">
        {!blocked && (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            This will permanently delete <span className="font-medium">{customer?.full_name}</span>. This cannot be undone.
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
              {working ? 'Checking…' : 'Delete Customer'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

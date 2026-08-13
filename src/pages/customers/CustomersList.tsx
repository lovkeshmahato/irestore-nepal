import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Merge } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Customer } from '../../types'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Field'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { FullPageSpinner } from '../../components/ui/Spinner'
import { CustomerFormModal } from './CustomerFormModal'
import { MergeCustomersModal } from './MergeCustomersModal'

export function CustomersList() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<Customer[] | null>(null)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showMerge, setShowMerge] = useState(false)

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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Added</th>
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
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{c.email ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
      <MergeCustomersModal
        open={showMerge}
        onClose={() => setShowMerge(false)}
        onMerged={() => {
          setShowMerge(false)
          load()
        }}
      />
    </div>
  )
}

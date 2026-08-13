import { useEffect, useState } from 'react'
import { Search, UserPlus, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Customer } from '../types'
import { Input, FormRow } from './ui/Field'
import { Card } from './ui/Card'

export function CustomerPicker({
  value,
  onSelect,
}: {
  value: Customer | null
  onSelect: (customer: Customer | null) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Customer[]>([])
  const [creatingNew, setCreatingNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .is('merged_into', null)
        .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(6)
      setResults(data ?? [])
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  async function quickAdd() {
    if (!newName || !newPhone) return
    setSaving(true)
    const { data, error } = await supabase
      .from('customers')
      .insert({ full_name: newName, phone: newPhone })
      .select()
      .single()
    setSaving(false)
    if (!error && data) {
      onSelect(data as Customer)
      setCreatingNew(false)
    }
  }

  if (value) {
    return (
      <Card className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-success-600" />
          <span className="font-medium text-slate-900 dark:text-slate-100">{value.full_name}</span>
          <span className="text-slate-400">{value.phone}</span>
        </div>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="text-xs font-medium text-primary-600 hover:underline"
        >
          Change
        </button>
      </Card>
    )
  }

  return (
    <div>
      {!creatingNew ? (
        <>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Search customer by name or phone…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {results.length > 0 && (
            <div className="mb-2 divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
              {results.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => onSelect(c)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <span className="font-medium text-slate-900 dark:text-slate-100">{c.full_name}</span>
                  <span className="text-slate-400">{c.phone}</span>
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setCreatingNew(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:underline"
          >
            <UserPlus className="h-4 w-4" /> Quick-add new customer
          </button>
        </>
      ) : (
        <div className="space-y-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <FormRow label="Full name" required>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
          </FormRow>
          <FormRow label="Phone" required>
            <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
          </FormRow>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={quickAdd}
              disabled={saving || !newName || !newPhone}
              className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? 'Adding…' : 'Add & select'}
            </button>
            <button
              type="button"
              onClick={() => setCreatingNew(false)}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

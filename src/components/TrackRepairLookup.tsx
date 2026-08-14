import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { JobSheet } from '../types'
import { JOB_STATUS_LABELS } from '../types'
import { Modal } from './ui/Modal'
import { Input } from './ui/Field'
import { StatusBadge } from './ui/Badge'
import { EmptyState } from './ui/EmptyState'

export function TrackRepairLookup({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<JobSheet[] | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSearch(q: string) {
    setQuery(q)
    if (!q.trim()) {
      setResults(null)
      return
    }
    setLoading(true)

    const [byJobNumber, matchingCustomers] = await Promise.all([
      supabase
        .from('job_sheets')
        .select('*, customers(*), devices(*)')
        .ilike('job_number', `%${q}%`)
        .order('created_at', { ascending: false })
        .limit(15),
      supabase.from('customers').select('id').or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`).limit(15),
    ])

    const customerIds = (matchingCustomers.data ?? []).map((c) => c.id)
    const byCustomer = customerIds.length
      ? await supabase
          .from('job_sheets')
          .select('*, customers(*), devices(*)')
          .in('customer_id', customerIds)
          .order('created_at', { ascending: false })
          .limit(15)
      : { data: [] }

    const merged = new Map<string, JobSheet>()
    for (const job of [...(byJobNumber.data ?? []), ...(byCustomer.data ?? [])]) {
      merged.set(job.id, job as JobSheet)
    }
    setResults(Array.from(merged.values()).sort((a, b) => b.created_at.localeCompare(a.created_at)))
    setLoading(false)
  }

  function goTo(job: JobSheet) {
    onClose()
    navigate(`/job-sheets/${job.id}`)
  }

  return (
    <Modal open={open} onClose={onClose} title="Track Repair" size="lg">
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          autoFocus
          className="pl-9"
          placeholder="Search job #, customer name, or phone…"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {loading && <p className="text-sm text-slate-400">Searching…</p>}

      {!loading && results && results.length === 0 && <EmptyState title="No matching job sheets" />}

      {!loading && results && results.length > 0 && (
        <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
          {results.map((job) => (
            <button
              key={job.id}
              onClick={() => goTo(job)}
              className="flex w-full items-center justify-between py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {job.job_number} — {job.customers?.full_name}
                </p>
                <p className="text-xs text-slate-400">
                  {job.devices?.model} · {job.customers?.phone}
                </p>
              </div>
              <StatusBadge status={job.status} kind="job" label={JOB_STATUS_LABELS[job.status]} />
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}

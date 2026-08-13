import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, QrCode } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { JobSheet, JobStatus } from '../../types'
import { JOB_STATUS_FLOW, JOB_STATUS_LABELS } from '../../types'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Field'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { FullPageSpinner } from '../../components/ui/Spinner'

export function JobSheetsList() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [jobs, setJobs] = useState<JobSheet[] | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<JobStatus | ''>('')
  const canCreate = profile && ['super_admin', 'admin', 'front_desk'].includes(profile.role)

  async function load() {
    let query = supabase
      .from('job_sheets')
      .select('*, customers(*), devices(*)')
      .order('created_at', { ascending: false })

    if (profile?.role === 'technician') {
      query = query.eq('assigned_technician_id', profile.id)
    }
    if (status) query = query.eq('status', status)
    const { data } = await query
    let filtered = (data ?? []) as JobSheet[]
    if (search.trim()) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        (j) =>
          j.job_number.toLowerCase().includes(q) ||
          j.customers?.full_name.toLowerCase().includes(q) ||
          j.devices?.model.toLowerCase().includes(q)
      )
    }
    setJobs(filtered)
  }

  useEffect(() => {
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, profile])

  if (!jobs) return <FullPageSpinner />

  return (
    <div>
      <PageHeader
        title="Job Sheets"
        description={`${jobs.length} job sheets`}
        actions={
          canCreate && (
            <Button onClick={() => navigate('/job-sheets/new')}>
              <Plus className="h-4 w-4" /> New Job Sheet
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Search job #, customer, device…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value as JobStatus | '')} className="max-w-xs">
          <option value="">All statuses</option>
          {[...JOB_STATUS_FLOW, 'declined' as JobStatus].map((s) => (
            <option key={s} value={s}>
              {JOB_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>

      <Card className="overflow-hidden">
        {jobs.length === 0 ? (
          <EmptyState title="No job sheets found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Job #</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Device</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {jobs.map((job) => (
                  <tr
                    key={job.id}
                    onClick={() => navigate(`/job-sheets/${job.id}`)}
                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-4 py-3 font-medium text-primary-600">{job.job_number}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{job.customers?.full_name}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{job.devices?.model}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={job.status} kind="job" label={JOB_STATUS_LABELS[job.status]} />
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{new Date(job.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <QrCode className="ml-auto h-4 w-4 text-slate-300" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

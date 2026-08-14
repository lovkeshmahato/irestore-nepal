import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldPlus, Printer, Plus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { Warranty, WarrantyClaim, WarrantyStatus } from '../../types'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Badge, StatusBadge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { FullPageSpinner } from '../../components/ui/Spinner'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { FormRow, Input, Select, TextArea } from '../../components/ui/Field'

type WarrantyRow = Omit<Warranty, 'job_sheets'> & {
  job_sheets?: { job_number: string; customer_id: string; customers?: { full_name: string } }
}

export function WarrantiesList() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [warranties, setWarranties] = useState<WarrantyRow[] | null>(null)
  const [claims, setClaims] = useState<WarrantyClaim[]>([])
  const [claimingWarranty, setClaimingWarranty] = useState<WarrantyRow | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const canManage = profile && ['super_admin', 'admin', 'front_desk'].includes(profile.role)

  async function load() {
    const [{ data: w }, { data: c }] = await Promise.all([
      supabase
        .from('warranties')
        .select('*, job_sheets(job_number, customer_id, customers(full_name))')
        .order('created_at', { ascending: false }),
      supabase.from('warranty_claims').select('*').order('created_at', { ascending: false }),
    ])
    setWarranties((w ?? []) as unknown as WarrantyRow[])
    setClaims(c ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  if (!warranties) return <FullPageSpinner />

  return (
    <div>
      <PageHeader
        title="Warranties"
        description={`${warranties.length} warranties issued`}
        actions={
          canManage && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" /> Create Warranty
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          {warranties.length === 0 ? (
            <EmptyState title="No warranties issued yet" description="Warranties are auto-created when a job sheet is delivered." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Job #</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Coverage</th>
                    <th className="px-4 py-3 font-medium">Expires</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {warranties.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td
                        className="cursor-pointer px-4 py-3 font-medium text-primary-600"
                        onClick={() => navigate(`/job-sheets/${w.job_sheet_id}`)}
                      >
                        {w.job_sheets?.job_number}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{w.job_sheets?.customers?.full_name}</td>
                      <td className="px-4 py-3 text-slate-500">{w.coverage_description}</td>
                      <td className="px-4 py-3 text-slate-500">{new Date(w.end_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={w.status} kind="warranty" label={w.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="secondary" onClick={() => navigate(`/print/warranty/${w.id}`)}>
                            <Printer className="h-3.5 w-3.5" /> Print
                          </Button>
                          {canManage && w.status === 'active' && (
                            <Button size="sm" variant="secondary" onClick={() => setClaimingWarranty(w)}>
                              <ShieldPlus className="h-3.5 w-3.5" /> File Claim
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Recent Claims</h2>
          {claims.length === 0 ? (
            <p className="text-sm text-slate-400">No claims filed.</p>
          ) : (
            <div className="space-y-3">
              {claims.map((c) => (
                <div key={c.id} className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
                  <div className="mb-1 flex items-center justify-between">
                    <Badge tone={c.status === 'resolved' ? 'success' : c.status === 'rejected' ? 'danger' : 'warning'}>{c.status}</Badge>
                    <span className="text-xs text-slate-400">{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-200">{c.issue_description}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <ClaimModal
        warranty={claimingWarranty}
        onClose={() => setClaimingWarranty(null)}
        onSaved={() => {
          setClaimingWarranty(null)
          load()
        }}
      />
      <CreateWarrantyModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSaved={() => {
          setShowCreate(false)
          load()
        }}
      />
    </div>
  )
}

interface JobSheetOption {
  id: string
  job_number: string
  customers?: { full_name: string }
}

const PERIOD_PRESETS = [30, 60, 90]

function CreateWarrantyModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [jobSheets, setJobSheets] = useState<JobSheetOption[]>([])
  const [jobSheetId, setJobSheetId] = useState('')
  const [periodDays, setPeriodDays] = useState(30)
  const [customPeriod, setCustomPeriod] = useState(false)
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [status, setStatus] = useState<WarrantyStatus>('active')
  const [coverageDetails, setCoverageDetails] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    supabase
      .from('job_sheets')
      .select('id, job_number, customers(full_name)')
      .order('created_at', { ascending: false })
      .limit(150)
      .then(({ data }) => setJobSheets((data ?? []) as unknown as JobSheetOption[]))
  }, [open])

  async function handleSubmit() {
    if (!jobSheetId) {
      setError('Select a job sheet.')
      return
    }
    if (!coverageDetails.trim()) {
      setError('Describe what is covered.')
      return
    }
    setSaving(true)
    setError(null)
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + periodDays)
    const { error } = await supabase.from('warranties').insert({
      job_sheet_id: jobSheetId,
      warranty_type: 'labor',
      coverage_description: coverageDetails,
      period_days: periodDays,
      start_date: startDate,
      end_date: endDate.toISOString().slice(0, 10),
      status,
    })
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setJobSheetId('')
    setCoverageDetails('')
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Warranty">
      <div className="space-y-4">
        <FormRow label="Linked Job Sheet" required>
          <Select value={jobSheetId} onChange={(e) => setJobSheetId(e.target.value)}>
            <option value="">-- Select Job Sheet --</option>
            {jobSheets.map((j) => (
              <option key={j.id} value={j.id}>
                {j.job_number} — {j.customers?.full_name}
              </option>
            ))}
          </Select>
        </FormRow>

        <FormRow label="Warranty Period">
          {customPeriod ? (
            <div className="flex items-center gap-2">
              <Input type="number" min={1} value={periodDays} onChange={(e) => setPeriodDays(Number(e.target.value))} />
              <span className="text-sm text-slate-500">days</span>
              <button type="button" onClick={() => setCustomPeriod(false)} className="text-xs text-primary-600 hover:underline">
                Use preset
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {PERIOD_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriodDays(p)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                    periodDays === p
                      ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-600/20 dark:text-primary-100'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300'
                  }`}
                >
                  {p} days
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCustomPeriod(true)}
                className="rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50 dark:border-slate-600"
              >
                Custom…
              </button>
            </div>
          )}
        </FormRow>

        <div className="grid grid-cols-2 gap-4">
          <FormRow label="Start Date" required>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </FormRow>
          <FormRow label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as WarrantyStatus)}>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="claimed">Claimed</option>
            </Select>
          </FormRow>
        </div>

        <FormRow label="Coverage Details" required>
          <TextArea
            rows={3}
            placeholder="What's covered — parts, labor, or both"
            value={coverageDetails}
            onChange={(e) => setCoverageDetails(e.target.value)}
          />
        </FormRow>

        {error && <p className="text-sm text-danger-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Creating…' : 'Create Warranty'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function ClaimModal({
  warranty,
  onClose,
  onSaved,
}: {
  warranty: WarrantyRow | null
  onClose: () => void
  onSaved: () => void
}) {
  const { profile } = useAuth()
  const [issue, setIssue] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!warranty || !issue.trim()) return
    setSaving(true)
    await supabase.from('warranty_claims').insert({
      warranty_id: warranty.id,
      original_job_sheet_id: warranty.job_sheet_id,
      issue_description: issue,
      created_by: profile?.id,
    })
    await supabase.from('warranties').update({ status: 'claimed' }).eq('id', warranty.id)
    setSaving(false)
    setIssue('')
    onSaved()
  }

  return (
    <Modal open={!!warranty} onClose={onClose} title="File Warranty Claim">
      <div className="space-y-4">
        <p className="text-sm text-slate-500">Job: {warranty?.job_sheets?.job_number}</p>
        <FormRow label="Issue reported by customer" required>
          <TextArea rows={3} value={issue} onChange={(e) => setIssue(e.target.value)} />
        </FormRow>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saving || !issue.trim()}>
            {saving ? 'Filing…' : 'File Claim'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

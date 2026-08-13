import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldPlus, Printer } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { Warranty, WarrantyClaim } from '../../types'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Badge, StatusBadge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { FullPageSpinner } from '../../components/ui/Spinner'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { FormRow, TextArea } from '../../components/ui/Field'

type WarrantyRow = Omit<Warranty, 'job_sheets'> & {
  job_sheets?: { job_number: string; customer_id: string; customers?: { full_name: string } }
}

export function WarrantiesList() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [warranties, setWarranties] = useState<WarrantyRow[] | null>(null)
  const [claims, setClaims] = useState<WarrantyClaim[]>([])
  const [claimingWarranty, setClaimingWarranty] = useState<WarrantyRow | null>(null)
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
      <PageHeader title="Warranties" description={`${warranties.length} warranties issued`} />

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
    </div>
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

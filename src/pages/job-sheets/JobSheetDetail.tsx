import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Printer, Lock, ShieldCheck, FileText } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { JobSheet, JobStatus, JobStatusHistory, Profile, Warranty, JobPriority } from '../../types'
import { JOB_STATUS_LABELS, DEVICE_CONDITION_LABELS, JOB_PRIORITY_LABELS } from '../../types'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input, Select } from '../../components/ui/Field'
import { Badge, StatusBadge } from '../../components/ui/Badge'
import { FullPageSpinner } from '../../components/ui/Spinner'
import { StatusPipeline } from './components/StatusPipeline'
import { PartsUsedSection } from './components/PartsUsedSection'
import { NotesThread } from './components/NotesThread'
import { EstimateSection } from './components/EstimateSection'
import { JobPhotosSection } from './components/JobPhotosSection'
import { formatDistanceToNow } from 'date-fns'

export function JobSheetDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [job, setJob] = useState<JobSheet | null>(null)
  const [history, setHistory] = useState<JobStatusHistory[]>([])
  const [technicians, setTechnicians] = useState<Profile[]>([])
  const [warranty, setWarranty] = useState<Warranty | null>(null)
  const [invoiceId, setInvoiceId] = useState<string | null>(null)

  const isTechAssigned = profile?.role === 'technician' && job?.assigned_technician_id === profile.id
  const canManage = profile && ['super_admin', 'admin', 'front_desk'].includes(profile.role)
  const canChangeStatus = canManage || isTechAssigned
  const canSeeFinancials = profile && ['super_admin', 'admin', 'front_desk', 'accountant'].includes(profile.role)
  const canSeeSecurity = !!canManage || !!isTechAssigned

  async function load() {
    if (!id) return
    const [{ data: j }, { data: h }, { data: w }, { data: inv }] = await Promise.all([
      supabase.from('job_sheets').select('*, customers(*), devices(*)').eq('id', id).single(),
      supabase.from('job_status_history').select('*, profiles(*)').eq('job_sheet_id', id).order('created_at', { ascending: false }),
      supabase.from('warranties').select('*').eq('job_sheet_id', id).maybeSingle(),
      supabase.from('invoices').select('id').eq('job_sheet_id', id).maybeSingle(),
    ])
    setJob(j as JobSheet)
    setHistory((h ?? []) as JobStatusHistory[])
    setWarranty(w as Warranty | null)
    setInvoiceId(inv?.id ?? null)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (!canManage) return
    supabase
      .from('profiles')
      .select('*')
      .eq('role', 'technician')
      .eq('is_active', true)
      .then(({ data }) => setTechnicians(data ?? []))
  }, [canManage])

  async function updateStatus(status: JobStatus) {
    if (!job) return
    const patch: Partial<JobSheet> = { status }
    if (status === 'delivered') {
      patch.passcode = null
      patch.icloud_account = null
      patch.security_notes = null
    }
    await supabase.from('job_sheets').update(patch).eq('id', job.id)
    await supabase.from('job_status_history').insert({ job_sheet_id: job.id, status, changed_by: profile?.id })
    load()
  }

  async function assignTechnician(techId: string) {
    if (!job) return
    await supabase.from('job_sheets').update({ assigned_technician_id: techId || null }).eq('id', job.id)
    load()
  }

  async function updatePriority(priority: JobPriority) {
    if (!job) return
    await supabase.from('job_sheets').update({ priority }).eq('id', job.id)
    load()
  }

  async function updateEta(date: string) {
    if (!job) return
    await supabase.from('job_sheets').update({ estimated_completion_date: date || null }).eq('id', job.id)
    load()
  }

  if (!job) return <FullPageSpinner />

  return (
    <div>
      <button
        onClick={() => navigate('/job-sheets')}
        className="mb-4 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Job Sheets
      </button>

      <PageHeader
        title={job.job_number}
        description={`${job.customers?.full_name} · ${job.devices?.model}`}
        actions={
          <>
            {warranty && (
              <Button variant="secondary" onClick={() => navigate(`/print/warranty/${warranty.id}`)}>
                <ShieldCheck className="h-4 w-4 text-success-600" /> Warranty
              </Button>
            )}
            {invoiceId && (
              <Button variant="secondary" onClick={() => navigate(`/invoices/${invoiceId}`)}>
                <FileText className="h-4 w-4" /> View Invoice
              </Button>
            )}
            <Button variant="secondary" onClick={() => navigate(`/print/job-sheet/${job.id}`)}>
              <Printer className="h-4 w-4" /> Print
            </Button>
            {canManage && !invoiceId && ['delivered', 'ready_for_pickup', 'qc'].includes(job.status) && (
              <Button onClick={() => navigate(`/invoices/new?jobSheetId=${job.id}`)}>Generate Invoice</Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Status</h2>
            <StatusPipeline
              status={job.status}
              canChange={!!canChangeStatus}
              onAdvance={updateStatus}
              onDecline={() => updateStatus('declined')}
            />
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Device & Issue</h2>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-400">Type</p>
                <p className="text-slate-800 dark:text-slate-200">{job.devices?.device_type}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Model</p>
                <p className="text-slate-800 dark:text-slate-200">{job.devices?.model}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Color</p>
                <p className="text-slate-800 dark:text-slate-200">{job.devices?.color ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Serial</p>
                <p className="text-slate-800 dark:text-slate-200">{job.devices?.serial_number ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">IMEI</p>
                <p className="text-slate-800 dark:text-slate-200">{job.devices?.imei ?? '—'}</p>
              </div>
              {job.device_condition && (
                <div>
                  <p className="text-xs text-slate-400">Condition</p>
                  <p className="text-slate-800 dark:text-slate-200">{DEVICE_CONDITION_LABELS[job.device_condition]}</p>
                </div>
              )}
            </div>
            <p className="mt-3 text-xs text-slate-400">Reported Issue</p>
            <p className="text-sm text-slate-700 dark:text-slate-200">{job.reported_issue}</p>

            {job.physical_damage_details && (
              <>
                <p className="mt-3 text-xs text-slate-400">Physical Damage Details</p>
                <p className="text-sm text-slate-700 dark:text-slate-200">{job.physical_damage_details}</p>
              </>
            )}

            {job.accessories_received.length > 0 && (
              <>
                <p className="mt-3 text-xs text-slate-400">Accessories Received</p>
                <p className="text-sm text-slate-700 dark:text-slate-200">{job.accessories_received.join(', ')}</p>
              </>
            )}
          </Card>

          {canSeeSecurity && (
            <Card className="p-5">
              <h2 className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">Device Security Details</h2>
              <p className="mb-3 text-xs text-slate-400">Sensitive — never printed, cleared automatically once delivered.</p>
              {job.passcode || job.icloud_account || job.security_notes ? (
                <div className="space-y-2 text-sm">
                  {job.passcode && (
                    <p className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                      <Lock className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-xs text-slate-400">PIN/Password:</span> {job.passcode}
                    </p>
                  )}
                  {job.icloud_account && (
                    <p className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                      <Lock className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-xs text-slate-400">iCloud/Apple ID:</span> {job.icloud_account}
                    </p>
                  )}
                  {job.security_notes && (
                    <p className="text-slate-700 dark:text-slate-200">
                      <span className="text-xs text-slate-400">Notes: </span>
                      {job.security_notes}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No security details recorded.</p>
              )}
            </Card>
          )}

          {canSeeFinancials && (
            <Card className="p-5">
              <EstimateSection job={job} editable={!!canManage} onUpdated={load} />
            </Card>
          )}

          <Card className="p-5">
            <PartsUsedSection jobSheetId={job.id} editable={!!canManage || !!isTechAssigned} />
          </Card>

          <Card className="p-5">
            <JobPhotosSection jobSheetId={job.id} editable={!!canManage || !!isTechAssigned} />
          </Card>

          <Card className="p-5">
            <NotesThread jobSheetId={job.id} />
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Priority & ETA</h2>
            {canManage ? (
              <div className="space-y-3">
                <Select value={job.priority} onChange={(e) => updatePriority(e.target.value as JobPriority)}>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Select>
                <Input
                  type="date"
                  value={job.estimated_completion_date ?? ''}
                  onChange={(e) => updateEta(e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-1 text-sm">
                <Badge tone={job.priority === 'urgent' ? 'danger' : job.priority === 'high' ? 'warning' : 'neutral'}>
                  {JOB_PRIORITY_LABELS[job.priority]}
                </Badge>
                {job.estimated_completion_date && (
                  <p className="text-slate-600 dark:text-slate-300">
                    ETA: {new Date(job.estimated_completion_date).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Technician</h2>
            {canManage ? (
              <Select value={job.assigned_technician_id ?? ''} onChange={(e) => assignTechnician(e.target.value)}>
                <option value="">Unassigned</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name}
                  </option>
                ))}
              </Select>
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {technicians.find((t) => t.id === job.assigned_technician_id)?.full_name ?? 'Unassigned'}
              </p>
            )}
          </Card>

          <Card className="flex flex-col items-center p-5">
            <h2 className="mb-3 self-start text-sm font-semibold text-slate-700 dark:text-slate-200">Device Tag QR</h2>
            <QRCodeSVG value={`${window.location.origin}/job-sheets/${job.id}`} size={140} />
            <p className="mt-2 text-xs text-slate-400">{job.job_number}</p>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Timeline</h2>
            <div className="space-y-3">
              {history.map((h) => (
                <div key={h.id} className="flex gap-2 text-sm">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
                  <div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={h.status} kind="job" label={JOB_STATUS_LABELS[h.status]} />
                    </div>
                    <p className="text-xs text-slate-400">
                      {h.profiles?.full_name ?? 'System'} · {formatDistanceToNow(new Date(h.created_at), { addSuffix: true })}
                    </p>
                    {h.notes && <p className="text-xs text-slate-500">{h.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

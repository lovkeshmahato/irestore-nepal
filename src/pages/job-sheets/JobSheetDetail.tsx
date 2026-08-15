import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Printer, Lock, ShieldCheck, FileText, Pencil, Trash2 } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { JobSheet, JobStatus, JobStatusHistory, Profile, Warranty, JobPriority, ConditionChecklist, DeviceCondition } from '../../types'
import { JOB_STATUS_LABELS, DEVICE_CONDITION_LABELS, JOB_PRIORITY_LABELS } from '../../types'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input, Select, TextArea, FormRow } from '../../components/ui/Field'
import { Badge, StatusBadge } from '../../components/ui/Badge'
import { FullPageSpinner } from '../../components/ui/Spinner'
import { Modal } from '../../components/ui/Modal'
import { ChipSelect } from '../../components/ui/ChipSelect'
import { StatusPipeline } from './components/StatusPipeline'
import { PartsUsedSection } from './components/PartsUsedSection'
import { NotesThread } from './components/NotesThread'
import { EstimateSection } from './components/EstimateSection'
import { JobPhotosSection } from './components/JobPhotosSection'
import { formatDistanceToNow } from 'date-fns'

const DEVICE_TYPES = ['iPhone', 'iPad', 'MacBook', 'iMac', 'Apple Watch', 'AirPods', 'Other']
const ACCESSORY_OPTIONS = ['Charger', 'Cable', 'Box', 'Case', 'SIM', 'Other']
const CHECKLIST_ITEMS: { key: keyof ConditionChecklist; label: string }[] = [
  { key: 'screen', label: 'Screen damage' },
  { key: 'back_glass', label: 'Back glass damage' },
  { key: 'buttons', label: 'Button issues' },
  { key: 'water_damage', label: 'Water damage signs' },
  { key: 'prior_repair_signs', label: 'Prior repair signs' },
]

export function JobSheetDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [job, setJob] = useState<JobSheet | null>(null)
  const [history, setHistory] = useState<JobStatusHistory[]>([])
  const [technicians, setTechnicians] = useState<Profile[]>([])
  const [warranty, setWarranty] = useState<Warranty | null>(null)
  const [invoiceId, setInvoiceId] = useState<string | null>(null)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  const isTechAssigned = profile?.role === 'technician' && job?.assigned_technician_id === profile.id
  const canManage = profile && ['super_admin', 'admin', 'front_desk'].includes(profile.role)
  const canChangeStatus = canManage || isTechAssigned
  const canSeeFinancials = profile && ['super_admin', 'admin', 'front_desk', 'accountant'].includes(profile.role)
  const canSeeSecurity = !!canManage || !!isTechAssigned
  const canDelete = profile?.role === 'super_admin'

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
            {canManage && (
              <Button variant="secondary" onClick={() => setShowEdit(true)}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            )}
            {canDelete && (
              <Button variant="danger" onClick={() => setShowDelete(true)}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
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

      <EditJobSheetModal
        open={showEdit}
        job={job}
        canSeeSecurity={canSeeSecurity}
        onClose={() => setShowEdit(false)}
        onSaved={() => {
          setShowEdit(false)
          load()
        }}
      />
      <DeleteJobSheetModal
        open={showDelete}
        job={job}
        onClose={() => setShowDelete(false)}
        onDeleted={() => navigate('/job-sheets')}
      />
    </div>
  )
}

function EditJobSheetModal({
  open,
  job,
  canSeeSecurity,
  onClose,
  onSaved,
}: {
  open: boolean
  job: JobSheet
  canSeeSecurity: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [deviceType, setDeviceType] = useState('iPhone')
  const [model, setModel] = useState('')
  const [imei, setImei] = useState('')
  const [color, setColor] = useState('')
  const [deviceCondition, setDeviceCondition] = useState<DeviceCondition>('good')
  const [accessories, setAccessories] = useState<string[]>([])
  const [reportedIssue, setReportedIssue] = useState('')
  const [physicalDamageDetails, setPhysicalDamageDetails] = useState('')
  const [checklist, setChecklist] = useState<ConditionChecklist>({})
  const [passcode, setPasscode] = useState('')
  const [icloudAccount, setIcloudAccount] = useState('')
  const [securityNotes, setSecurityNotes] = useState('')
  const [estimatedCost, setEstimatedCost] = useState<number | ''>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setDeviceType(job.devices?.device_type ?? 'iPhone')
    setModel(job.devices?.model ?? '')
    setImei(job.devices?.imei ?? '')
    setColor(job.devices?.color ?? '')
    setDeviceCondition(job.device_condition ?? 'good')
    setAccessories(job.accessories_received ?? [])
    setReportedIssue(job.reported_issue ?? '')
    setPhysicalDamageDetails(job.physical_damage_details ?? '')
    setChecklist(job.condition_checklist ?? {})
    setPasscode(job.passcode ?? '')
    setIcloudAccount(job.icloud_account ?? '')
    setSecurityNotes(job.security_notes ?? '')
    setEstimatedCost(job.estimated_cost ?? '')
    setError(null)
  }, [open, job])

  async function handleSubmit() {
    if (!model.trim() || !reportedIssue.trim()) {
      setError('Device model and reported issue are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const { error: deviceError } = await supabase
        .from('devices')
        .update({ device_type: deviceType, model, color: color || null, imei: imei || null })
        .eq('id', job.device_id)
      if (deviceError) throw deviceError

      const jobPatch: Partial<JobSheet> = {
        reported_issue: reportedIssue,
        physical_damage_details: physicalDamageDetails || null,
        device_condition: deviceCondition,
        accessories_received: accessories,
        condition_checklist: checklist,
        estimated_cost: estimatedCost === '' ? null : estimatedCost,
      }
      if (canSeeSecurity) {
        jobPatch.passcode = passcode || null
        jobPatch.icloud_account = icloudAccount || null
        jobPatch.security_notes = securityNotes || null
      }
      const { error: jobError } = await supabase.from('job_sheets').update(jobPatch).eq('id', job.id)
      if (jobError) throw jobError

      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Job Sheet" size="xl">
      <div className="space-y-6">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Device Information</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormRow label="Device type" required>
              <Select value={deviceType} onChange={(e) => setDeviceType(e.target.value)}>
                {DEVICE_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </FormRow>
            <FormRow label="Device model" required>
              <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. iPhone 13 Pro" />
            </FormRow>
            <FormRow label="IMEI / Serial Number">
              <Input value={imei} onChange={(e) => setImei(e.target.value)} />
            </FormRow>
            <FormRow label="Device color">
              <Input value={color} onChange={(e) => setColor(e.target.value)} />
            </FormRow>
            <FormRow label="Device condition" required>
              <Select value={deviceCondition} onChange={(e) => setDeviceCondition(e.target.value as DeviceCondition)}>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
                <option value="damaged">Damaged</option>
              </Select>
            </FormRow>
          </div>
          <FormRow label="Accessories submitted">
            <ChipSelect options={ACCESSORY_OPTIONS} value={accessories} onChange={setAccessories} />
          </FormRow>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Issue Details</h3>
          <FormRow label="Reported issue" required>
            <TextArea rows={3} value={reportedIssue} onChange={(e) => setReportedIssue(e.target.value)} />
          </FormRow>
          <FormRow label="Physical damage details">
            <TextArea rows={2} value={physicalDamageDetails} onChange={(e) => setPhysicalDamageDetails(e.target.value)} />
          </FormRow>
          <h4 className="mb-2 mt-4 text-xs font-semibold uppercase text-slate-400">Condition Checklist</h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {CHECKLIST_ITEMS.map((item) => (
              <label key={item.key} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={!!checklist[item.key]}
                  onChange={(e) => setChecklist((c) => ({ ...c, [item.key]: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-primary-600"
                />
                {item.label}
              </label>
            ))}
          </div>
        </div>

        {canSeeSecurity && (
          <div>
            <h3 className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">Device Security Details</h3>
            <p className="mb-3 text-xs text-slate-400">Sensitive — cleared automatically once delivered.</p>
            <div className="space-y-4">
              <FormRow label="Device PIN / Password">
                <Input value={passcode} onChange={(e) => setPasscode(e.target.value)} />
              </FormRow>
              <FormRow label="iCloud / Apple ID account">
                <Input value={icloudAccount} onChange={(e) => setIcloudAccount(e.target.value)} />
              </FormRow>
              <FormRow label="Security notes">
                <TextArea rows={2} value={securityNotes} onChange={(e) => setSecurityNotes(e.target.value)} />
              </FormRow>
            </div>
          </div>
        )}

        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Estimate</h3>
          <FormRow label="Estimated cost (NPR)">
            <Input
              type="number"
              min={0}
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
            />
          </FormRow>
        </div>

        {error && <p className="text-sm text-danger-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function DeleteJobSheetModal({
  open,
  job,
  onClose,
  onDeleted,
}: {
  open: boolean
  job: JobSheet
  onClose: () => void
  onDeleted: () => void
}) {
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [blocked, setBlocked] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setBlocked(null)
  }, [open])

  async function handleConfirm() {
    setWorking(true)
    setError(null)
    setBlocked(null)

    const [{ count: invoiceCount, error: invError }, { count: warrantyCount, error: warError }] = await Promise.all([
      supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('job_sheet_id', job.id),
      supabase.from('warranties').select('id', { count: 'exact', head: true }).eq('job_sheet_id', job.id),
    ])

    if (invError || warError) {
      setWorking(false)
      setError((invError ?? warError)?.message ?? 'Could not check linked records.')
      return
    }

    if ((invoiceCount ?? 0) > 0 || (warrantyCount ?? 0) > 0) {
      setWorking(false)
      setBlocked(
        `Cannot delete — this job sheet has ${invoiceCount ?? 0} invoice(s) and ${warrantyCount ?? 0} warranty(ies) linked. Delete those first if you really need to remove this record.`
      )
      return
    }

    try {
      await supabase.from('job_status_history').delete().eq('job_sheet_id', job.id)
      await supabase.from('job_photos').delete().eq('job_sheet_id', job.id)
      await supabase.from('job_notes').delete().eq('job_sheet_id', job.id)
      await supabase.from('job_parts_used').delete().eq('job_sheet_id', job.id)
      await supabase.from('part_serials').update({ job_sheet_id: null, status: 'in_stock' }).eq('job_sheet_id', job.id)

      const { error: jobDeleteError } = await supabase.from('job_sheets').delete().eq('id', job.id)
      if (jobDeleteError) throw jobDeleteError

      const { count: otherJobsWithDevice } = await supabase
        .from('job_sheets')
        .select('id', { count: 'exact', head: true })
        .eq('device_id', job.device_id)
      if (!otherJobsWithDevice || otherJobsWithDevice === 0) {
        await supabase.from('devices').delete().eq('id', job.device_id)
      }

      onDeleted()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete job sheet')
    } finally {
      setWorking(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Delete Job Sheet" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          This will <span className="font-semibold text-danger-600">permanently delete</span> job sheet{' '}
          <span className="font-semibold">{job.job_number}</span>, including its full status timeline, photos, notes, and
          parts-used records. Any serialized parts used on this job will be unlinked and returned to stock as{' '}
          <span className="font-medium">in stock</span>. If the associated device isn&apos;t referenced by any other job
          sheet, its record will be removed too. This action cannot be undone.
        </p>
        {error && <p className="text-sm text-danger-600">{error}</p>}
        {blocked && <p className="text-sm text-danger-600">{blocked}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={handleConfirm} disabled={working || !!blocked}>
            {working ? 'Deleting…' : 'Delete Permanently'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

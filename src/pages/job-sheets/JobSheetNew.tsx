import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { Customer, ConditionChecklist } from '../../types'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { FormRow, Input, Select, TextArea } from '../../components/ui/Field'
import { ChipSelect } from '../../components/ui/ChipSelect'
import { PhotoUpload, type UploadedPhoto } from '../../components/ui/PhotoUpload'
import { CustomerPicker } from '../../components/CustomerPicker'

const DEVICE_TYPES = ['iPhone', 'iPad', 'MacBook', 'iMac', 'Apple Watch', 'AirPods', 'Other']
const ACCESSORY_OPTIONS = ['Charger', 'Cable', 'Box', 'Case', 'SIM Tool', 'Screen Protector', 'Other']
const CHECKLIST_ITEMS: { key: keyof ConditionChecklist; label: string }[] = [
  { key: 'screen', label: 'Screen damage' },
  { key: 'back_glass', label: 'Back glass damage' },
  { key: 'buttons', label: 'Button issues' },
  { key: 'water_damage', label: 'Water damage signs' },
  { key: 'prior_repair_signs', label: 'Prior repair signs' },
]

export function JobSheetNew() {
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [deviceType, setDeviceType] = useState('iPhone')
  const [model, setModel] = useState('')
  const [color, setColor] = useState('')
  const [serial, setSerial] = useState('')
  const [imei, setImei] = useState('')
  const [passcode, setPasscode] = useState('')
  const [reportedIssue, setReportedIssue] = useState('')
  const [checklist, setChecklist] = useState<ConditionChecklist>({})
  const [accessories, setAccessories] = useState<string[]>([])
  const [photos, setPhotos] = useState<UploadedPhoto[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!customer) {
      setError('Select or add a customer first.')
      return
    }
    if (!model.trim() || !reportedIssue.trim()) {
      setError('Device model and reported issue are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const { data: device, error: deviceError } = await supabase
        .from('devices')
        .insert({
          customer_id: customer.id,
          device_type: deviceType,
          model,
          color: color || null,
          serial_number: serial || null,
          imei: imei || null,
        })
        .select()
        .single()
      if (deviceError) throw deviceError

      const { data: jobNumber, error: numberError } = await supabase.rpc('next_job_number')
      if (numberError) throw numberError

      const { data: job, error: jobError } = await supabase
        .from('job_sheets')
        .insert({
          job_number: jobNumber,
          customer_id: customer.id,
          device_id: device.id,
          passcode: passcode || null,
          reported_issue: reportedIssue,
          condition_checklist: checklist,
          accessories_received: accessories,
          status: 'received',
          created_by: profile?.id,
        })
        .select()
        .single()
      if (jobError) throw jobError

      await supabase.from('job_status_history').insert({
        job_sheet_id: job.id,
        status: 'received',
        changed_by: profile?.id,
      })

      if (photos.length > 0) {
        await supabase.from('job_photos').insert(
          photos.map((p) => ({ job_sheet_id: job.id, stage: 'before', storage_path: p.storagePath }))
        )
      }

      navigate(`/job-sheets/${job.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create job sheet')
      setSaving(false)
    }
  }

  return (
    <div>
      <button
        onClick={() => navigate('/job-sheets')}
        className="mb-4 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Job Sheets
      </button>
      <PageHeader title="New Job Sheet" description="Intake a device for repair" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Customer</h2>
            <CustomerPicker value={customer} onSelect={setCustomer} />
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Device Details</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormRow label="Device type" required>
                <Select value={deviceType} onChange={(e) => setDeviceType(e.target.value)}>
                  {DEVICE_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </Select>
              </FormRow>
              <FormRow label="Model" required>
                <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. iPhone 13 Pro" />
              </FormRow>
              <FormRow label="Color">
                <Input value={color} onChange={(e) => setColor(e.target.value)} />
              </FormRow>
              <FormRow label="Serial number">
                <Input value={serial} onChange={(e) => setSerial(e.target.value)} />
              </FormRow>
              <FormRow label="IMEI">
                <Input value={imei} onChange={(e) => setImei(e.target.value)} />
              </FormRow>
              <FormRow label="Passcode / Pattern (confidential)">
                <Input value={passcode} onChange={(e) => setPasscode(e.target.value)} placeholder="Cleared once job closed" />
              </FormRow>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Reported Issue</h2>
            <TextArea
              rows={3}
              value={reportedIssue}
              onChange={(e) => setReportedIssue(e.target.value)}
              placeholder="Describe the issue the customer reported…"
            />

            <h3 className="mb-2 mt-4 text-xs font-semibold uppercase text-slate-400">Condition Checklist</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Accessories Included</h2>
            <ChipSelect options={ACCESSORY_OPTIONS} value={accessories} onChange={setAccessories} />
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Before-Repair Photos</h2>
            <PhotoUpload
              bucket="job-photos"
              pathPrefix="intake"
              photos={photos}
              onChange={setPhotos}
            />
          </Card>
        </div>

        <div>
          <Card className="sticky top-20 p-5">
            {error && <p className="mb-3 text-sm text-danger-600">{error}</p>}
            <Button onClick={handleSubmit} disabled={saving} className="w-full">
              {saving ? 'Creating…' : 'Create Job Sheet'}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}

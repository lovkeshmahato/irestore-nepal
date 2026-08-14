import { useState } from 'react'
import { Wrench, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { DEVICE_ISSUE_OPTIONS } from '../../types'
import { Button } from '../../components/ui/Button'
import { FormRow, Input, Select, TextArea } from '../../components/ui/Field'
import { ChipSelect } from '../../components/ui/ChipSelect'
import { PhotoUpload, type UploadedPhoto } from '../../components/ui/PhotoUpload'

const DEVICE_TYPES = ['iPhone', 'iPad', 'MacBook', 'iMac', 'Apple Watch', 'AirPods', 'Other']
const ACCESSORY_OPTIONS = ['Charger', 'Cable', 'Box', 'Case', 'Original Bill', 'Other']
const CONDITION_ITEMS = [
  { key: 'powers_on', label: 'Powers on normally' },
  { key: 'screen_intact', label: 'Screen is not cracked' },
  { key: 'battery_healthy', label: 'Battery health is good' },
  { key: 'all_buttons_work', label: 'All buttons work' },
  { key: 'no_water_damage', label: 'No water damage' },
  { key: 'body_intact', label: 'Body/back glass not cracked' },
]

export function SellYourDevice() {
  const [step, setStep] = useState<'form' | 'done'>('form')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [deviceType, setDeviceType] = useState('iPhone')
  const [model, setModel] = useState('')
  const [color, setColor] = useState('')
  const [storage, setStorage] = useState('')
  const [condition, setCondition] = useState<Record<string, boolean>>({})
  const [accessories, setAccessories] = useState<string[]>([])
  const [deviceIssues, setDeviceIssues] = useState<string[]>([])
  const [issueDetails, setIssueDetails] = useState('')
  const [details, setDetails] = useState('')
  const [photos, setPhotos] = useState<UploadedPhoto[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requestNumber, setRequestNumber] = useState('')

  async function handleSubmit() {
    if (!name || !phone || !model) {
      setError('Please fill in your name, phone, and device model.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const { data: reqNumber, error: numError } = await supabase.rpc('next_sell_request_number')
      if (numError) throw numError

      const requestId = crypto.randomUUID()
      const { error: reqError } = await supabase.from('sell_requests').insert({
        id: requestId,
        request_number: reqNumber,
        seller_name: name,
        seller_phone: phone,
        seller_email: email || null,
        device_type: deviceType,
        model,
        color: color || null,
        storage_capacity: storage || null,
        condition_self_report: condition,
        accessories,
        device_issues: deviceIssues,
        issue_details: issueDetails || null,
        additional_details: details || null,
      })
      if (reqError) throw reqError

      if (photos.length > 0) {
        await supabase.from('sell_request_photos').insert(
          photos.map((p) => ({ sell_request_id: requestId, storage_path: p.storagePath }))
        )
      }

      setRequestNumber(reqNumber)
      setStep('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-primary-50 to-slate-100 px-4 py-10 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-white">
            <Wrench className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Sell Your Device</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Get a quick, fair quote for your used Apple device.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          {step === 'done' ? (
            <div className="flex flex-col items-center py-6 text-center">
              <CheckCircle2 className="mb-3 h-12 w-12 text-success-600" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Request submitted!</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Reference: <span className="font-medium">{requestNumber}</span>
              </p>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                Our team will review your device details and contact you at {phone} with a quote.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormRow label="Full name" required>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </FormRow>
                <FormRow label="Phone" required>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                </FormRow>
              </div>
              <FormRow label="Email">
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </FormRow>

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
                <FormRow label="Storage">
                  <Input value={storage} onChange={(e) => setStorage(e.target.value)} placeholder="e.g. 128GB" />
                </FormRow>
              </div>

              <FormRow label="Condition self-report">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {CONDITION_ITEMS.map((item) => (
                    <label key={item.key} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={!!condition[item.key]}
                        onChange={(e) => setCondition((c) => ({ ...c, [item.key]: e.target.checked }))}
                        className="h-4 w-4 rounded border-slate-300 text-primary-600"
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              </FormRow>

              <FormRow label="Accessories included">
                <ChipSelect options={ACCESSORY_OPTIONS} value={accessories} onChange={setAccessories} />
              </FormRow>

              <FormRow label="Device Issue / Damage Details">
                <ChipSelect options={[...DEVICE_ISSUE_OPTIONS]} value={deviceIssues} onChange={setDeviceIssues} />
              </FormRow>

              <FormRow label="Describe the issue(s)">
                <TextArea
                  rows={2}
                  value={issueDetails}
                  onChange={(e) => setIssueDetails(e.target.value)}
                  placeholder="e.g. crack in bottom-left corner of screen, battery drains fast"
                />
              </FormRow>

              <FormRow label="Additional details">
                <TextArea rows={3} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Anything else we should know?" />
              </FormRow>

              <FormRow label="Photos">
                <PhotoUpload bucket="sell-request-photos" pathPrefix="submissions" photos={photos} onChange={setPhotos} maxPhotos={7} />
              </FormRow>

              {error && <p className="text-sm text-danger-600">{error}</p>}

              <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                {submitting ? 'Submitting…' : 'Get My Quote'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

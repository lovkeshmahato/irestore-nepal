import { useState } from 'react'
import { Wrench, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { FormRow, Input, Select, TextArea } from '../../components/ui/Field'

const TIME_SLOTS = ['10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM']

export function BookAppointment() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [device, setDevice] = useState('')
  const [issue, setIssue] = useState('')
  const [date, setDate] = useState('')
  const [slot, setSlot] = useState(TIME_SLOTS[0])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit() {
    if (!name || !phone || !device || !issue || !date) {
      setError('Please fill in all fields.')
      return
    }
    setSubmitting(true)
    setError(null)
    const { error } = await supabase.from('appointments').insert({
      name,
      phone,
      device,
      issue,
      preferred_date: date,
      preferred_time_slot: slot,
    })
    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    setDone(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-primary-50 to-slate-100 px-4 py-10 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-white">
            <Wrench className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Book an Appointment</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Reserve a time slot for your repair.</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          {done ? (
            <div className="flex flex-col items-center py-6 text-center">
              <CheckCircle2 className="mb-3 h-12 w-12 text-success-600" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Appointment requested!</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                We'll confirm your slot on {date} at {slot} by calling {phone}.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <FormRow label="Full name" required>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </FormRow>
              <FormRow label="Phone" required>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </FormRow>
              <FormRow label="Device" required>
                <Input value={device} onChange={(e) => setDevice(e.target.value)} placeholder="e.g. iPhone 13 Pro" />
              </FormRow>
              <FormRow label="Issue" required>
                <TextArea rows={2} value={issue} onChange={(e) => setIssue(e.target.value)} />
              </FormRow>
              <div className="grid grid-cols-2 gap-4">
                <FormRow label="Preferred date" required>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={new Date().toISOString().slice(0, 10)} />
                </FormRow>
                <FormRow label="Time slot" required>
                  <Select value={slot} onChange={(e) => setSlot(e.target.value)}>
                    {TIME_SLOTS.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </Select>
                </FormRow>
              </div>
              {error && <p className="text-sm text-danger-600">{error}</p>}
              <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                {submitting ? 'Booking…' : 'Book Appointment'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

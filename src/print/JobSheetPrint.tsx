import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import type { JobSheet } from '../types'
import { FullPageSpinner } from '../components/ui/Spinner'
import { PrintLayout } from './PrintLayout'

export function JobSheetPrint() {
  const { id } = useParams()
  const [job, setJob] = useState<JobSheet | null>(null)

  useEffect(() => {
    if (!id) return
    supabase
      .from('job_sheets')
      .select('*, customers(*), devices(*)')
      .eq('id', id)
      .single()
      .then(({ data }) => setJob(data as JobSheet))
  }, [id])

  if (!job) return <FullPageSpinner />

  const checklistLabels: Record<string, string> = {
    screen: 'Screen damage',
    back_glass: 'Back glass damage',
    buttons: 'Button issues',
    water_damage: 'Water damage signs',
    prior_repair_signs: 'Prior repair signs',
  }

  return (
    <PrintLayout title="Job Sheet">
      <div className="mb-4 flex items-start justify-between print:text-black">
        <div>
          <h3 className="text-xl font-bold text-slate-900 print:text-black dark:text-slate-50">{job.job_number}</h3>
          <p className="text-sm text-slate-500 print:text-black">Received {new Date(job.created_at).toLocaleString()}</p>
        </div>
        <QRCodeSVG value={`${window.location.origin}/job-sheets/${job.id}`} size={72} />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-6 text-sm print:text-black">
        <div>
          <h4 className="mb-1 text-xs font-semibold uppercase text-slate-400 print:text-black">Customer</h4>
          <p className="text-slate-800 print:text-black dark:text-slate-200">{job.customers?.full_name}</p>
          <p className="text-slate-500 print:text-black">{job.customers?.phone}</p>
          <p className="text-slate-500 print:text-black">{job.customers?.email}</p>
        </div>
        <div>
          <h4 className="mb-1 text-xs font-semibold uppercase text-slate-400 print:text-black">Device</h4>
          <p className="text-slate-800 print:text-black dark:text-slate-200">
            {job.devices?.device_type} — {job.devices?.model} ({job.devices?.color})
          </p>
          <p className="text-slate-500 print:text-black">Serial: {job.devices?.serial_number ?? '—'}</p>
          <p className="text-slate-500 print:text-black">IMEI: {job.devices?.imei ?? '—'}</p>
        </div>
      </div>

      <div className="mb-4 text-sm print:text-black">
        <h4 className="mb-1 text-xs font-semibold uppercase text-slate-400 print:text-black">Reported Issue</h4>
        <p className="text-slate-800 print:text-black dark:text-slate-200">{job.reported_issue}</p>
      </div>

      <div className="mb-4 text-sm print:text-black">
        <h4 className="mb-1 text-xs font-semibold uppercase text-slate-400 print:text-black">Condition Checklist</h4>
        <ul className="list-inside list-disc text-slate-700 print:text-black dark:text-slate-300">
          {Object.entries(job.condition_checklist)
            .filter(([, v]) => v)
            .map(([k]) => (
              <li key={k}>{checklistLabels[k] ?? k}</li>
            ))}
          {Object.values(job.condition_checklist).every((v) => !v) && <li>No pre-existing damage noted</li>}
        </ul>
      </div>

      <div className="mb-4 text-sm print:text-black">
        <h4 className="mb-1 text-xs font-semibold uppercase text-slate-400 print:text-black">Accessories Received</h4>
        <p className="text-slate-800 print:text-black dark:text-slate-200">
          {job.accessories_received.length > 0 ? job.accessories_received.join(', ') : 'None'}
        </p>
      </div>

      <p className="mt-6 border-t border-slate-200 pt-3 text-xs text-slate-400 print:text-black">
        By signing below, the customer acknowledges the device condition noted above at intake. i-Restore is an
        independent repair centre; all warranty terms are in-house and not affiliated with any device manufacturer.
      </p>
    </PrintLayout>
  )
}

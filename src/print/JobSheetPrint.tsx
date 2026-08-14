import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Printer, Scissors } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import clsx from 'clsx'
import { supabase } from '../lib/supabase'
import type { JobSheet, Profile } from '../types'
import { JOB_PRIORITY_LABELS } from '../types'
import { FullPageSpinner } from '../components/ui/Spinner'
import { Button } from '../components/ui/Button'
import { usePrintSettings } from './PrintLayout'

// Standalone A4 print layout with two tear-off sections — deliberately does not
// reuse <PrintLayout> since the two-section cut-line design needs its own flow.
export function JobSheetPrint() {
  const { id } = useParams()
  const [job, setJob] = useState<JobSheet | null>(null)
  const [technician, setTechnician] = useState<Profile | null>(null)
  const settings = usePrintSettings()

  useEffect(() => {
    if (!id) return
    supabase
      .from('job_sheets')
      .select('*, customers(*), devices(*)')
      .eq('id', id)
      .single()
      .then(({ data }) => setJob(data as JobSheet))
  }, [id])

  useEffect(() => {
    if (!job?.assigned_technician_id) {
      setTechnician(null)
      return
    }
    supabase
      .from('profiles')
      .select('*')
      .eq('id', job.assigned_technician_id)
      .single()
      .then(({ data }) => setTechnician(data as Profile | null))
  }, [job?.assigned_technician_id])

  if (!job) return <FullPageSpinner />

  const alignment = settings?.print_header_alignment ?? 'left'
  const trackingUrl = `${window.location.origin}/track-repair?job=${job.job_number}`
  const jobDetailUrl = `${window.location.origin}/job-sheets/${job.id}`

  return (
    <div className="min-h-screen bg-slate-100 py-8 dark:bg-slate-950 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-3xl justify-end px-4 print:hidden">
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </Button>
      </div>

      <div
        id="printable-area"
        className="mx-auto max-w-3xl bg-white p-8 text-slate-900 shadow-sm print:shadow-none print:text-black dark:bg-slate-900 dark:text-slate-50 print:dark:bg-white"
      >
        {/* Shared business header */}
        <div
          className={clsx(
            'mb-6 border-b border-slate-200 pb-4 print:text-black',
            alignment === 'center' ? 'flex flex-col items-center gap-2 text-center' : 'flex items-start justify-between'
          )}
        >
          <div className={clsx('flex items-center gap-3', alignment === 'center' && 'flex-col text-center')}>
            {settings?.logo_url && <img src={settings.logo_url} alt="" className="h-12 w-12 object-contain" />}
            <div>
              <h1 className="text-lg font-bold text-slate-900 print:text-black dark:text-slate-50">
                {settings?.business_name ?? 'i-Restore'}
              </h1>
              {settings?.address && <p className="text-xs text-slate-500 print:text-black">{settings.address}</p>}
              {(settings?.phone || settings?.email) && (
                <p className="text-xs text-slate-500 print:text-black">
                  {settings?.phone}
                  {settings?.phone && settings?.email && ' · '}
                  {settings?.email}
                </p>
              )}
              {settings?.pan_vat_number && <p className="text-xs text-slate-500 print:text-black">PAN/VAT: {settings.pan_vat_number}</p>}
            </div>
          </div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400 print:text-black">Job Sheet</h2>
        </div>

        {/* Section A — Customer Copy */}
        <section className="mb-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400 print:text-black">Customer Copy</h3>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3 text-sm print:text-black">
              <div>
                <h4 className="text-xl font-bold text-slate-900 print:text-black dark:text-slate-50">{job.job_number}</h4>
                <p className="text-slate-500 print:text-black">Received {new Date(job.created_at).toLocaleString()}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h5 className="mb-1 text-xs font-semibold uppercase text-slate-400 print:text-black">Customer</h5>
                  <p className="text-slate-800 print:text-black dark:text-slate-200">{job.customers?.full_name}</p>
                  <p className="text-slate-500 print:text-black">{job.customers?.phone}</p>
                </div>
                <div>
                  <h5 className="mb-1 text-xs font-semibold uppercase text-slate-400 print:text-black">Device</h5>
                  <p className="text-slate-800 print:text-black dark:text-slate-200">
                    {job.devices?.device_type} — {job.devices?.model}
                  </p>
                  <p className="text-slate-500 print:text-black">IMEI: {job.devices?.imei ?? '—'}</p>
                </div>
              </div>

              <div>
                <h5 className="mb-1 text-xs font-semibold uppercase text-slate-400 print:text-black">Reported Issue</h5>
                <p className="text-slate-800 print:text-black dark:text-slate-200">{job.reported_issue}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h5 className="mb-1 text-xs font-semibold uppercase text-slate-400 print:text-black">Estimated Completion</h5>
                  <p className="text-slate-800 print:text-black dark:text-slate-200">
                    {job.estimated_completion_date ? new Date(job.estimated_completion_date).toLocaleDateString() : '—'}
                  </p>
                </div>
                <div>
                  <h5 className="mb-1 text-xs font-semibold uppercase text-slate-400 print:text-black">Estimated Cost</h5>
                  <p className="text-slate-800 print:text-black dark:text-slate-200">
                    {job.estimated_cost != null ? `Rs. ${job.estimated_cost.toLocaleString()}` : '—'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-center gap-1">
              <QRCodeSVG value={trackingUrl} size={80} />
              <p className="text-center text-[9px] text-slate-400 print:text-black">Scan to Track</p>
            </div>
          </div>

          {settings?.terms_conditions_text && (
            <p className="mt-4 text-[10px] leading-relaxed text-slate-400 print:text-black">
              <span className="font-semibold">Terms &amp; Conditions:</span> {settings.terms_conditions_text}
            </p>
          )}

          <div className="mt-4 w-56">
            <div className="mb-1 h-10 border-b border-slate-300" />
            <p className="text-xs text-slate-500 print:text-black">Customer Signature</p>
          </div>
        </section>

        {/* Cut line */}
        <div className="relative my-6 border-t-2 border-dashed border-slate-300 print:border-black">
          <span className="absolute left-1/2 top-0 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 bg-white px-2 text-[10px] font-medium uppercase tracking-wide text-slate-400 print:bg-white print:text-black dark:bg-slate-900 print:dark:bg-white">
            <Scissors className="h-3 w-3" /> Cut Here
          </span>
        </div>

        {/* Section B — Device Copy (compact tag, meant to be attached to the device) */}
        <section>
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 print:text-black">Device Copy</h3>

          <div className="flex items-start justify-between gap-3 rounded border border-slate-200 p-3 text-xs print:border-black print:text-black">
            <div className="space-y-0.5">
              <p className="text-2xl font-bold leading-tight text-slate-900 print:text-black dark:text-slate-50">{job.job_number}</p>
              <p className="text-slate-700 print:text-black dark:text-slate-300">{job.customers?.full_name}</p>
              <p className="text-slate-700 print:text-black dark:text-slate-300">
                {job.devices?.device_type} {job.devices?.model}
              </p>
              <p className="text-slate-500 print:text-black">IMEI: {job.devices?.imei ?? '—'}</p>
              <p className="text-slate-500 print:text-black">Technician: {technician?.full_name ?? 'Unassigned'}</p>
              <p className="text-slate-500 print:text-black">Priority: {JOB_PRIORITY_LABELS[job.priority]}</p>
              <p className="text-slate-500 print:text-black">Received: {new Date(job.created_at).toLocaleDateString()}</p>
            </div>

            <div className="flex shrink-0 flex-col items-center gap-1">
              <QRCodeSVG value={jobDetailUrl} size={64} />
              <p className="text-center text-[8px] text-slate-400 print:text-black">Scan for Status</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

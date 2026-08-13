import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Warranty } from '../types'
import { FullPageSpinner } from '../components/ui/Spinner'
import { PrintLayout, usePrintSettings } from './PrintLayout'

type WarrantyRow = Omit<Warranty, 'job_sheets'> & {
  job_sheets?: { job_number: string; customers?: { full_name: string }; devices?: { model: string } }
}

export function WarrantyPrint() {
  const { id } = useParams()
  const [warranty, setWarranty] = useState<WarrantyRow | null>(null)
  const settings = usePrintSettings()

  useEffect(() => {
    if (!id) return
    supabase
      .from('warranties')
      .select('*, job_sheets(job_number, customers(full_name), devices(model))')
      .eq('id', id)
      .single()
      .then(({ data }) => setWarranty(data as unknown as WarrantyRow))
  }, [id])

  if (!warranty) return <FullPageSpinner />

  return (
    <PrintLayout title="Warranty Card">
      <div className="mb-4 print:text-black">
        <h3 className="text-xl font-bold text-slate-900 print:text-black dark:text-slate-50">Warranty Card</h3>
        <p className="text-sm text-slate-500 print:text-black">Job Reference: {warranty.job_sheets?.job_number}</p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-6 text-sm print:text-black">
        <div>
          <h4 className="mb-1 text-xs font-semibold uppercase text-slate-400 print:text-black">Customer</h4>
          <p className="text-slate-800 print:text-black dark:text-slate-200">{warranty.job_sheets?.customers?.full_name}</p>
        </div>
        <div>
          <h4 className="mb-1 text-xs font-semibold uppercase text-slate-400 print:text-black">Device</h4>
          <p className="text-slate-800 print:text-black dark:text-slate-200">{warranty.job_sheets?.devices?.model}</p>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-slate-200 p-4 text-sm print:text-black">
        <p className="mb-1">
          <span className="font-semibold">Coverage:</span> {warranty.coverage_description}
        </p>
        <p className="mb-1">
          <span className="font-semibold">Period:</span> {warranty.period_days} days
        </p>
        <p className="mb-1">
          <span className="font-semibold">Valid:</span> {new Date(warranty.start_date).toLocaleDateString()} to{' '}
          {new Date(warranty.end_date).toLocaleDateString()}
        </p>
      </div>

      <div className="mb-4 text-sm print:text-black">
        <h4 className="mb-1 text-xs font-semibold uppercase text-slate-400 print:text-black">What's Covered</h4>
        <p className="text-slate-700 print:text-black dark:text-slate-300">
          This warranty covers defects in workmanship and/or the installed part described above under normal use.
          It does not cover physical damage, liquid damage, or unauthorized repairs performed elsewhere after this
          service. This is an in-house warranty issued by {settings?.business_name ?? 'i-Restore'}, an independent
          repair centre, and is not affiliated with or backed by any device manufacturer.
        </p>
      </div>

      <div className="text-sm print:text-black">
        <h4 className="mb-1 text-xs font-semibold uppercase text-slate-400 print:text-black">For Warranty Claims</h4>
        <p className="text-slate-700 print:text-black dark:text-slate-300">
          Contact {settings?.phone} or {settings?.email} and reference job {warranty.job_sheets?.job_number}.
        </p>
      </div>
    </PrintLayout>
  )
}

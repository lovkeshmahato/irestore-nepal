import { useState } from 'react'
import { Send, Check, X } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { JobSheet } from '../../../types'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Field'

export function EstimateSection({
  job,
  editable,
  onUpdated,
}: {
  job: JobSheet
  editable: boolean
  onUpdated: () => void
}) {
  const [cost, setCost] = useState(job.estimated_cost ?? 0)
  const [saving, setSaving] = useState(false)

  async function saveCost() {
    setSaving(true)
    await supabase.from('job_sheets').update({ estimated_cost: cost }).eq('id', job.id)
    setSaving(false)
    onUpdated()
  }

  async function sendEstimate(channel: string) {
    await saveCost()
    await supabase.functions.invoke('send-estimate', { body: { jobSheetId: job.id, channel } })
    onUpdated()
  }

  async function recordApproval(approved: boolean) {
    await supabase
      .from('job_sheets')
      .update({
        approved_by_customer: approved,
        approval_timestamp: new Date().toISOString(),
        approval_method: 'in_person',
        status: approved ? 'approved' : 'declined',
      })
      .eq('id', job.id)
    await supabase.from('job_status_history').insert({
      job_sheet_id: job.id,
      status: approved ? 'approved' : 'declined',
      notes: `Customer ${approved ? 'approved' : 'rejected'} estimate in person`,
    })
    onUpdated()
  }

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Estimate & Approval</h2>
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500">Rs.</span>
        <Input
          type="number"
          value={cost}
          onChange={(e) => setCost(Number(e.target.value))}
          disabled={!editable}
          className="max-w-[140px]"
        />
        {editable && (
          <Button size="sm" variant="secondary" onClick={saveCost} disabled={saving}>
            Save
          </Button>
        )}
      </div>

      {editable && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => sendEstimate('sms')}>
            <Send className="h-3.5 w-3.5" /> Send via SMS
          </Button>
          <Button size="sm" variant="secondary" onClick={() => sendEstimate('whatsapp')}>
            <Send className="h-3.5 w-3.5" /> Send via WhatsApp
          </Button>
          <Button size="sm" variant="secondary" onClick={() => sendEstimate('email')}>
            <Send className="h-3.5 w-3.5" /> Send via Email
          </Button>
        </div>
      )}

      {job.approved_by_customer === null || job.approved_by_customer === undefined ? (
        editable && (
          <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button size="sm" onClick={() => recordApproval(true)}>
              <Check className="h-3.5 w-3.5" /> Log in-person approval
            </Button>
            <Button size="sm" variant="danger" onClick={() => recordApproval(false)}>
              <X className="h-3.5 w-3.5" /> Log rejection
            </Button>
          </div>
        )
      ) : (
        <p className={`mt-3 text-sm font-medium ${job.approved_by_customer ? 'text-success-600' : 'text-danger-600'}`}>
          {job.approved_by_customer ? 'Approved' : 'Rejected'} by customer
          {job.approval_timestamp && ` on ${new Date(job.approval_timestamp).toLocaleString()}`}
          {job.approval_method && ` (${job.approval_method.replace('_', ' ')})`}
        </p>
      )}
    </div>
  )
}

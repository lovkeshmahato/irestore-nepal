// Supabase Edge Function: send-estimate
//
// Sends a job sheet's repair estimate to the customer via SMS/WhatsApp/email.
// The actual messaging provider integration (Sparrow SMS, WhatsApp Business
// API, an email provider, etc.) is a placeholder here — wire in real
// credentials and an HTTP call to your provider of choice when ready.
//
// Called from the app as:
//   supabase.functions.invoke('send-estimate', { body: { jobSheetId, channel } })

import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const { jobSheetId, channel } = await req.json()
    if (!jobSheetId) {
      return new Response(JSON.stringify({ error: 'jobSheetId is required' }), { status: 400 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: job, error } = await supabase
      .from('job_sheets')
      .select('job_number, estimated_cost, customers(full_name, phone, email)')
      .eq('id', jobSheetId)
      .single()

    if (error || !job) {
      return new Response(JSON.stringify({ error: error?.message ?? 'Job sheet not found' }), { status: 404 })
    }

    // TODO: integrate a real provider here, e.g.:
    //   - SMS: Sparrow SMS / Aakash SMS (popular Nepal SMS gateways)
    //   - WhatsApp: WhatsApp Business Cloud API
    //   - Email: Resend / SendGrid
    // For now this just records that an estimate was "sent".
    console.log(`[send-estimate] channel=${channel} job=${job.job_number} cost=${job.estimated_cost}`)

    await supabase
      .from('job_status_history')
      .insert({ job_sheet_id: jobSheetId, status: 'estimate_sent', notes: `Estimate sent via ${channel ?? 'link'}` })

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), { status: 500 })
  }
})

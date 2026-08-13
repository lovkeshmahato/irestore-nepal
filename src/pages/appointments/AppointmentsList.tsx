import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Appointment } from '../../types'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { FullPageSpinner } from '../../components/ui/Spinner'

export function AppointmentsList() {
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState<Appointment[] | null>(null)

  async function load() {
    const { data } = await supabase.from('appointments').select('*').order('preferred_date')
    setAppointments(data ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  async function cancel(id: string) {
    await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id)
    load()
  }

  if (!appointments) return <FullPageSpinner />

  return (
    <div>
      <PageHeader title="Appointments" description={`${appointments.length} booking requests`} />
      <Card className="overflow-hidden">
        {appointments.length === 0 ? (
          <EmptyState title="No appointment requests yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Device / Issue</th>
                  <th className="px-4 py-3 font-medium">Preferred</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {appointments.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{a.name}</td>
                    <td className="px-4 py-3 text-slate-500">{a.phone}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {a.device} — {a.issue}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {a.preferred_date} · {a.preferred_time_slot}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={a.status === 'converted' ? 'success' : a.status === 'cancelled' ? 'danger' : 'warning'}>{a.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {a.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" onClick={() => navigate('/job-sheets/new')}>
                            Convert
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => cancel(a.id)}>
                            Cancel
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

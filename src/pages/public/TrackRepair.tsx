import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Wrench, Search, Check } from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Field'
import { JOB_STATUS_FLOW, JOB_STATUS_LABELS, type JobStatus } from '../../types'

const PUBLIC_STEPS: JobStatus[] = ['received', 'in_repair', 'ready_for_pickup', 'delivered']

interface TrackResult {
  job_number: string
  status: JobStatus
  device_type: string
  model: string
  created_at: string
  updated_at: string
  delivered_at: string | null
}

export function TrackRepair() {
  const [params] = useSearchParams()
  const jobParam = params.get('job')
  const [query, setQuery] = useState(jobParam ?? '')
  const [results, setResults] = useState<TrackResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSearch(overrideQuery?: string) {
    const q = (overrideQuery ?? query).trim()
    if (!q) return
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.rpc('track_repair', { p_query: q })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setResults(data ?? [])
  }

  useEffect(() => {
    if (jobParam) handleSearch(jobParam)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobParam])

  function publicStepIndex(status: JobStatus) {
    if (status === 'declined') return -1
    if (JOB_STATUS_FLOW.indexOf(status) <= JOB_STATUS_FLOW.indexOf('received')) return 0
    if (status === 'delivered') return 3
    if (status === 'ready_for_pickup' || status === 'qc') return 2
    return 1
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-primary-50 to-slate-100 px-4 py-10 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-white">
            <Wrench className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Track My Repair</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Enter your phone number or job number.</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div className="flex gap-2">
            <Input
              placeholder="Phone number or Job # (e.g. JS-00001)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={() => handleSearch()} disabled={loading}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
          {error && <p className="mt-3 text-sm text-danger-600">{error}</p>}

          {results && results.length === 0 && (
            <p className="mt-4 text-sm text-slate-500">No job found. Check the phone number or job number and try again.</p>
          )}

          {results && results.length > 0 && (
            <div className="mt-6 space-y-6">
              {results.map((r) => (
                <div key={r.job_number} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-semibold text-slate-900 dark:text-slate-50">{r.job_number}</p>
                    <p className="text-sm text-slate-500">
                      {r.device_type} {r.model}
                    </p>
                  </div>
                  {r.status === 'declined' ? (
                    <p className="text-sm font-medium text-danger-600">Declined / Cancelled</p>
                  ) : (
                    <div className="flex items-center">
                      {PUBLIC_STEPS.map((step, i) => {
                        const currentIndex = publicStepIndex(r.status)
                        const done = i <= currentIndex
                        return (
                          <div key={step} className="flex flex-1 flex-col items-center">
                            <div className="flex w-full items-center">
                              {i > 0 && <div className={clsx('h-0.5 flex-1', done ? 'bg-primary-600' : 'bg-slate-200 dark:bg-slate-700')} />}
                              <div
                                className={clsx(
                                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs',
                                  done ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-400 dark:bg-slate-700'
                                )}
                              >
                                {done && <Check className="h-3.5 w-3.5" />}
                              </div>
                              {i < PUBLIC_STEPS.length - 1 && (
                                <div className={clsx('h-0.5 flex-1', i < currentIndex ? 'bg-primary-600' : 'bg-slate-200 dark:bg-slate-700')} />
                              )}
                            </div>
                            <span className="mt-1 text-center text-[11px] text-slate-500">{JOB_STATUS_LABELS[step]}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <p className="mt-3 text-xs text-slate-400">Last updated {new Date(r.updated_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

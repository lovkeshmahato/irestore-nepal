import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import type { JobNote } from '../../../types'
import { Button } from '../../../components/ui/Button'
import { TextArea } from '../../../components/ui/Field'
import { formatDistanceToNow } from 'date-fns'

export function NotesThread({ jobSheetId }: { jobSheetId: string }) {
  const { profile } = useAuth()
  const [notes, setNotes] = useState<JobNote[]>([])
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data } = await supabase
      .from('job_notes')
      .select('*, profiles(*)')
      .eq('job_sheet_id', jobSheetId)
      .order('created_at', { ascending: false })
    setNotes((data ?? []) as JobNote[])
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobSheetId])

  async function handleAdd() {
    if (!text.trim()) return
    setSaving(true)
    await supabase.from('job_notes').insert({ job_sheet_id: jobSheetId, author_id: profile?.id, note: text })
    setText('')
    setSaving(false)
    load()
  }

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Internal Notes (staff only)</h2>
      <div className="mb-3 flex gap-2">
        <TextArea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Add an internal note…" />
        <Button onClick={handleAdd} disabled={saving || !text.trim()}>
          Add
        </Button>
      </div>
      <div className="space-y-3">
        {notes.map((n) => (
          <div key={n.id} className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
            <p className="text-slate-700 dark:text-slate-200">{n.note}</p>
            <p className="mt-1 text-xs text-slate-400">
              {n.profiles?.full_name ?? 'Staff'} · {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

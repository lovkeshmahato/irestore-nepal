import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Profile, UserRole } from '../../types'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { FullPageSpinner } from '../../components/ui/Spinner'
import { Modal } from '../../components/ui/Modal'
import { FormRow, Input, Select } from '../../components/ui/Field'

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin / Manager',
  front_desk: 'Front Desk',
  technician: 'Technician',
  accountant: 'Accountant',
}

interface StaffPerformance {
  staffId: string
  jobsCompleted: number
}

export function StaffList() {
  const [staff, setStaff] = useState<Profile[] | null>(null)
  const [performance, setPerformance] = useState<StaffPerformance[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingStaff, setEditingStaff] = useState<Profile | null>(null)
  const [deletingStaff, setDeletingStaff] = useState<Profile | null>(null)

  async function load() {
    const { data } = await supabase.from('profiles').select('*').order('full_name')
    setStaff(data ?? [])

    const { data: jobs } = await supabase.from('job_sheets').select('assigned_technician_id, status').eq('status', 'delivered')
    const counts: Record<string, number> = {}
    for (const j of jobs ?? []) {
      if (j.assigned_technician_id) counts[j.assigned_technician_id] = (counts[j.assigned_technician_id] ?? 0) + 1
    }
    setPerformance(Object.entries(counts).map(([staffId, jobsCompleted]) => ({ staffId, jobsCompleted })))
  }

  useEffect(() => {
    load()
  }, [])

  async function toggleActive(p: Profile) {
    await supabase.from('profiles').update({ is_active: !p.is_active }).eq('id', p.id)
    load()
  }

  async function updateRole(p: Profile, role: UserRole) {
    await supabase.from('profiles').update({ role }).eq('id', p.id)
    load()
  }

  if (!staff) return <FullPageSpinner />

  return (
    <div>
      <PageHeader
        title="Staff"
        description={`${staff.length} accounts`}
        actions={
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> New Staff Account
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">Jobs Completed</th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">Commission %</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {staff.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{p.full_name}</td>
                  <td className="px-4 py-3">
                    <Select value={p.role} onChange={(e) => updateRole(p, e.target.value as UserRole)} className="w-40">
                      {Object.entries(ROLE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{p.phone ?? '—'}</td>
                  <td className="hidden px-4 py-3 text-slate-500 lg:table-cell">
                    {performance.find((x) => x.staffId === p.id)?.jobsCompleted ?? (p.role === 'technician' ? 0 : '—')}
                  </td>
                  <td className="hidden px-4 py-3 text-slate-500 lg:table-cell">{p.commission_rate != null ? `${p.commission_rate}%` : '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(p)}>
                      <Badge tone={p.is_active ? 'success' : 'danger'}>{p.is_active ? 'Active' : 'Disabled'}</Badge>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingStaff(p)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeletingStaff(p)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-danger-600/20"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
          {staff.map((p) => (
            <div key={p.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{p.full_name}</span>
                <button onClick={() => toggleActive(p)}>
                  <Badge tone={p.is_active ? 'success' : 'danger'}>{p.is_active ? 'Active' : 'Disabled'}</Badge>
                </button>
              </div>
              <div className="mt-1.5 space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                <div>{p.phone ?? '—'}</div>
                <div>
                  Jobs: {performance.find((x) => x.staffId === p.id)?.jobsCompleted ?? (p.role === 'technician' ? 0 : '—')}
                  {' · '}
                  Commission: {p.commission_rate != null ? `${p.commission_rate}%` : '—'}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Select value={p.role} onChange={(e) => updateRole(p, e.target.value as UserRole)} className="flex-1">
                  {Object.entries(ROLE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
                <button
                  onClick={() => setEditingStaff(p)}
                  className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDeletingStaff(p)}
                  className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-danger-600/20"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <AttendanceToday staff={staff} />

      <NewStaffModal open={showForm} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} />
      <EditStaffModal
        staff={editingStaff}
        onClose={() => setEditingStaff(null)}
        onSaved={() => {
          setEditingStaff(null)
          load()
        }}
      />
      <DeleteStaffModal
        staff={deletingStaff}
        onClose={() => setDeletingStaff(null)}
        onDeleted={() => {
          setDeletingStaff(null)
          load()
        }}
      />
    </div>
  )
}

function AttendanceToday({ staff }: { staff: Profile[] }) {
  const today = new Date().toISOString().slice(0, 10)
  const [records, setRecords] = useState<Record<string, string>>({})

  useEffect(() => {
    supabase
      .from('staff_attendance')
      .select('staff_id, status')
      .eq('date', today)
      .then(({ data }) => setRecords(Object.fromEntries((data ?? []).map((r) => [r.staff_id, r.status]))))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function setStatus(staffId: string, status: string) {
    await supabase.from('staff_attendance').upsert({ staff_id: staffId, date: today, status }, { onConflict: 'staff_id,date' })
    setRecords((r) => ({ ...r, [staffId]: status }))
  }

  return (
    <Card className="mt-6 p-5">
      <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Today's Attendance</h2>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {staff.map((p) => (
          <div key={p.id} className="flex items-center justify-between py-2 text-sm">
            <span className="text-slate-700 dark:text-slate-300">{p.full_name}</span>
            <Select value={records[p.id] ?? ''} onChange={(e) => setStatus(p.id, e.target.value)} className="w-32">
              <option value="">Not marked</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="half_day">Half Day</option>
              <option value="leave">Leave</option>
            </Select>
          </div>
        ))}
      </div>
    </Card>
  )
}

function NewStaffModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<UserRole>('front_desk')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!fullName || !email || !password) {
      setError('Full name, email, and password are required.')
      return
    }
    setSaving(true)
    setError(null)
    const { error } = await supabase.functions.invoke('create-staff', {
      body: { email, password, fullName, role, phone: phone || undefined },
    })
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title="New Staff Account">
      <div className="space-y-4">
        <FormRow label="Full name" required>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </FormRow>
        <FormRow label="Email" required>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormRow>
        <FormRow label="Temporary password" required>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </FormRow>
        <FormRow label="Phone">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </FormRow>
        <FormRow label="Role" required>
          <Select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            {Object.entries(ROLE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </FormRow>
        {error && <p className="text-sm text-danger-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Creating…' : 'Create Account'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function EditStaffModal({
  staff,
  onClose,
  onSaved,
}: {
  staff: Profile | null
  onClose: () => void
  onSaved: () => void
}) {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<UserRole>('front_desk')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!staff) return
    setFullName(staff.full_name)
    setPhone(staff.phone ?? '')
    setRole(staff.role)
    setIsActive(staff.is_active)
    setError(null)
  }, [staff])

  async function handleSubmit() {
    if (!staff) return
    if (!fullName.trim()) {
      setError('Full name is required.')
      return
    }
    setSaving(true)
    setError(null)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, role, phone: phone || null, is_active: isActive })
      .eq('id', staff.id)
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    onSaved()
  }

  return (
    <Modal open={!!staff} onClose={onClose} title="Edit Staff Account">
      <div className="space-y-4">
        <FormRow label="Full name" required>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </FormRow>
        <FormRow label="Phone">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </FormRow>
        <FormRow label="Role" required>
          <Select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            {Object.entries(ROLE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </FormRow>
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-primary-600"
          />
          Active (can sign in and access the system)
        </label>
        {error && <p className="text-sm text-danger-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function DeleteStaffModal({
  staff,
  onClose,
  onDeleted,
}: {
  staff: Profile | null
  onClose: () => void
  onDeleted: () => void
}) {
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)

  useEffect(() => {
    setError(null)
    setResult(null)
  }, [staff])

  async function handleConfirm() {
    if (!staff) return
    setWorking(true)
    setError(null)
    setResult(null)

    const [{ count: jobCount, error: jobError }, { count: attCount, error: attError }] = await Promise.all([
      supabase
        .from('job_sheets')
        .select('id', { count: 'exact', head: true })
        .or(`assigned_technician_id.eq.${staff.id},created_by.eq.${staff.id}`),
      supabase.from('staff_attendance').select('id', { count: 'exact', head: true }).eq('staff_id', staff.id),
    ])

    if (jobError || attError) {
      setWorking(false)
      setError((jobError ?? attError)?.message ?? 'Could not check linked records.')
      return
    }

    const hasLinkedRecords = (jobCount ?? 0) > 0 || (attCount ?? 0) > 0

    if (hasLinkedRecords) {
      const { error } = await supabase.from('profiles').update({ is_active: false }).eq('id', staff.id)
      setWorking(false)
      if (error) {
        setError(error.message)
        return
      }
      setResult('deactivated')
      onDeleted()
      return
    }

    const { error } = await supabase.from('profiles').delete().eq('id', staff.id)
    setWorking(false)
    if (error) {
      setError(error.message)
      return
    }
    setResult('deleted')
    onDeleted()
  }

  return (
    <Modal open={!!staff} onClose={onClose} title="Remove Staff Access" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          This will remove {staff?.full_name}&apos;s access. Existing job sheets they worked on stay in history. If they have
          no linked records, their account will be permanently deleted — otherwise it will be deactivated.
        </p>
        {error && <p className="text-sm text-danger-600">{error}</p>}
        {result && <p className="text-sm text-success-600">{result === 'deleted' ? 'Account deleted.' : 'Account deactivated.'}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={handleConfirm} disabled={working || !!result}>
            {working ? 'Working…' : 'Confirm'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Settings as SettingsType } from '../../types'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { FormRow, Input, Select, TextArea } from '../../components/ui/Field'
import { FullPageSpinner } from '../../components/ui/Spinner'

const EXPORT_TABLES = ['customers', 'job_sheets', 'invoices', 'payments', 'sell_requests'] as const

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    rows = [{}]
  }
  const headers = Array.from(rows.reduce((set, r) => { Object.keys(r).forEach((k) => set.add(k)); return set }, new Set<string>()))
  const csvRows = [headers, ...rows.map((r) => headers.map((h) => (r[h] === null || r[h] === undefined ? '' : String(r[h]))))]
  const csv = csvRows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function Settings() {
  const [settings, setSettings] = useState<SettingsType | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [exporting, setExporting] = useState(false)

  async function load() {
    const { data } = await supabase.from('settings').select('*').limit(1).single()
    setSettings(data as SettingsType)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleSave() {
    if (!settings) return
    setSaving(true)
    const { id, updated_at: _updatedAt, ...rest } = settings
    await supabase.from('settings').update(rest).eq('id', id)
    setSaving(false)
    setSavedAt(Date.now())
  }

  async function uploadLogo(file: File) {
    if (!settings) return
    const path = `logo/${crypto.randomUUID()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('business-assets').upload(path, file)
    if (error) return
    const { data } = supabase.storage.from('business-assets').getPublicUrl(path)
    setSettings({ ...settings, logo_url: data.publicUrl })
  }

  async function handleExportAll() {
    setExporting(true)
    for (const table of EXPORT_TABLES) {
      const { data } = await supabase.from(table).select('*')
      downloadCsv(`${table}.csv`, (data ?? []) as Record<string, unknown>[])
    }
    setExporting(false)
  }

  if (!settings) return <FullPageSpinner />

  return (
    <div>
      <PageHeader title="Settings" description="Business info, warranty defaults, and numbering — Super Admin only" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Business Info</h2>
          <div className="space-y-4">
            <FormRow label="Business name">
              <Input value={settings.business_name} onChange={(e) => setSettings({ ...settings, business_name: e.target.value })} />
            </FormRow>
            <FormRow label="Address">
              <Input value={settings.address ?? ''} onChange={(e) => setSettings({ ...settings, address: e.target.value })} />
            </FormRow>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormRow label="Phone">
                <Input value={settings.phone ?? ''} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} />
              </FormRow>
              <FormRow label="Email">
                <Input value={settings.email ?? ''} onChange={(e) => setSettings({ ...settings, email: e.target.value })} />
              </FormRow>
            </div>
            <FormRow label="PAN / VAT Number">
              <Input value={settings.pan_vat_number ?? ''} onChange={(e) => setSettings({ ...settings, pan_vat_number: e.target.value })} />
            </FormRow>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormRow label="Default Tax Rate (%)">
                <Input
                  type="number"
                  min={0}
                  value={settings.default_tax_rate}
                  onChange={(e) => setSettings({ ...settings, default_tax_rate: Number(e.target.value) })}
                />
              </FormRow>
              <FormRow label="Print Header Alignment">
                <Select
                  value={settings.print_header_alignment}
                  onChange={(e) => setSettings({ ...settings, print_header_alignment: e.target.value as 'left' | 'center' })}
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                </Select>
              </FormRow>
            </div>
            <FormRow label="Logo">
              <div className="flex items-center gap-3">
                {settings.logo_url && <img src={settings.logo_url} alt="Logo" className="h-10 w-10 rounded object-contain" />}
                <input type="file" accept="image/*" onChange={(e) => e.target.files && uploadLogo(e.target.files[0])} className="text-sm" />
              </div>
            </FormRow>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Warranty Defaults (days)</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {Object.entries(settings.warranty_defaults).map(([key, value]) => (
                <FormRow key={key} label={key.charAt(0).toUpperCase() + key.slice(1)}>
                  <Input
                    type="number"
                    value={value}
                    onChange={(e) =>
                      setSettings({ ...settings, warranty_defaults: { ...settings.warranty_defaults, [key]: Number(e.target.value) } })
                    }
                  />
                </FormRow>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Numbering</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormRow label="Job Sheet Prefix">
                <Input value={settings.job_sheet_prefix} onChange={(e) => setSettings({ ...settings, job_sheet_prefix: e.target.value })} />
              </FormRow>
              <FormRow label="Job Sheet Next Number">
                <Input
                  type="number"
                  min={1}
                  value={settings.job_sheet_next_number}
                  onChange={(e) => setSettings({ ...settings, job_sheet_next_number: Number(e.target.value) })}
                />
              </FormRow>
              <FormRow label="Invoice Prefix">
                <Input value={settings.invoice_prefix} onChange={(e) => setSettings({ ...settings, invoice_prefix: e.target.value })} />
              </FormRow>
              <FormRow label="Invoice Next Number">
                <Input
                  type="number"
                  min={1}
                  value={settings.invoice_next_number}
                  onChange={(e) => setSettings({ ...settings, invoice_next_number: Number(e.target.value) })}
                />
              </FormRow>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Terms & Conditions</h2>
            <FormRow label="Printed on invoices, job sheets, and warranty cards">
              <TextArea
                rows={5}
                value={settings.terms_conditions_text ?? ''}
                onChange={(e) => setSettings({ ...settings, terms_conditions_text: e.target.value })}
              />
            </FormRow>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Notification Preferences</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormRow label="Low stock threshold (default)">
                <Input
                  type="number"
                  value={settings.low_stock_threshold_default}
                  onChange={(e) => setSettings({ ...settings, low_stock_threshold_default: Number(e.target.value) })}
                />
              </FormRow>
              <FormRow label="Overdue invoice reminder (days)">
                <Input
                  type="number"
                  value={settings.overdue_reminder_days}
                  onChange={(e) => setSettings({ ...settings, overdue_reminder_days: Number(e.target.value) })}
                />
              </FormRow>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Backup / Export</h2>
            <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
              Downloads customers, job sheets, invoices, payments, and sell requests as separate CSV files.
            </p>
            <Button variant="secondary" onClick={handleExportAll} disabled={exporting}>
              {exporting ? 'Exporting…' : 'Export All Data'}
            </Button>
          </Card>

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Settings'}
            </Button>
            {savedAt && <span className="text-sm text-success-600">Saved</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

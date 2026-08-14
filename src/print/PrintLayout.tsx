import { useEffect, useState, type ReactNode } from 'react'
import { Printer } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Settings } from '../types'
import { Button } from '../components/ui/Button'

export function usePrintSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  useEffect(() => {
    supabase.from('settings').select('*').limit(1).single().then(({ data }) => setSettings(data as Settings))
  }, [])
  return settings
}

export function PrintLayout({
  title,
  children,
  showLogo = true,
  showAddress = true,
  showPhone = true,
  showEmail = true,
}: {
  title: string
  children: ReactNode
  showLogo?: boolean
  showAddress?: boolean
  showPhone?: boolean
  showEmail?: boolean
}) {
  const settings = usePrintSettings()

  return (
    <div className="min-h-screen bg-slate-100 py-8 dark:bg-slate-950 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-3xl justify-end px-4 print:hidden">
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </Button>
      </div>

      <div id="printable-area" className="mx-auto max-w-3xl bg-white p-8 shadow-sm print:shadow-none dark:bg-slate-900 print:dark:bg-white">
        <div className="mb-6 flex items-start justify-between border-b border-slate-200 pb-4 print:text-black">
          <div className="flex items-center gap-3">
            {showLogo && settings?.logo_url && <img src={settings.logo_url} alt="" className="h-12 w-12 object-contain" />}
            <div>
              <h1 className="text-lg font-bold text-slate-900 print:text-black dark:text-slate-50">
                {settings?.business_name ?? 'i-Restore'}
              </h1>
              {showAddress && <p className="text-xs text-slate-500 print:text-black">{settings?.address}</p>}
              {(showPhone || showEmail) && (
                <p className="text-xs text-slate-500 print:text-black">
                  {showPhone && settings?.phone}
                  {showPhone && showEmail && settings?.phone && settings?.email && ' · '}
                  {showEmail && settings?.email}
                </p>
              )}
              {settings?.pan_vat_number && <p className="text-xs text-slate-500 print:text-black">PAN/VAT: {settings.pan_vat_number}</p>}
            </div>
          </div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400 print:text-black">{title}</h2>
        </div>

        {children}

        <div className="mt-10 grid grid-cols-2 gap-8 print:text-black">
          <div>
            <div className="mb-1 h-12 border-b border-slate-300" />
            <p className="text-xs text-slate-500 print:text-black">Customer Signature</p>
          </div>
          <div>
            <div className="mb-1 h-12 border-b border-slate-300" />
            <p className="text-xs text-slate-500 print:text-black">Staff Signature</p>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { SellRequest } from '../../types'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { FullPageSpinner } from '../../components/ui/Spinner'
import { Input } from '../../components/ui/Field'

interface RefurbRow {
  id: string
  sell_request_id: string
  status: string
  listed_price: number | null
  sold_price: number | null
  sell_requests?: SellRequest
}

export function RefurbList() {
  const [items, setItems] = useState<RefurbRow[] | null>(null)

  async function load() {
    const { data } = await supabase
      .from('refurb_items')
      .select('*, sell_requests(*)')
      .order('created_at', { ascending: false })
    setItems((data ?? []) as unknown as RefurbRow[])
  }

  useEffect(() => {
    load()
  }, [])

  async function updateItem(id: string, patch: Partial<RefurbRow>) {
    await supabase.from('refurb_items').update(patch).eq('id', id)
    load()
  }

  if (!items) return <FullPageSpinner />

  return (
    <div>
      <PageHeader title="Refurb / Resale" description={`${items.length} purchased devices`} />
      <Card className="overflow-hidden">
        {items.length === 0 ? (
          <EmptyState title="No refurb items yet" description="Devices appear here once a buyback is paid out." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Device</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Listed Price</th>
                  <th className="px-4 py-3 font-medium">Sold Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-slate-800 dark:text-slate-200">
                      {item.sell_requests?.device_type} {item.sell_requests?.model}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={item.status}
                        onChange={(e) => updateItem(item.id, { status: e.target.value })}
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
                      >
                        <option value="in_refurb">In Refurb</option>
                        <option value="listed">Listed</option>
                        <option value="sold">Sold</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        className="w-28"
                        value={item.listed_price ?? ''}
                        onChange={(e) => updateItem(item.id, { listed_price: Number(e.target.value) })}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {item.status === 'sold' ? (
                        <Input
                          type="number"
                          className="w-28"
                          value={item.sold_price ?? ''}
                          onChange={(e) => updateItem(item.id, { sold_price: Number(e.target.value) })}
                        />
                      ) : (
                        <Badge>—</Badge>
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

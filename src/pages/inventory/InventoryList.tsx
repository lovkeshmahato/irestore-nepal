import { useEffect, useState } from 'react'
import { Plus, Search, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Part } from '../../types'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Field'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { FullPageSpinner } from '../../components/ui/Spinner'
import { PartFormModal } from './PartFormModal'
import { StockAdjustModal } from './StockAdjustModal'

export function InventoryList() {
  const [parts, setParts] = useState<Part[] | null>(null)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingPart, setEditingPart] = useState<Part | null>(null)
  const [adjustingPart, setAdjustingPart] = useState<Part | null>(null)

  async function load() {
    let query = supabase.from('parts').select('*').order('name')
    if (search.trim()) query = query.ilike('name', `%${search}%`)
    const { data } = await query
    setParts(data ?? [])
  }

  useEffect(() => {
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  if (!parts) return <FullPageSpinner />

  return (
    <div>
      <PageHeader
        title="Inventory"
        description={`${parts.length} parts in catalog`}
        actions={
          <Button
            onClick={() => {
              setEditingPart(null)
              setShowForm(true)
            }}
          >
            <Plus className="h-4 w-4" /> New Part
          </Button>
        }
      />

      <div className="mb-4 max-w-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Search parts…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card className="overflow-hidden">
        {parts.length === 0 ? (
          <EmptyState title="No parts in catalog yet" />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="hidden px-4 py-3 font-medium lg:table-cell">Category</th>
                    <th className="hidden px-4 py-3 font-medium lg:table-cell">Type</th>
                    <th className="px-4 py-3 font-medium">Cost</th>
                    <th className="px-4 py-3 font-medium">Sale Price</th>
                    <th className="px-4 py-3 font-medium">Stock</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {parts.map((p) => {
                    const low = p.stock_qty <= p.reorder_threshold
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                          <button onClick={() => { setEditingPart(p); setShowForm(true) }} className="hover:text-primary-600">
                            {p.name}
                          </button>
                          {p.is_serialized && <Badge tone="info">Serialized</Badge>}
                        </td>
                        <td className="hidden px-4 py-3 text-slate-500 lg:table-cell">{p.category ?? '—'}</td>
                        <td className="hidden px-4 py-3 text-slate-500 capitalize lg:table-cell">{p.part_type}</td>
                        <td className="px-4 py-3 text-slate-500">Rs. {p.cost_price.toLocaleString()}</td>
                        <td className="px-4 py-3 text-slate-500">Rs. {p.sale_price.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={low ? 'flex items-center gap-1 font-medium text-danger-600' : 'text-slate-700 dark:text-slate-300'}>
                            {low && <AlertTriangle className="h-3.5 w-3.5" />}
                            {p.stock_qty}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" variant="secondary" onClick={() => setAdjustingPart(p)}>
                            Adjust Stock
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
              {parts.map((p) => {
                const low = p.stock_qty <= p.reorder_threshold
                return (
                  <div key={p.id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() => { setEditingPart(p); setShowForm(true) }}
                        className="text-left text-sm font-semibold text-slate-900 hover:text-primary-600 dark:text-slate-100"
                      >
                        {p.name}
                      </button>
                      {p.is_serialized && <Badge tone="info">Serialized</Badge>}
                    </div>
                    <div className="mt-1.5 space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                      <div>
                        {p.category ?? '—'} &middot; <span className="capitalize">{p.part_type}</span>
                      </div>
                      <div>
                        Cost Rs. {p.cost_price.toLocaleString()} &middot; Sale Rs. {p.sale_price.toLocaleString()}
                      </div>
                      <div className={low ? 'flex items-center gap-1 font-medium text-danger-600' : ''}>
                        {low && <AlertTriangle className="h-3.5 w-3.5" />}
                        Stock: {p.stock_qty}
                      </div>
                    </div>
                    <div className="mt-3">
                      <Button size="sm" variant="secondary" onClick={() => setAdjustingPart(p)}>
                        Adjust Stock
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </Card>

      <PartFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        part={editingPart}
        onSaved={() => {
          setShowForm(false)
          load()
        }}
      />
      <StockAdjustModal
        open={!!adjustingPart}
        part={adjustingPart}
        onClose={() => setAdjustingPart(null)}
        onSaved={() => {
          setAdjustingPart(null)
          load()
        }}
      />
    </div>
  )
}

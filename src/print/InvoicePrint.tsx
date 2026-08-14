import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Invoice, Payment } from '../types'
import { FullPageSpinner } from '../components/ui/Spinner'
import { PrintLayout } from './PrintLayout'

export function InvoicePrint() {
  const { id } = useParams()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from('invoices').select('*, customers(*)').eq('id', id).single(),
      supabase.from('payments').select('*').eq('invoice_id', id),
    ]).then(([inv, pays]) => {
      setInvoice(inv.data as Invoice)
      setPayments(pays.data ?? [])
    })
  }, [id])

  if (!invoice) return <FullPageSpinner />

  return (
    <PrintLayout
      title="Invoice"
      showLogo={invoice.doc_show_logo}
      showAddress={invoice.doc_show_address}
      showPhone={invoice.doc_show_phone}
      showEmail={invoice.doc_show_email}
    >
      <div className="mb-4 flex items-start justify-between print:text-black">
        <div>
          <h3 className="text-xl font-bold text-slate-900 print:text-black dark:text-slate-50">{invoice.invoice_number}</h3>
          <p className="text-sm text-slate-500 print:text-black">{new Date(invoice.created_at).toLocaleDateString()}</p>
        </div>
        <div className="text-right text-sm print:text-black">
          <p className="font-medium text-slate-800 print:text-black dark:text-slate-200">{invoice.customers?.full_name}</p>
          <p className="text-slate-500 print:text-black">{invoice.customers?.phone}</p>
          {invoice.pan_vat_number && <p className="text-slate-500 print:text-black">PAN/VAT: {invoice.pan_vat_number}</p>}
        </div>
      </div>

      <table className="w-full text-sm print:text-black">
        <thead className="border-b border-slate-300 text-left text-xs uppercase text-slate-400 print:text-black">
          <tr>
            <th className="pb-2">Description</th>
            <th className="pb-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {invoice.repair_charge > 0 && (
            <tr>
              <td className="py-2 text-slate-800 print:text-black dark:text-slate-200">Repair Charge</td>
              <td className="py-2 text-right text-slate-800 print:text-black dark:text-slate-200">Rs. {invoice.repair_charge.toLocaleString()}</td>
            </tr>
          )}
          {invoice.parts_cost > 0 && (
            <tr>
              <td className="py-2 text-slate-800 print:text-black dark:text-slate-200">Parts Cost</td>
              <td className="py-2 text-right text-slate-800 print:text-black dark:text-slate-200">Rs. {invoice.parts_cost.toLocaleString()}</td>
            </tr>
          )}
          {invoice.labour_charge > 0 && (
            <tr>
              <td className="py-2 text-slate-800 print:text-black dark:text-slate-200">Labour Charge</td>
              <td className="py-2 text-right text-slate-800 print:text-black dark:text-slate-200">Rs. {invoice.labour_charge.toLocaleString()}</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end print:text-black">
        <div className="w-64 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500 print:text-black">Subtotal</span>
            <span className="print:text-black">Rs. {invoice.subtotal.toLocaleString()}</span>
          </div>
          {invoice.discount_amount > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-500 print:text-black">Discount</span>
              <span className="print:text-black">-Rs. {invoice.discount_amount.toLocaleString()}</span>
            </div>
          )}
          {invoice.doc_show_vat && (
            <div className="flex justify-between">
              <span className="text-slate-500 print:text-black">VAT ({invoice.vat_rate}%)</span>
              <span className="print:text-black">Rs. {invoice.vat_amount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-semibold print:text-black">
            <span>Grand Total</span>
            <span>Rs. {invoice.total.toLocaleString()}</span>
          </div>
          <div className="flex justify-between print:text-black">
            <span className="text-slate-500 print:text-black">Amount Paid</span>
            <span className="print:text-black">Rs. {invoice.amount_paid.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-semibold print:text-black">
            <span>Balance Due</span>
            <span>Rs. {invoice.balance_due.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {payments.length > 0 && (
        <div className="mt-4 text-sm print:text-black">
          <h4 className="mb-1 text-xs font-semibold uppercase text-slate-400 print:text-black">Payments</h4>
          {payments.map((p) => (
            <p key={p.id} className="text-slate-600 print:text-black dark:text-slate-300">
              Rs. {p.amount.toLocaleString()} via {p.method.replace('_', ' ')} on {new Date(p.paid_at).toLocaleDateString()}
            </p>
          ))}
        </div>
      )}

      {invoice.notes && (
        <div className="mt-4 text-sm print:text-black">
          <h4 className="mb-1 text-xs font-semibold uppercase text-slate-400 print:text-black">Notes</h4>
          <p className="text-slate-600 print:text-black dark:text-slate-300">{invoice.notes}</p>
        </div>
      )}

      <p className="mt-6 border-t border-slate-200 pt-3 text-xs text-slate-400 print:text-black">
        This invoice is issued by an independent, non-authorized Apple repair centre. Prices are inclusive of any
        applicable VAT as noted above. Thank you for your business.
      </p>
    </PrintLayout>
  )
}

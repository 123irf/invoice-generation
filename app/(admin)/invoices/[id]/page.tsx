import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth';
import { getBusinessSettings, getTaxSettings } from '@/lib/settings';
import { formatCurrency, formatDate } from '@/lib/currency';
import { StatusBadge } from '@/components/shared/status-badge';
import { InvoiceActions } from './invoice-actions';
import { computeDisplayStatus } from '../utils';

export default async function InvoiceViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = await isAdmin();

  const [invoice, business, taxSettings] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        lineItems: { orderBy: { order: 'asc' } },
        payments: { orderBy: { date: 'desc' } },
      },
    }),
    getBusinessSettings(),
    getTaxSettings(),
  ]);

  if (!invoice) notFound();

  const displayStatus = computeDisplayStatus(invoice);

  return (
    <div>
      {/* Breadcrumb */}
      <div className="text-sm text-slate-500 mb-4">
        <Link href="/invoice-generation?type=invoices" className="hover:underline">Invoices</Link>
        {' / '}
        <span className="text-slate-900">{invoice.number}</span>
      </div>

      {/* Admin Actions */}
      <InvoiceActions
        invoiceId={invoice.id}
        currentStatus={displayStatus}
        publicToken={invoice.publicToken}
        totalDue={invoice.totalDue}
        admin={admin}
      />

      {/* Invoice Visual Template */}
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {invoice.title || 'Invoice'}
            </h1>
            <p className="text-slate-600 mt-1">{invoice.number}</p>
            <StatusBadge status={displayStatus} kind="invoice" />
          </div>
          <div className="text-right text-sm text-slate-600">
            <p className="font-bold text-lg text-slate-900">{business.name}</p>
            <p className="whitespace-pre-line mt-1">{business.address}</p>
            {business.website && <p className="mt-1">{business.website}</p>}
          </div>
        </div>

        {/* From / To */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">From</h3>
            <p className="font-medium">{business.name}</p>
            <p className="text-sm text-slate-600 whitespace-pre-line">{business.address}</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">To</h3>
            <p className="font-medium">{invoice.client.businessName}</p>
            {invoice.client.firstName && (
              <p className="text-sm text-slate-600">
                {invoice.client.firstName} {invoice.client.lastName}
              </p>
            )}
            <p className="text-sm text-slate-600">{invoice.client.email}</p>
            {invoice.client.phone && <p className="text-sm text-slate-600">{invoice.client.phone}</p>}
            {invoice.client.address && (
              <p className="text-sm text-slate-600 whitespace-pre-line">{invoice.client.address}</p>
            )}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-3 gap-4 mb-8 text-sm">
          <div>
            <span className="text-slate-500">Created:</span>{' '}
            <span className="font-medium">{formatDate(invoice.createdDate)}</span>
          </div>
          <div>
            <span className="text-slate-500">Due Date:</span>{' '}
            <span className="font-medium">{formatDate(invoice.dueDate)}</span>
          </div>
          {invoice.orderNumber && (
            <div>
              <span className="text-slate-500">Order #:</span>{' '}
              <span className="font-medium">{invoice.orderNumber}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {invoice.description && (
          <div className="mb-8 text-sm text-slate-700">
            <p>{invoice.description}</p>
          </div>
        )}

        {/* Line Items Table */}
        <table className="w-full mb-6">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase">Hrs/Qty</th>
              <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase">Service</th>
              <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase">Rate/Price</th>
              <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((li) => (
              <tr key={li.id} className="border-b border-slate-100">
                <td className="py-3 text-sm">{li.qty}</td>
                <td className="py-3">
                  <div className="text-sm font-medium">{li.title}</div>
                  {li.description && (
                    <div className="text-xs text-slate-500 mt-0.5">{li.description}</div>
                  )}
                </td>
                <td className="py-3 text-sm text-right">{formatCurrency(li.rate)}</td>
                <td className="py-3 text-sm text-right font-medium">{formatCurrency(li.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-72 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Sub Total</span>
              <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">{taxSettings.taxName}</span>
              <span className="font-medium">{formatCurrency(invoice.taxAmount)}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Discount</span>
                <span className="font-medium">-{formatCurrency(invoice.discount)}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between font-bold">
              <span>Total</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
            {invoice.paid > 0 && (
              <div className="flex justify-between text-sm text-green-700">
                <span>Paid</span>
                <span>-{formatCurrency(invoice.paid)}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between font-bold text-lg">
              <span>Total Due</span>
              <span>{formatCurrency(invoice.totalDue)}</span>
            </div>
          </div>
        </div>

        {/* Terms */}
        {invoice.terms && (
          <div className="mt-8 pt-6 border-t">
            <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Terms & Conditions</h3>
            <div className="text-sm text-slate-600" dangerouslySetInnerHTML={{ __html: invoice.terms }} />
          </div>
        )}

        {/* Footer */}
        {invoice.footer && (
          <div className="mt-6 pt-4 border-t text-center">
            <div className="text-sm text-slate-500" dangerouslySetInnerHTML={{ __html: invoice.footer }} />
          </div>
        )}
      </div>

      {/* Payments Table */}
      {invoice.payments.length > 0 && (
        <div className="mt-8 max-w-4xl">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Payments</h2>
          <div className="bg-white rounded-lg border border-slate-200">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Method</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Reference</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Memo</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Amount</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoice.payments.map((p) => (
                  <tr key={p.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3 text-sm">{formatDate(p.date)}</td>
                    <td className="px-4 py-3 text-sm">{p.method}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{p.paymentId ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{p.memo ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-green-700">{formatCurrency(p.amount)}</td>
                    <td className="px-4 py-3 text-right">
                      <form action={async () => {
                        'use server';
                        const { deletePayment } = await import('../actions');
                        await deletePayment(p.id);
                      }}>
                        <button type="submit" className="text-xs text-red-500 hover:text-red-700">Delete</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

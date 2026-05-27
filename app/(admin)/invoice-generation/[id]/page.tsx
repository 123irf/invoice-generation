import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth';
import { getBusinessSettings, getTaxSettings } from '@/lib/settings';
import { formatCurrency, formatDate } from '@/lib/currency';
import { StatusBadge } from '@/components/shared/status-badge';
import { QuoteActions } from './quote-actions';

export default async function QuoteViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = await isAdmin();

  const [quote, business, taxSettings] = await Promise.all([
    prisma.quote.findUnique({
      where: { id },
      include: {
        client: true,
        lineItems: { orderBy: { order: 'asc' } },
      },
    }),
    getBusinessSettings(),
    getTaxSettings(),
  ]);

  if (!quote) notFound();

  return (
    <div>
      {/* Breadcrumb */}
      <div className="text-sm text-slate-500 mb-4">
        <Link href="/invoice-generation?type=quotations" className="hover:underline">Quotations</Link>
        {' / '}
        <span className="text-slate-900">{quote.number}</span>
      </div>

      {/* Admin Actions */}
      <QuoteActions
        quoteId={quote.id}
        currentStatus={quote.status}
        publicToken={quote.publicToken}
        convertedInvoiceId={quote.convertedInvoiceId}
        admin={admin}
      />

      {/* Quote Visual Template */}
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {quote.title || 'Quote'}
            </h1>
            <p className="text-slate-600 mt-1">{quote.number}</p>
            <StatusBadge status={quote.status} kind="quote" />
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
            <p className="font-medium">{quote.client.businessName}</p>
            {quote.client.firstName && (
              <p className="text-sm text-slate-600">
                {quote.client.firstName} {quote.client.lastName}
              </p>
            )}
            <p className="text-sm text-slate-600">{quote.client.email}</p>
            {quote.client.phone && <p className="text-sm text-slate-600">{quote.client.phone}</p>}
            {quote.client.address && (
              <p className="text-sm text-slate-600 whitespace-pre-line">{quote.client.address}</p>
            )}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-3 gap-4 mb-8 text-sm">
          <div>
            <span className="text-slate-500">Created:</span>{' '}
            <span className="font-medium">{formatDate(quote.createdDate)}</span>
          </div>
          <div>
            <span className="text-slate-500">Valid Until:</span>{' '}
            <span className="font-medium">{formatDate(quote.validUntil)}</span>
          </div>
          {quote.orderNumber && (
            <div>
              <span className="text-slate-500">Order #:</span>{' '}
              <span className="font-medium">{quote.orderNumber}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {quote.description && (
          <div className="mb-8 text-sm text-slate-700">
            <p>{quote.description}</p>
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
            {quote.lineItems.map((li) => (
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
              <span className="font-medium">{formatCurrency(quote.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">{taxSettings.taxName}</span>
              <span className="font-medium">{formatCurrency(quote.taxAmount)}</span>
            </div>
            {quote.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Discount</span>
                <span className="font-medium">-{formatCurrency(quote.discount)}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between font-bold text-lg">
              <span>Total Due</span>
              <span>{formatCurrency(quote.total)}</span>
            </div>
          </div>
        </div>

        {/* Terms */}
        {quote.terms && (
          <div className="mt-8 pt-6 border-t">
            <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Terms & Conditions</h3>
            <div className="text-sm text-slate-600" dangerouslySetInnerHTML={{ __html: quote.terms }} />
          </div>
        )}

        {/* Footer */}
        {quote.footer && (
          <div className="mt-6 pt-4 border-t text-center">
            <div className="text-sm text-slate-500" dangerouslySetInnerHTML={{ __html: quote.footer }} />
          </div>
        )}
      </div>
    </div>
  );
}

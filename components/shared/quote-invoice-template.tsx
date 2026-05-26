'use client';

import { formatCurrency, formatDate } from '@/lib/currency';

export function QuoteInvoiceTemplate({ kind, dto }: { kind: 'quote' | 'invoice'; dto: any }) {
  const isQuote = kind === 'quote';
  const showPaidWM = !isQuote && dto.status === 'PAID';
  const showAcceptedWM = isQuote && (dto.status === 'ACCEPTED' || dto.status === 'CONVERTED');
  const showDeclinedWM = isQuote && dto.status === 'DECLINED';

  return (
    <div className="relative">
      {/* Watermark */}
      {(showPaidWM || showAcceptedWM || showDeclinedWM) && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <span
            className={`text-8xl font-extrabold opacity-10 -rotate-12 ${
              showDeclinedWM ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {showPaidWM ? 'PAID' : showAcceptedWM ? 'ACCEPTED' : 'DECLINED'}
          </span>
        </div>
      )}

      <div className="relative z-10">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            {dto.business.logoUrl ? (
              <img src={dto.business.logoUrl} alt="Logo" className="h-16" />
            ) : (
              <h2 className="text-2xl font-bold text-[#2C5282]">{dto.business.name}</h2>
            )}
          </div>
          <div className="text-right">
            <h1 className="text-3xl font-bold text-[#2C5282]">{isQuote ? 'QUOTE' : 'INVOICE'}</h1>
            <div className="text-sm text-slate-500 mt-1">
              {dto.number}<br />
              Created: {formatDate(dto.createdDate)}<br />
              {isQuote ? `Valid Until: ${formatDate(dto.validUntil)}` : `Due: ${formatDate(dto.dueDate)}`}
            </div>
          </div>
        </div>

        {/* From / To boxes */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-slate-50 p-4 rounded">
            <div className="text-xs font-bold uppercase text-[#4A7BB7] mb-1">From</div>
            <div className="font-bold mb-1">{dto.business.name}</div>
            <div className="text-sm whitespace-pre-line" dangerouslySetInnerHTML={{ __html: dto.business.address }} />
            <div className="text-sm mt-2" dangerouslySetInnerHTML={{ __html: dto.business.extraInfo }} />
            {dto.business.website && <div className="text-sm mt-1">{dto.business.website}</div>}
          </div>
          <div className="bg-slate-50 p-4 rounded">
            <div className="text-xs font-bold uppercase text-[#4A7BB7] mb-1">To</div>
            <div className="font-bold mb-1">{dto.client.businessName}</div>
            {(dto.client.firstName || dto.client.lastName) && (
              <div className="text-sm">{[dto.client.firstName, dto.client.lastName].filter(Boolean).join(' ')}</div>
            )}
            <div className="text-sm">{dto.client.email}</div>
            {dto.client.address && (
              <div className="text-sm mt-2" dangerouslySetInnerHTML={{ __html: dto.client.address }} />
            )}
            {dto.client.extraInfo && (
              <div className="text-sm mt-1" dangerouslySetInnerHTML={{ __html: dto.client.extraInfo }} />
            )}
          </div>
        </div>

        {/* Title + description */}
        {dto.title && <h2 className="text-xl font-bold mb-2">{dto.title}</h2>}
        {dto.description && (
          <div className="text-sm text-slate-600 mb-4" dangerouslySetInnerHTML={{ __html: dto.description }} />
        )}

        {/* Line items table */}
        <table className="w-full mb-6 border-collapse">
          <thead>
            <tr className="bg-[#2C5282] text-white">
              <th className="text-left p-2 w-[12%]">{dto.labels.hrsQtyLabel}</th>
              <th className="text-left p-2">{dto.labels.serviceLabel}</th>
              <th className="text-right p-2 w-[18%]">{dto.labels.ratePriceLabel}</th>
              <th className="text-right p-2 w-[18%]">{dto.labels.subTotalLabel}</th>
            </tr>
          </thead>
          <tbody>
            {dto.lineItems.map((li: any, idx: number) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-slate-50' : ''}>
                <td className="p-2 align-top">{li.qty}</td>
                <td className="p-2 align-top">
                  <div className="font-medium">{li.title}</div>
                  {li.description && <div className="text-xs text-slate-500 mt-0.5">{li.description}</div>}
                </td>
                <td className="p-2 text-right align-top">{formatCurrency(li.rate)}</td>
                <td className="p-2 text-right align-top">{formatCurrency(li.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Bottom row: payment info + totals */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="col-span-3 bg-slate-50 p-4 rounded">
            <div className="text-xs font-bold uppercase text-[#4A7BB7] mb-2">Payment Methods</div>
            <div className="text-sm" dangerouslySetInnerHTML={{ __html: dto.paymentInfo }} />
          </div>
          <div className="col-span-2 space-y-1 text-sm">
            <div className="flex justify-between p-1">
              <span className="text-slate-600">{dto.labels.subTotalLabel}</span>
              <span className="font-semibold">{formatCurrency(dto.subtotal)}</span>
            </div>
            {dto.discount > 0 && (
              <div className="flex justify-between p-1">
                <span className="text-slate-600">{dto.labels.discountLabel}</span>
                <span className="font-semibold">− {formatCurrency(dto.discount)}</span>
              </div>
            )}
            {dto.taxAmount > 0 && (
              <div className="flex justify-between p-1">
                <span className="text-slate-600">{dto.taxName}</span>
                <span className="font-semibold">{formatCurrency(dto.taxAmount)}</span>
              </div>
            )}
            {!isQuote && dto.paid > 0 && (
              <div className="flex justify-between p-1">
                <span className="text-slate-600">Paid</span>
                <span className="font-semibold">− {formatCurrency(dto.paid)}</span>
              </div>
            )}
            <div className="flex justify-between p-3 bg-[#2C5282] text-white font-bold mt-2">
              <span>{isQuote ? dto.labels.totalLabel : dto.labels.totalDueLabel}</span>
              <span>{formatCurrency(isQuote ? dto.total : dto.totalDue)}</span>
            </div>
          </div>
        </div>

        {/* Terms */}
        {dto.terms && (
          <div className="border-t pt-4 mb-4 text-xs text-slate-600">
            <div className="font-bold text-slate-800 mb-1">Terms & Conditions</div>
            <div dangerouslySetInnerHTML={{ __html: dto.terms }} />
          </div>
        )}

        {/* Footer */}
        {dto.footer && (
          <div className="text-center text-xs text-slate-500 pt-4 border-t" dangerouslySetInnerHTML={{ __html: dto.footer }} />
        )}

        {/* Payments history (invoice only) */}
        {!isQuote && dto.payments?.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <h3 className="text-sm font-bold mb-2">Payment History</h3>
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th className="text-left p-1">Date</th>
                  <th className="text-left p-1">Method</th>
                  <th className="text-left p-1">Reference</th>
                  <th className="text-right p-1">Amount</th>
                </tr>
              </thead>
              <tbody>
                {dto.payments.map((p: any, idx: number) => (
                  <tr key={idx} className="border-t">
                    <td className="p-1">{formatDate(p.date)}</td>
                    <td className="p-1">{p.method}</td>
                    <td className="p-1 text-slate-500">{p.paymentId ?? '—'}</td>
                    <td className="p-1 text-right">{formatCurrency(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

# Step 9 — PDF Templates (Quote + Invoice)

## Goal

Build a single canonical PDF template using `@react-pdf/renderer` that renders both quotes
and invoices. Matches the visual style of Sample 2 from page 11 of the spec PDF. Also build
a matching HTML render of the same template used on admin view pages and public pages.

## Prerequisites

- Steps 0–8 complete

## Design Tokens

```ts
const PDF_COLORS = {
  primaryDark: '#2C5282',      // header band, totals box, footer
  primaryMedium: '#4A7BB7',    // accent
  positiveGreen: '#38A169',    // paid/accepted watermark
  negativeRed: '#C53030',      // declined watermark
  textPrimary: '#1A202C',
  textMuted: '#718096',
  borderLight: '#E2E8F0',
  rowAlt: '#F7FAFC',
  white: '#FFFFFF',
};
```

A4 portrait, Helvetica (built into react-pdf, no font registration needed).

## Steps

### 1. Build the React-PDF Template Component

`components/pdf/document-pdf.tsx`:

```tsx
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import { formatCurrency, formatDate } from '@/lib/currency';

const COLORS = {
  primaryDark: '#2C5282',
  primaryMedium: '#4A7BB7',
  positiveGreen: '#38A169',
  negativeRed: '#C53030',
  textPrimary: '#1A202C',
  textMuted: '#718096',
  borderLight: '#E2E8F0',
  rowAlt: '#F7FAFC',
  white: '#FFFFFF',
};

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: COLORS.textPrimary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  logo: { width: 120, height: 'auto' },
  businessName: { fontSize: 14, fontWeight: 'bold', color: COLORS.primaryDark },
  docLabel: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primaryDark,
    textAlign: 'right',
  },
  docMeta: { fontSize: 10, color: COLORS.textMuted, textAlign: 'right', marginTop: 4 },
  fromToRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  box: { flex: 1, padding: 12, backgroundColor: COLORS.rowAlt, borderRadius: 4 },
  boxLabel: {
    fontSize: 9,
    color: COLORS.primaryMedium,
    fontWeight: 'bold',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  boxName: { fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
  boxText: { fontSize: 10, lineHeight: 1.4, color: COLORS.textPrimary },
  itemsTable: { marginBottom: 16 },
  itemsHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryDark,
    color: COLORS.white,
    padding: 8,
    fontWeight: 'bold',
    fontSize: 10,
  },
  itemRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  itemRowAlt: { backgroundColor: COLORS.rowAlt },
  colQty: { width: '12%' },
  colService: { width: '52%' },
  colRate: { width: '18%', textAlign: 'right' },
  colAmount: { width: '18%', textAlign: 'right' },
  serviceTitle: { fontWeight: 'bold', fontSize: 10 },
  serviceDesc: { color: COLORS.textMuted, fontSize: 9, marginTop: 2 },
  bottomRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
  paymentBox: { flex: 1.4, padding: 12, backgroundColor: COLORS.rowAlt, borderRadius: 4 },
  totalsBox: { flex: 1 },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 4,
    fontSize: 10,
  },
  totalLineLabel: { color: COLORS.textMuted },
  totalLineValue: { fontWeight: 'bold' },
  totalDueLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: COLORS.primaryDark,
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 12,
    marginTop: 4,
  },
  termsBox: { marginTop: 20, padding: 12, fontSize: 9, color: COLORS.textMuted },
  termsLabel: { fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 4 },
  footer: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 8,
    color: COLORS.textMuted,
  },
  watermark: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 80,
    opacity: 0.12,
    fontWeight: 'bold',
    transform: 'rotate(-20deg)',
  },
});

interface PdfProps {
  kind: 'quote' | 'invoice';
  dto: any;  // DTO from public-dto.ts (matches both shapes)
}

export function DocumentPdf({ kind, dto }: PdfProps) {
  const isQuote = kind === 'quote';
  const showPaidWatermark = !isQuote && dto.status === 'PAID';
  const showAcceptedWatermark = isQuote && (dto.status === 'ACCEPTED' || dto.status === 'CONVERTED');
  const showDeclinedWatermark = isQuote && dto.status === 'DECLINED';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Watermarks */}
        {showPaidWatermark && (
          <Text style={[styles.watermark, { color: COLORS.positiveGreen }]} fixed>PAID</Text>
        )}
        {showAcceptedWatermark && (
          <Text style={[styles.watermark, { color: COLORS.positiveGreen }]} fixed>ACCEPTED</Text>
        )}
        {showDeclinedWatermark && (
          <Text style={[styles.watermark, { color: COLORS.negativeRed }]} fixed>DECLINED</Text>
        )}

        {/* Header */}
        <View style={styles.header}>
          <View>
            {dto.business.logoUrl ? (
              <Image src={dto.business.logoUrl} style={styles.logo} />
            ) : (
              <Text style={styles.businessName}>{dto.business.name}</Text>
            )}
          </View>
          <View>
            <Text style={styles.docLabel}>{isQuote ? 'QUOTE' : 'INVOICE'}</Text>
            <Text style={styles.docMeta}>
              {dto.number}{'\n'}
              Created: {formatDate(dto.createdDate)}{'\n'}
              {isQuote ? `Valid Until: ${formatDate(dto.validUntil)}` : `Due: ${formatDate(dto.dueDate)}`}
            </Text>
          </View>
        </View>

        {/* From / To */}
        <View style={styles.fromToRow}>
          <View style={styles.box}>
            <Text style={styles.boxLabel}>From</Text>
            <Text style={styles.boxName}>{dto.business.name}</Text>
            <Text style={styles.boxText}>{stripHtml(dto.business.address)}</Text>
            <Text style={styles.boxText}>{stripHtml(dto.business.extraInfo)}</Text>
            {dto.business.website ? <Text style={styles.boxText}>{dto.business.website}</Text> : null}
          </View>
          <View style={styles.box}>
            <Text style={styles.boxLabel}>To</Text>
            <Text style={styles.boxName}>{dto.client.businessName}</Text>
            {(dto.client.firstName || dto.client.lastName) && (
              <Text style={styles.boxText}>
                {[dto.client.firstName, dto.client.lastName].filter(Boolean).join(' ')}
              </Text>
            )}
            <Text style={styles.boxText}>{dto.client.email}</Text>
            {dto.client.address ? <Text style={styles.boxText}>{stripHtml(dto.client.address)}</Text> : null}
            {dto.client.extraInfo ? <Text style={styles.boxText}>{stripHtml(dto.client.extraInfo)}</Text> : null}
          </View>
        </View>

        {/* Title & description */}
        {dto.title ? (
          <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>{dto.title}</Text>
        ) : null}
        {dto.description ? (
          <Text style={{ fontSize: 10, color: COLORS.textMuted, marginBottom: 12 }}>
            {stripHtml(dto.description)}
          </Text>
        ) : null}

        {/* Line items table */}
        <View style={styles.itemsTable}>
          <View style={styles.itemsHeader}>
            <Text style={styles.colQty}>{dto.labels.hrsQtyLabel}</Text>
            <Text style={styles.colService}>{dto.labels.serviceLabel}</Text>
            <Text style={styles.colRate}>{dto.labels.ratePriceLabel}</Text>
            <Text style={styles.colAmount}>{dto.labels.subTotalLabel}</Text>
          </View>
          {dto.lineItems.map((li: any, idx: number) => (
            <View key={idx} style={[styles.itemRow, idx % 2 === 0 ? styles.itemRowAlt : {}]}>
              <Text style={styles.colQty}>{li.qty}</Text>
              <View style={styles.colService}>
                <Text style={styles.serviceTitle}>{li.title}</Text>
                {li.description ? <Text style={styles.serviceDesc}>{li.description}</Text> : null}
              </View>
              <Text style={styles.colRate}>{formatCurrency(li.rate)}</Text>
              <Text style={styles.colAmount}>{formatCurrency(li.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Payment Info + Totals */}
        <View style={styles.bottomRow}>
          <View style={styles.paymentBox}>
            <Text style={styles.boxLabel}>Payment Methods</Text>
            <Text style={styles.boxText}>{stripHtml(dto.paymentInfo)}</Text>
          </View>
          <View style={styles.totalsBox}>
            <View style={styles.totalLine}>
              <Text style={styles.totalLineLabel}>{dto.labels.subTotalLabel}</Text>
              <Text style={styles.totalLineValue}>{formatCurrency(dto.subtotal)}</Text>
            </View>
            {dto.discount > 0 && (
              <View style={styles.totalLine}>
                <Text style={styles.totalLineLabel}>{dto.labels.discountLabel}</Text>
                <Text style={styles.totalLineValue}>− {formatCurrency(dto.discount)}</Text>
              </View>
            )}
            {dto.taxAmount > 0 && (
              <View style={styles.totalLine}>
                <Text style={styles.totalLineLabel}>{dto.taxName}</Text>
                <Text style={styles.totalLineValue}>{formatCurrency(dto.taxAmount)}</Text>
              </View>
            )}
            {!isQuote && dto.paid > 0 && (
              <View style={styles.totalLine}>
                <Text style={styles.totalLineLabel}>Paid</Text>
                <Text style={styles.totalLineValue}>− {formatCurrency(dto.paid)}</Text>
              </View>
            )}
            <View style={styles.totalDueLine}>
              <Text>{isQuote ? dto.labels.totalLabel : dto.labels.totalDueLabel}</Text>
              <Text>{formatCurrency(isQuote ? dto.total : dto.totalDue)}</Text>
            </View>
          </View>
        </View>

        {/* Terms */}
        {dto.terms ? (
          <View style={styles.termsBox}>
            <Text style={styles.termsLabel}>Terms & Conditions</Text>
            <Text>{stripHtml(dto.terms)}</Text>
          </View>
        ) : null}

        {/* Footer */}
        {dto.footer ? (
          <Text style={styles.footer}>{stripHtml(dto.footer)}</Text>
        ) : null}
      </Page>
    </Document>
  );
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}
```

### 2. PDF Route Handlers

`app/(admin)/quotes/[id]/pdf/route.ts`:

```ts
import { renderToBuffer } from '@react-pdf/renderer';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getBusinessSettings,
  getPaymentSettings,
  getTaxSettings,
  getTranslateSettings,
} from '@/lib/settings';
import { toPublicQuoteDTO } from '@/lib/public-dto';
import { DocumentPdf } from '@/components/pdf/document-pdf';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { client: true, lineItems: true },
  });
  if (!quote) return new Response('Not found', { status: 404 });

  const [business, paymentSettings, taxSettings, labels] = await Promise.all([
    getBusinessSettings(),
    getPaymentSettings(),
    getTaxSettings(),
    getTranslateSettings(),
  ]);
  const dto = toPublicQuoteDTO(quote, business, paymentSettings, taxSettings, labels);

  const buffer = await renderToBuffer(<DocumentPdf kind="quote" dto={dto} />);
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${quote.number}.pdf"`,
    },
  });
}
```

`app/(admin)/invoices/[id]/pdf/route.ts` — same pattern, fetch invoice with payments, use
`toPublicInvoiceDTO`, render with `kind="invoice"`.

### 3. Public PDF Route Handlers

`app/api/invoice/[token]/pdf/route.ts`:

```ts
import { renderToBuffer } from '@react-pdf/renderer';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getBusinessSettings,
  getPaymentSettings,
  getTaxSettings,
  getTranslateSettings,
} from '@/lib/settings';
import { toPublicInvoiceDTO } from '@/lib/public-dto';
import { DocumentPdf } from '@/components/pdf/document-pdf';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ip = await getClientIp();
  if (!rateLimit(`pdf:${ip}`).ok) return new Response('Rate limited', { status: 429 });

  const invoice = await prisma.invoice.findUnique({
    where: { publicToken: token },
    include: {
      client: true,
      lineItems: true,
      payments: { where: { status: 'COMPLETED' } },
    },
  });
  if (!invoice) return new Response('Not found', { status: 404 });

  const [business, paymentSettings, taxSettings, labels] = await Promise.all([
    getBusinessSettings(),
    getPaymentSettings(),
    getTaxSettings(),
    getTranslateSettings(),
  ]);
  const dto = toPublicInvoiceDTO(invoice, business, paymentSettings, taxSettings, labels);

  const buffer = await renderToBuffer(<DocumentPdf kind="invoice" dto={dto} />);
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${invoice.number}.pdf"`,
    },
  });
}
```

Same for `app/api/quote/[token]/pdf/route.ts`.

### 4. HTML Shared Template Component

Now replace the placeholder `components/shared/quote-invoice-template.tsx` from Step 6 with
the full polished HTML version. Use the same DTO shape and match the PDF layout visually so
clients see the same thing on web and PDF.

Key layout (using Tailwind):

```tsx
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
```

## Verification Checklist

- [ ] Visit `/quotes/[id]/pdf` while logged in → PDF downloads/renders inline matching the visual design
- [ ] Visit `/invoices/[id]/pdf` → PDF for invoice
- [ ] PAID watermark appears on a paid invoice PDF
- [ ] ACCEPTED watermark on an accepted quote PDF
- [ ] Public route `/api/invoice/[token]/pdf` works without auth
- [ ] PDF totals match what's shown on screen (within rounding)
- [ ] INR formatting uses Indian lakhs (e.g. ₹1,23,456.00)
- [ ] Logo renders if `logoUrl` is set
- [ ] Falls back to business name if no logo
- [ ] `npx tsc --noEmit` passes

## Commit

```bash
git add -A
git commit -m "step-9: shared quote+invoice template — PDF via react-pdf and HTML rendering"
```

## Next

Proceed to `10-EMAIL.md`.

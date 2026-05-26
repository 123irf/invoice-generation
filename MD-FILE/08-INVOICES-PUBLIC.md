# Step 8 — Public Invoice View

## Goal

Build the unauthenticated public invoice page at `/i/[token]`. Clients view their invoice
and pay via Razorpay (Pay button stub here — actually wired to Razorpay in Step 11).

## Prerequisites

- Steps 0–7 complete

## Security Principles

Same as Step 6 — query by `publicToken`, return whitelisted DTO, rate-limit, audit-log.

## Steps

### 1. Extend `lib/public-dto.ts` with the invoice DTO

Add to the file created in Step 6:

```ts
interface InvoiceWithRelations {
  id: string;
  number: string;
  publicToken: string;
  title: string | null;
  description: string | null;
  status: string;
  dueDate: Date;
  createdDate: Date;
  subtotal: number;
  taxPercentage: number;
  taxAmount: number;
  discount: number;
  paid: number;
  totalDue: number;
  total: number;
  terms: string | null;
  footer: string | null;
  client: any;
  lineItems: any[];
  payments: Array<{
    date: Date;
    amount: number;
    method: string;
    paymentId: string | null;
  }>;
}

export function toPublicInvoiceDTO(
  invoice: InvoiceWithRelations,
  business: any,
  paymentSettings: any,
  taxSettings: any,
  labels: any
) {
  // Compute display status (OVERDUE on the fly)
  let displayStatus = invoice.status;
  if (invoice.status === 'SENT' && invoice.dueDate < new Date()) {
    displayStatus = 'OVERDUE';
  }

  return {
    number: invoice.number,
    title: invoice.title,
    description: sanitizeHTML(invoice.description),
    status: displayStatus,
    rawStatus: invoice.status,
    dueDate: invoice.dueDate.toISOString(),
    createdDate: invoice.createdDate.toISOString(),
    subtotal: invoice.subtotal,
    taxPercentage: invoice.taxPercentage,
    taxAmount: invoice.taxAmount,
    discount: invoice.discount,
    paid: invoice.paid,
    totalDue: invoice.totalDue,
    total: invoice.total,
    terms: sanitizeHTML(invoice.terms),
    footer: sanitizeHTML(invoice.footer),
    lineItems: invoice.lineItems
      .sort((a, b) => a.order - b.order)
      .map((li) => ({
        qty: li.qty,
        title: li.title,
        description: li.description,
        rate: li.rate,
        amount: li.amount,
        taxable: li.taxable,
      })),
    payments: invoice.payments.map((p) => ({
      date: p.date.toISOString(),
      amount: p.amount,
      method: p.method,
      paymentId: p.paymentId,
    })),
    client: {
      businessName: invoice.client.businessName,
      firstName: invoice.client.firstName,
      lastName: invoice.client.lastName,
      email: invoice.client.email,
      address: sanitizeHTML(invoice.client.address),
      extraInfo: sanitizeHTML(invoice.client.extraInfo),
      website: invoice.client.website,
    },
    business: {
      name: business.name,
      logoUrl: business.logoUrl,
      address: sanitizeHTML(business.address),
      extraInfo: sanitizeHTML(business.extraInfo),
      website: business.website,
    },
    paymentInfo: sanitizeHTML(paymentSettings.genericPayment),
    bankDetails: sanitizeHTML(paymentSettings.bankDetails),
    taxName: taxSettings.taxName,
    labels,
  };
}
```

### 2. Public Invoice Page

`app/(public)/i/[token]/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import {
  getBusinessSettings,
  getPaymentSettings,
  getTaxSettings,
  getTranslateSettings,
} from '@/lib/settings';
import { toPublicInvoiceDTO } from '@/lib/public-dto';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { PublicInvoiceView } from '@/components/public/public-invoice-view';

export const dynamic = 'force-dynamic';

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const ip = await getClientIp();
  const rl = rateLimit(`i:${ip}`);
  if (!rl.ok) {
    return (
      <div className="bg-white p-8 rounded-lg shadow text-red-600">
        Too many requests. Try again in a minute.
      </div>
    );
  }

  const invoice = await prisma.invoice.findUnique({
    where: { publicToken: token },
    include: {
      client: true,
      lineItems: true,
      payments: { where: { status: 'COMPLETED' }, orderBy: { date: 'desc' } },
    },
  });
  if (!invoice) notFound();

  const [business, paymentSettings, taxSettings, labels] = await Promise.all([
    getBusinessSettings(),
    getPaymentSettings(),
    getTaxSettings(),
    getTranslateSettings(),
  ]);

  const dto = toPublicInvoiceDTO(invoice, business, paymentSettings, taxSettings, labels);

  return <PublicInvoiceView token={token} dto={dto} />;
}
```

### 3. Public Invoice View Component

`components/public/public-invoice-view.tsx`:

```tsx
'use client';

import { Button } from '@/components/ui/button';
import { QuoteInvoiceTemplate } from '@/components/shared/quote-invoice-template';
import { formatCurrency } from '@/lib/currency';
import { PayButton } from './pay-button';
import { Download } from 'lucide-react';

export function PublicInvoiceView({ token, dto }: { token: string; dto: any }) {
  const fullyPaid = dto.totalDue <= 0;
  const isPayable = !fullyPaid && (dto.rawStatus === 'SENT' || dto.rawStatus === 'PARTIAL');

  return (
    <>
      {fullyPaid && (
        <div className="bg-green-50 border border-green-200 text-green-900 p-3 rounded mb-4 text-center font-medium">
          ✓ This invoice has been paid in full. Thank you!
        </div>
      )}

      {dto.status === 'OVERDUE' && !fullyPaid && (
        <div className="bg-red-50 border border-red-200 text-red-900 p-3 rounded mb-4 text-center font-medium">
          ⚠ This invoice is overdue.
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg p-8">
        <QuoteInvoiceTemplate kind="invoice" dto={dto} />

        <div className="flex flex-wrap gap-3 justify-center mt-8 pt-8 border-t">
          {isPayable && (
            <PayButton token={token} amount={dto.totalDue} />
          )}
          <Button variant="outline" asChild>
            <a href={`/api/invoice/${token}/pdf`} target="_blank" rel="noreferrer">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </a>
          </Button>
        </div>
      </div>
    </>
  );
}
```

### 4. Pay Button (Stub for Step 8, real impl in Step 11)

`components/public/pay-button.tsx`:

```tsx
'use client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/currency';

export function PayButton({ token, amount }: { token: string; amount: number }) {
  function onClick() {
    // Stub: Step 11 replaces this with full Razorpay Checkout integration
    toast.info('Payment integration coming in Step 11');
    console.log('Pay clicked for token', token, 'amount', amount);
  }

  return (
    <Button size="lg" onClick={onClick} className="bg-blue-600 hover:bg-blue-700">
      Pay Now — {formatCurrency(amount)}
    </Button>
  );
}
```

### 5. Payment Success Page (placeholder, used in Step 11)

`app/(public)/i/[token]/paid/page.tsx`:

```tsx
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { formatCurrency } from '@/lib/currency';

export default async function PaidPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { publicToken: token },
  });
  if (!invoice) notFound();

  return (
    <div className="bg-white rounded-lg shadow-lg p-12 text-center">
      <div className="text-green-600 text-5xl mb-4">✓</div>
      <h1 className="text-2xl font-bold mb-2">Payment Successful</h1>
      <p className="text-slate-700 mb-4">
        Your payment of {formatCurrency(invoice.total)} for invoice {invoice.number} has been
        received.
      </p>
      <p className="text-sm text-slate-500">
        A receipt has been emailed to you.
      </p>
    </div>
  );
}
```

## Verification Checklist

- [ ] Visit `/i/[non-existent-token]` returns 404
- [ ] Visit `/i/[valid-token]` shows the invoice with Pay button (if balance > 0) and Download PDF
- [ ] Fully paid invoice hides Pay button, shows "Paid in full" banner
- [ ] OVERDUE banner shows for invoices past due date
- [ ] Pay button click toasts "coming in Step 11" — this is expected
- [ ] No auth required, works in incognito
- [ ] Payments history visible at the bottom of the invoice (if any)
- [ ] Rate limit triggers on >30 req/min
- [ ] `npx tsc --noEmit` passes

## Commit

```bash
git add -A
git commit -m "step-8: public invoice view with pay button stub and payment history"
```

## Next

Proceed to `09-PDF.md`.

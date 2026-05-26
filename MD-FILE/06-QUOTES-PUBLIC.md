# Step 6 — Public Quote View + Accept/Decline Flow

## Goal

Build the unauthenticated public quote page at `/q/[token]`. Clients view the quote and
either accept or decline. On accept, an invoice is auto-generated (and emailed in Step 10).
This is the **only entry point clients have into the application**.

## Prerequisites

- Steps 0–5 complete

## Security Principles

1. **Public route, no Clerk auth** — already configured in `middleware.ts`
2. **Query by `publicToken`**, never by `id`
3. **Return a whitelisted DTO** — never raw Prisma object
4. **Server-validate state transitions** — client cannot send `status` directly
5. **Rate limit** — 30 requests/minute per IP
6. **Audit log** every client action

## Steps

### 1. Public DTO helpers

`lib/public-dto.ts`:

```ts
import { sanitizeHTML } from './sanitize';
import { formatCurrency, formatDate } from './currency';

interface QuoteWithRelations {
  id: string;
  number: string;
  publicToken: string;
  title: string | null;
  description: string | null;
  status: string;
  validUntil: Date;
  createdDate: Date;
  subtotal: number;
  taxPercentage: number;
  taxAmount: number;
  discount: number;
  total: number;
  terms: string | null;
  footer: string | null;
  declineReason: string | null;
  client: {
    businessName: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    phone: string | null;
    address: string | null;
    extraInfo: string | null;
    website: string | null;
  };
  lineItems: Array<{
    qty: number;
    title: string;
    description: string | null;
    rate: number;
    amount: number;
    taxable: boolean;
    order: number;
  }>;
}

export function toPublicQuoteDTO(
  quote: QuoteWithRelations,
  business: { name: string; logoUrl: string | null; address: string; extraInfo: string; website: string },
  paymentSettings: { genericPayment: string; bankDetails: string | null },
  taxSettings: { taxName: string; taxPercentage: number },
  labels: { quoteLabel: string; subTotalLabel: string; discountLabel: string; totalLabel: string; totalDueLabel: string; hrsQtyLabel: string; serviceLabel: string; ratePriceLabel: string }
) {
  return {
    number: quote.number,
    title: quote.title,
    description: sanitizeHTML(quote.description),
    status: quote.status,
    validUntil: quote.validUntil.toISOString(),
    createdDate: quote.createdDate.toISOString(),
    subtotal: quote.subtotal,
    taxPercentage: quote.taxPercentage,
    taxAmount: quote.taxAmount,
    discount: quote.discount,
    total: quote.total,
    terms: sanitizeHTML(quote.terms),
    footer: sanitizeHTML(quote.footer),
    lineItems: quote.lineItems
      .sort((a, b) => a.order - b.order)
      .map((li) => ({
        qty: li.qty,
        title: li.title,
        description: li.description,
        rate: li.rate,
        amount: li.amount,
        taxable: li.taxable,
      })),
    client: {
      businessName: quote.client.businessName,
      firstName: quote.client.firstName,
      lastName: quote.client.lastName,
      email: quote.client.email,
      address: sanitizeHTML(quote.client.address),
      extraInfo: sanitizeHTML(quote.client.extraInfo),
      website: quote.client.website,
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

Similar `toPublicInvoiceDTO()` — add to same file.

### 2. Rate limiting helper

For MVP, an in-memory map suffices. For production, switch to upstash/ratelimit.

`lib/rate-limit.ts`:

```ts
const requests = new Map<string, number[]>();
const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 30;

export function rateLimit(key: string): { ok: boolean; remaining: number } {
  const now = Date.now();
  const arr = requests.get(key) ?? [];
  const recent = arr.filter((ts) => now - ts < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    return { ok: false, remaining: 0 };
  }
  recent.push(now);
  requests.set(key, recent);
  return { ok: true, remaining: MAX_REQUESTS - recent.length };
}

export async function getClientIp(): Promise<string> {
  const { headers } = await import('next/headers');
  const h = await headers();
  const fwd = h.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return h.get('x-real-ip') ?? 'unknown';
}
```

### 3. Public Quote Page

`app/(public)/q/[token]/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getBusinessSettings, getPaymentSettings, getTaxSettings, getQuoteSettings, getTranslateSettings } from '@/lib/settings';
import { toPublicQuoteDTO } from '@/lib/public-dto';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { PublicQuoteView } from '@/components/public/public-quote-view';

export const dynamic = 'force-dynamic';

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const ip = await getClientIp();
  const rl = rateLimit(`q:${ip}`);
  if (!rl.ok) {
    return <div className="bg-white p-8 rounded-lg shadow text-red-600">Too many requests. Try again in a minute.</div>;
  }

  const quote = await prisma.quote.findUnique({
    where: { publicToken: token },
    include: { client: true, lineItems: true },
  });
  if (!quote) notFound();

  const [business, paymentSettings, taxSettings, quoteSettings, labels] = await Promise.all([
    getBusinessSettings(),
    getPaymentSettings(),
    getTaxSettings(),
    getQuoteSettings(),
    getTranslateSettings(),
  ]);

  const dto = toPublicQuoteDTO(quote, business, paymentSettings, taxSettings, labels);

  return (
    <PublicQuoteView
      token={token}
      dto={dto}
      acceptText={quoteSettings.acceptQuoteText}
      declineReasonRequired={quoteSettings.declineReasonRequired}
      showAcceptButton={quoteSettings.showAcceptButton}
    />
  );
}
```

### 4. Public Quote View Component

`components/public/public-quote-view.tsx`:

```tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { QuoteInvoiceTemplate } from '@/components/shared/quote-invoice-template';
import { acceptQuote, declineQuote } from './actions';

export function PublicQuoteView({ token, dto, acceptText, declineReasonRequired, showAcceptButton }: any) {
  const router = useRouter();
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [pending, startTransition] = useTransition();

  const isActionable = dto.status === 'SENT' && showAcceptButton;

  function onAccept() {
    startTransition(async () => {
      const r = await acceptQuote(token);
      if (r.ok) {
        router.push(`/q/${token}/accepted`);
      } else {
        toast.error(r.error ?? 'Failed to accept');
      }
    });
  }

  function onDecline() {
    if (declineReasonRequired && !declineReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    startTransition(async () => {
      const r = await declineQuote(token, declineReason);
      if (r.ok) {
        router.push(`/q/${token}/declined`);
      } else {
        toast.error(r.error ?? 'Failed');
      }
    });
  }

  return (
    <>
      {!isActionable && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 p-3 rounded mb-4">
          This quote is {dto.status.toLowerCase()} and no longer actionable.
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg p-8">
        <QuoteInvoiceTemplate kind="quote" dto={dto} />

        {isActionable && (
          <div className="flex gap-3 justify-center mt-8 pt-8 border-t">
            <Button size="lg" onClick={() => setAcceptOpen(true)} className="bg-green-600 hover:bg-green-700">
              Accept Quote
            </Button>
            <Button size="lg" variant="outline" onClick={() => setDeclineOpen(true)}>
              Decline
            </Button>
          </div>
        )}
      </div>

      {/* Accept confirmation modal */}
      <Dialog open={acceptOpen} onOpenChange={setAcceptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept this quote?</DialogTitle>
            <DialogDescription dangerouslySetInnerHTML={{ __html: acceptText }} />
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptOpen(false)}>Cancel</Button>
            <Button onClick={onAccept} disabled={pending} className="bg-green-600 hover:bg-green-700">
              {pending ? 'Accepting...' : 'Confirm Accept'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline modal with reason */}
      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline this quote?</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason {declineReasonRequired ? '*' : '(optional)'}
            </Label>
            <Textarea
              id="reason"
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={onDecline} disabled={pending}>
              {pending ? 'Declining...' : 'Confirm Decline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

### 5. Server Actions for Public Quote

`app/(public)/q/[token]/actions.ts`:

```ts
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { writeAudit } from '@/lib/audit';
import { getClientIp } from '@/lib/rate-limit';
import { getQuoteSettings, getInvoiceSettings } from '@/lib/settings';
import { getNextInvoiceNumber } from '@/lib/numbering';

export async function acceptQuote(token: string) {
  const ip = await getClientIp();
  const settings = await getQuoteSettings();
  const invoiceSettings = await getInvoiceSettings();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findUnique({
        where: { publicToken: token },
        include: { lineItems: { orderBy: { order: 'asc' } } },
      });
      if (!quote) throw new Error('Quote not found');
      if (quote.status !== 'SENT') {
        throw new Error(`Cannot accept — quote is already ${quote.status.toLowerCase()}`);
      }

      // Step A: mark accepted
      await tx.quote.update({
        where: { id: quote.id },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      });

      let newInvoiceId: string | null = null;

      // Step B: convert per settings
      if (settings.acceptedQuoteAction === 'convert_and_send' || settings.acceptedQuoteAction === 'convert_only') {
        const number = await getNextInvoiceNumber(tx);
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + invoiceSettings.dueDateDays);

        const invoice = await tx.invoice.create({
          data: {
            number,
            clientId: quote.clientId,
            sourceQuoteId: quote.id,
            title: quote.title,
            description: quote.description,
            orderNumber: quote.orderNumber,
            status: 'SENT',
            dueDate,
            subtotal: quote.subtotal,
            taxPercentage: quote.taxPercentage,
            taxAmount: quote.taxAmount,
            discount: quote.discount,
            paid: 0,
            totalDue: quote.total,
            total: quote.total,
            terms: invoiceSettings.defaultTerms,
            footer: invoiceSettings.defaultFooter,
            lineItems: {
              create: quote.lineItems.map((li, idx) => ({
                parentType: 'INVOICE',
                qty: li.qty,
                title: li.title,
                description: li.description,
                rate: li.rate,
                amount: li.amount,
                taxable: li.taxable,
                order: idx,
              })),
            },
          },
        });
        newInvoiceId = invoice.id;

        await tx.quote.update({
          where: { id: quote.id },
          data: { status: 'CONVERTED', convertedInvoiceId: invoice.id },
        });
      }

      return { quoteId: quote.id, newInvoiceId, action: settings.acceptedQuoteAction };
    });

    await writeAudit({
      actor: 'client@public',
      actorIp: ip,
      action: 'QUOTE_ACCEPTED_BY_CLIENT',
      targetType: 'QUOTE',
      targetId: result.quoteId,
      metadata: { action: result.action, newInvoiceId: result.newInvoiceId },
    });

    // Step 10 will call sendInvoiceEmail() here if action === 'convert_and_send'
    // For Step 6, we leave that as a TODO comment

    revalidatePath(`/q/${token}`);
    return { ok: true, newInvoiceId: result.newInvoiceId };
  } catch (e: any) {
    return { ok: false, error: e.message ?? 'Failed' };
  }
}

export async function declineQuote(token: string, reason: string) {
  const ip = await getClientIp();
  try {
    const quote = await prisma.quote.findUnique({ where: { publicToken: token } });
    if (!quote) return { ok: false, error: 'Quote not found' };
    if (quote.status !== 'SENT') {
      return { ok: false, error: `Cannot decline — quote is already ${quote.status.toLowerCase()}` };
    }
    await prisma.quote.update({
      where: { id: quote.id },
      data: { status: 'DECLINED', declinedAt: new Date(), declineReason: reason || null },
    });
    await writeAudit({
      actor: 'client@public',
      actorIp: ip,
      action: 'QUOTE_DECLINED_BY_CLIENT',
      targetType: 'QUOTE',
      targetId: quote.id,
      metadata: { reason },
    });
    revalidatePath(`/q/${token}`);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}
```

### 6. Confirmation pages

`app/(public)/q/[token]/accepted/page.tsx`:

```tsx
import { prisma } from '@/lib/prisma';
import { getQuoteSettings } from '@/lib/settings';
import { sanitizeHTML } from '@/lib/sanitize';

export default async function AcceptedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const quote = await prisma.quote.findUnique({ where: { publicToken: token } });
  const settings = await getQuoteSettings();
  const message = settings.acceptedQuoteMessage || 'You have accepted the Quote.<br>We will be in touch shortly.';

  return (
    <div className="bg-white rounded-lg shadow-lg p-12 text-center">
      <div className="text-green-600 text-5xl mb-4">✓</div>
      <h1 className="text-2xl font-bold mb-4">Quote Accepted</h1>
      <div className="text-slate-700" dangerouslySetInnerHTML={{ __html: sanitizeHTML(message) }} />
    </div>
  );
}
```

`app/(public)/q/[token]/declined/page.tsx`:

```tsx
import { prisma } from '@/lib/prisma';
import { getQuoteSettings } from '@/lib/settings';
import { sanitizeHTML } from '@/lib/sanitize';

export default async function DeclinedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const settings = await getQuoteSettings();
  const message = settings.declinedQuoteMessage || 'You have declined the Quote.<br>We will be in touch shortly.';

  return (
    <div className="bg-white rounded-lg shadow-lg p-12 text-center">
      <h1 className="text-2xl font-bold mb-4">Quote Declined</h1>
      <div className="text-slate-700" dangerouslySetInnerHTML={{ __html: sanitizeHTML(message) }} />
    </div>
  );
}
```

### 7. Shared template component (used by both admin view and public view)

`components/shared/quote-invoice-template.tsx` — this is a placeholder for Step 9 (the PDF
step builds the full visual template). For Step 6, build a simple HTML version that renders
the From/To boxes, line items table, totals, and footer. The full polished template comes
in Step 9.

## Verification Checklist

- [ ] Visit `/q/[non-existent-token]` returns 404
- [ ] Visit `/q/[valid-token]` (from a SENT quote) shows the quote with Accept + Decline buttons
- [ ] Quote in DRAFT status visited via public link shows "not actionable" banner, no buttons
- [ ] Accept opens confirmation modal with `acceptQuoteText`
- [ ] Confirming Accept transitions status to ACCEPTED (or CONVERTED if action is set), creates invoice, redirects to /accepted page
- [ ] Decline opens modal, reason is required if `declineReasonRequired`, transitions status to DECLINED, redirects to /declined
- [ ] After accept/decline, refreshing the public page shows non-actionable banner
- [ ] AuditLog has QUOTE_ACCEPTED_BY_CLIENT or QUOTE_DECLINED_BY_CLIENT entries with `actor: "client@public"` and the IP
- [ ] Visiting public quote in incognito works WITHOUT redirecting to sign-in
- [ ] Spamming refresh 30+ times in a minute triggers the rate limit banner
- [ ] `npx tsc --noEmit` passes

## Commit

```bash
git add -A
git commit -m "step-6: public quote view with accept/decline flow, rate-limited, audit-logged"
```

## Next

Proceed to `07-INVOICES.md`.

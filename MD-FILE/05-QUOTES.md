# Step 5 — Quotes (Admin)

## Goal

Build the quotes admin module: list page with status tabs and filters, create/edit form
with line items repeater, view page with admin actions (Send stub, Convert to Invoice,
Delete).

Public quote view + accept/decline flow is Step 6. Send-by-email is wired up in Step 10
(stub for now).

## Prerequisites

- Steps 0–4 complete

## Architecture

- **Numbering** uses a transaction-locked counter from `QuoteSettings.nextNumber`
- **Totals** computed by a shared `lib/totals.ts` — single source of truth (used by
  Invoices and PDF too)
- **Currency formatting** via shared `lib/currency.ts`
- **Status flow:** DRAFT → SENT → ACCEPTED | DECLINED | EXPIRED | CANCELLED → CONVERTED

## Steps

### 1. Shared library: totals calculator

`lib/totals.ts`:

```ts
export interface TotalsInput {
  lineItems: Array<{
    qty: number;
    rate: number;
    taxable: boolean;
  }>;
  taxPercentage: number;
  pricesEnteredWithTax: 'inclusive' | 'exclusive';
  discount: number;
}

export interface TotalsResult {
  subtotal: number;
  taxableBase: number;
  taxAmount: number;
  discount: number;
  total: number;
}

export function calculateTotals(input: TotalsInput): TotalsResult {
  const lineAmounts = input.lineItems.map((li) => ({
    amount: li.qty * li.rate,
    taxable: li.taxable,
  }));
  const taxableSum = lineAmounts.filter((x) => x.taxable).reduce((s, x) => s + x.amount, 0);
  const nonTaxableSum = lineAmounts.filter((x) => !x.taxable).reduce((s, x) => s + x.amount, 0);

  const taxPct = input.taxPercentage / 100;
  let subtotal = 0;
  let taxAmount = 0;
  let total = 0;
  const discount = input.discount;

  if (input.taxPercentage === 0 || taxPct <= 0) {
    subtotal = taxableSum + nonTaxableSum;
    taxAmount = 0;
    total = subtotal - discount;
  } else if (input.pricesEnteredWithTax === 'exclusive') {
    subtotal = taxableSum + nonTaxableSum;
    taxAmount = taxableSum * taxPct;
    total = subtotal + taxAmount - discount;
  } else {
    // inclusive — extract tax from line items
    const taxablePreTax = taxableSum / (1 + taxPct);
    taxAmount = taxableSum - taxablePreTax;
    subtotal = taxablePreTax + nonTaxableSum;
    total = taxableSum + nonTaxableSum - discount;
  }

  return {
    subtotal: round(subtotal),
    taxableBase: round(taxableSum),
    taxAmount: round(taxAmount),
    discount: round(discount),
    total: round(total),
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export function lineItemAmount(qty: number, rate: number): number {
  return round(qty * rate);
}
```

### 2. Shared library: INR formatter

`lib/currency.ts`:

```ts
export function formatCurrency(amount: number, symbol = '₹'): string {
  if (symbol === '₹') {
    // Indian formatting with lakhs
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
  return `${symbol}${amount.toFixed(2)}`;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}
```

### 3. Shared library: numbering helper

`lib/numbering.ts`:

```ts
import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

// Get the next quote number atomically and increment the counter.
export async function getNextQuoteNumber(tx: Prisma.TransactionClient): Promise<string> {
  const settings = await tx.quoteSettings.findFirst();
  if (!settings) throw new Error('QuoteSettings not initialized');
  const currentStr = settings.nextNumber;
  const formatted = `${settings.prefix}${currentStr}${settings.suffix}`;

  // Compute next, preserving width
  const width = currentStr.length;
  const nextInt = parseInt(currentStr, 10) + 1;
  const nextStr = String(nextInt).padStart(width, '0');

  await tx.quoteSettings.update({
    where: { id: settings.id },
    data: { nextNumber: nextStr },
  });

  return formatted;
}

export async function getNextInvoiceNumber(tx: Prisma.TransactionClient): Promise<string> {
  const settings = await tx.invoiceSettings.findFirst();
  if (!settings) throw new Error('InvoiceSettings not initialized');
  const currentStr = settings.nextNumber;
  const formatted = `${settings.prefix}${currentStr}${settings.suffix}`;
  const width = currentStr.length;
  const nextInt = parseInt(currentStr, 10) + 1;
  const nextStr = String(nextInt).padStart(width, '0');
  await tx.invoiceSettings.update({
    where: { id: settings.id },
    data: { nextNumber: nextStr },
  });
  return formatted;
}
```

### 4. Shared component: StatusBadge

`components/shared/status-badge.tsx`:

```tsx
import { cn } from '@/lib/utils';

const QUOTE_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SENT: 'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  DECLINED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-slate-200 text-slate-600',
  CANCELLED: 'bg-slate-200 text-slate-600',
  CONVERTED: 'bg-purple-100 text-purple-700',
};

const INVOICE_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SENT: 'bg-blue-100 text-blue-700',
  PAID: 'bg-green-100 text-green-700',
  PARTIAL: 'bg-yellow-100 text-yellow-700',
  OVERDUE: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-200 text-slate-600',
};

export function StatusBadge({
  status,
  kind,
}: {
  status: string;
  kind: 'quote' | 'invoice';
}) {
  const colors = kind === 'quote' ? QUOTE_COLORS : INVOICE_COLORS;
  const className = colors[status] ?? 'bg-slate-100 text-slate-700';
  return (
    <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-medium', className)}>
      {status}
    </span>
  );
}
```

### 5. Server Actions

`app/(admin)/quotes/actions.ts`:

```ts
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { calculateTotals, lineItemAmount } from '@/lib/totals';
import { getNextQuoteNumber } from '@/lib/numbering';
import { getQuoteSettings, getTaxSettings, getInvoiceSettings } from '@/lib/settings';
import { writeAudit } from '@/lib/audit';
import { getAdminEmail } from '@/lib/auth';

const lineItemSchema = z.object({
  qty: z.coerce.number().min(0),
  title: z.string(),
  description: z.string().optional(),
  rate: z.coerce.number().min(0),
  taxable: z.coerce.boolean().default(true),
});

const quoteSchema = z.object({
  clientId: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  orderNumber: z.string().optional(),
  validUntil: z.string(),
  createdDate: z.string(),
  terms: z.string().optional(),
  footer: z.string().optional(),
  discount: z.coerce.number().min(0).default(0),
  lineItems: z.array(lineItemSchema),
  status: z.enum(['DRAFT', 'SENT']).default('DRAFT'),
});

type QuoteInput = z.infer<typeof quoteSchema>;

export async function createQuote(input: QuoteInput) {
  const data = quoteSchema.parse(input);
  const [quoteSettings, taxSettings] = await Promise.all([
    getQuoteSettings(),
    getTaxSettings(),
  ]);

  const totals = calculateTotals({
    lineItems: data.lineItems,
    taxPercentage: taxSettings.taxPercentage,
    pricesEnteredWithTax: taxSettings.pricesEnteredWithTax as 'inclusive' | 'exclusive',
    discount: data.discount,
  });

  const created = await prisma.$transaction(async (tx) => {
    const number = await getNextQuoteNumber(tx);
    return tx.quote.create({
      data: {
        number,
        clientId: data.clientId,
        title: data.title,
        description: data.description,
        orderNumber: data.orderNumber,
        validUntil: new Date(data.validUntil),
        createdDate: new Date(data.createdDate),
        status: data.status,
        subtotal: totals.subtotal,
        taxPercentage: taxSettings.taxPercentage,
        taxAmount: totals.taxAmount,
        discount: totals.discount,
        total: totals.total,
        terms: data.terms ?? quoteSettings.defaultTerms,
        footer: data.footer ?? quoteSettings.defaultFooter,
        lineItems: {
          create: data.lineItems.map((li, idx) => ({
            parentType: 'QUOTE',
            qty: li.qty,
            title: li.title,
            description: li.description,
            rate: li.rate,
            amount: lineItemAmount(li.qty, li.rate),
            taxable: li.taxable,
            order: idx,
          })),
        },
      },
    });
  });

  await writeAudit({
    actor: await getAdminEmail(),
    action: 'QUOTE_CREATED',
    targetType: 'QUOTE',
    targetId: created.id,
    metadata: { number: created.number, status: created.status },
  });

  revalidatePath('/quotes');
  redirect(`/quotes/${created.id}`);
}

export async function updateQuote(id: string, input: QuoteInput) {
  const data = quoteSchema.parse(input);
  const taxSettings = await getTaxSettings();

  const totals = calculateTotals({
    lineItems: data.lineItems,
    taxPercentage: taxSettings.taxPercentage,
    pricesEnteredWithTax: taxSettings.pricesEnteredWithTax as 'inclusive' | 'exclusive',
    discount: data.discount,
  });

  await prisma.$transaction([
    prisma.lineItem.deleteMany({ where: { quoteId: id } }),
    prisma.quote.update({
      where: { id },
      data: {
        clientId: data.clientId,
        title: data.title,
        description: data.description,
        orderNumber: data.orderNumber,
        validUntil: new Date(data.validUntil),
        createdDate: new Date(data.createdDate),
        status: data.status,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        discount: totals.discount,
        total: totals.total,
        terms: data.terms,
        footer: data.footer,
        lineItems: {
          create: data.lineItems.map((li, idx) => ({
            parentType: 'QUOTE',
            qty: li.qty,
            title: li.title,
            description: li.description,
            rate: li.rate,
            amount: lineItemAmount(li.qty, li.rate),
            taxable: li.taxable,
            order: idx,
          })),
        },
      },
    }),
  ]);

  await writeAudit({
    actor: await getAdminEmail(),
    action: 'QUOTE_UPDATED',
    targetType: 'QUOTE',
    targetId: id,
  });

  revalidatePath('/quotes');
  revalidatePath(`/quotes/${id}`);
  return { ok: true };
}

export async function deleteQuote(id: string) {
  await prisma.quote.delete({ where: { id } });
  await writeAudit({
    actor: await getAdminEmail(),
    action: 'QUOTE_DELETED',
    targetType: 'QUOTE',
    targetId: id,
  });
  revalidatePath('/quotes');
  return { ok: true };
}

export async function changeQuoteStatus(id: string, newStatus: string) {
  const quote = await prisma.quote.findUnique({ where: { id } });
  if (!quote) return { ok: false };
  await prisma.quote.update({
    where: { id },
    data: { status: newStatus as never },
  });
  await writeAudit({
    actor: await getAdminEmail(),
    action: 'QUOTE_STATUS_MANUAL_OVERRIDE',
    targetType: 'QUOTE',
    targetId: id,
    metadata: { from: quote.status, to: newStatus },
  });
  revalidatePath(`/quotes/${id}`);
  return { ok: true };
}

// Send action — stubbed in Step 5, wired to Resend in Step 10
export async function sendQuoteEmail(id: string) {
  const quote = await prisma.quote.update({
    where: { id },
    data: { status: 'SENT' },
  });
  await writeAudit({
    actor: await getAdminEmail(),
    action: 'QUOTE_SENT',
    targetType: 'QUOTE',
    targetId: id,
  });
  // TODO Step 10: replace with sendTemplatedEmail('quoteAvailable', ...)
  const publicLink = `${process.env.NEXT_PUBLIC_APP_URL}/q/${quote.publicToken}`;
  revalidatePath(`/quotes/${id}`);
  return { ok: true, publicLink };
}

// Convert quote to invoice — used directly by admin AND auto-called from public accept (Step 6)
export async function convertQuoteToInvoice(quoteId: string) {
  const invoiceSettings = await getInvoiceSettings();
  const result = await prisma.$transaction(async (tx) => {
    const quote = await tx.quote.findUnique({
      where: { id: quoteId },
      include: { lineItems: { orderBy: { order: 'asc' } } },
    });
    if (!quote) throw new Error('Quote not found');
    if (quote.convertedInvoiceId) throw new Error('Quote already converted');

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

    await tx.quote.update({
      where: { id: quote.id },
      data: { status: 'CONVERTED', convertedInvoiceId: invoice.id },
    });

    return invoice;
  });

  await writeAudit({
    actor: await getAdminEmail(),
    action: 'QUOTE_CONVERTED_TO_INVOICE',
    targetType: 'QUOTE',
    targetId: quoteId,
    metadata: { invoiceId: result.id, invoiceNumber: result.number },
  });

  revalidatePath('/quotes');
  revalidatePath('/invoices');
  return { ok: true, invoiceId: result.id };
}
```

### 6. Quotes List Page

`app/(admin)/quotes/page.tsx`:

```tsx
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatCurrency, formatDate } from '@/lib/currency';
import { Plus, FileText, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_TABS = ['ALL', 'DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CONVERTED', 'CANCELLED'] as const;
const PAGE_SIZE = 10;

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const { status = 'ALL', q, page = '1' } = await searchParams;
  const pageNum = parseInt(page, 10);
  const where = {
    ...(status !== 'ALL' && { status: status as never }),
    ...(q && {
      OR: [
        { number: { contains: q, mode: 'insensitive' as const } },
        { title: { contains: q, mode: 'insensitive' as const } },
        { client: { businessName: { contains: q, mode: 'insensitive' as const } } },
      ],
    }),
  };

  const [quotes, totalCount, counts] = await Promise.all([
    prisma.quote.findMany({
      where,
      include: { client: true },
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.quote.count({ where }),
    prisma.quote.groupBy({ by: ['status'], _count: true }),
  ]);

  const countMap = Object.fromEntries(counts.map((c) => [c.status, c._count]));
  const allCount = counts.reduce((s, c) => s + c._count, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Quotes</h1>
        <Button asChild>
          <Link href="/quotes/new">
            <Plus className="h-4 w-4 mr-2" />
            New Quote
          </Link>
        </Button>
      </div>

      {/* Status tabs */}
      <div className="border-b border-slate-200 mb-4">
        <div className="flex gap-1 overflow-x-auto">
          {STATUS_TABS.map((s) => {
            const isActive = status === s;
            const count = s === 'ALL' ? allCount : countMap[s] ?? 0;
            return (
              <Link
                key={s}
                href={`/quotes?status=${s}`}
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                  isActive ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-600 hover:text-slate-900'
                )}
              >
                {s.charAt(0) + s.slice(1).toLowerCase()} ({count})
              </Link>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <form className="mb-4">
        <input type="hidden" name="status" value={status} />
        <Input name="q" defaultValue={q} placeholder="Search by number, title, or client..." className="max-w-sm" />
      </form>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Number</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Valid Until</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-slate-500 py-12">
                  No quotes found.
                </TableCell>
              </TableRow>
            )}
            {quotes.map((q) => (
              <TableRow key={q.id}>
                <TableCell className="font-medium">
                  <Link href={`/quotes/${q.id}`} className="hover:underline">
                    {q.title || '(untitled)'}
                  </Link>
                </TableCell>
                <TableCell className="text-slate-600">{q.number}</TableCell>
                <TableCell>
                  <div>{q.client.businessName}</div>
                  <div className="text-xs text-slate-500">{q.client.email}</div>
                </TableCell>
                <TableCell><StatusBadge status={q.status} kind="quote" /></TableCell>
                <TableCell className="text-slate-600 text-sm">
                  Created: {formatDate(q.createdDate)}<br />
                  Valid: {formatDate(q.validUntil)}
                </TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(q.total)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Link href={`/quotes/${q.id}/pdf`} target="_blank">
                      <Button variant="ghost" size="icon"><FileText className="h-4 w-4" /></Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <Pagination total={totalCount} page={pageNum} status={status} q={q} />
    </div>
  );
}

function Pagination({ total, page, status, q }: { total: number; page: number; status: string; q?: string }) {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages <= 1) return null;
  const qs = (p: number) => `?status=${status}${q ? `&q=${q}` : ''}&page=${p}`;
  return (
    <div className="flex justify-end items-center gap-2 mt-4 text-sm">
      <span className="text-slate-600">{total} items</span>
      <Link href={qs(Math.max(1, page - 1))}>
        <Button variant="outline" size="sm" disabled={page === 1}>‹</Button>
      </Link>
      <span className="px-2">Page {page} of {totalPages}</span>
      <Link href={qs(Math.min(totalPages, page + 1))}>
        <Button variant="outline" size="sm" disabled={page === totalPages}>›</Button>
      </Link>
    </div>
  );
}
```

### 7. Quote Form Page (new + edit)

The form is complex enough that I'll describe its structure and key snippets. Implement as
`app/(admin)/quotes/new/page.tsx` + `app/(admin)/quotes/[id]/edit/page.tsx`, both rendering
a shared `<QuoteForm>` client component.

**Structure** of `<QuoteForm>` (client component):
- Two-column layout (main left, sidebar right)
- Main left:
  - Title input
  - Description textarea (collapsible)
  - **Line Items repeater** — array of rows, each with Qty/Title/Rate (number inputs), Amount (read-only computed), Description (textarea), Taxable checkbox, remove button, up/down reorder
  - "Add Another Item" button
  - "Add a pre-defined line item" Select that appends a new row pre-filled
  - **Totals box** to the right of line items, computed live:
    - Sub Total, GST/Tax, Discount (with edit button → input), Total Due (bold)
  - Terms & Conditions textarea (collapsible, default-filled from QuoteSettings)
- Right sidebar:
  - **Publish box**: Save Draft button + Publish (sets status to SENT) button
  - **Quote Details box**:
    - Client picker (Select with all clients + "+ New Client" link that opens the modal from Step 4)
    - Status dropdown
    - Quote Number (auto-filled, editable)
    - Created Date (date picker)
    - Valid Until Date (date picker)

**State management:** keep all form state in React state (`useState`), submit by serializing
to a plain object and calling `createQuote(state)` / `updateQuote(id, state)` server actions.
Use `useTransition` for pending UI.

**Live totals:** create a `useMemo` that calls `calculateTotals()` on every state change.
This re-renders the totals box but does NOT hit the server until save.

Example skeleton:

```tsx
'use client';
import { useState, useMemo, useTransition } from 'react';
import { calculateTotals, lineItemAmount } from '@/lib/totals';
import { formatCurrency } from '@/lib/currency';
import { createQuote, updateQuote } from './actions';
// ... shadcn imports

export function QuoteForm({ initial, clients, predefinedItems, defaults, taxSettings }: Props) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState({
    clientId: initial?.clientId ?? '',
    title: initial?.title ?? '',
    // ... etc
    lineItems: initial?.lineItems ?? [{ qty: 1, title: '', description: '', rate: 0, taxable: true }],
    discount: initial?.discount ?? 0,
    // ...
  });

  const totals = useMemo(
    () => calculateTotals({
      lineItems: state.lineItems,
      taxPercentage: taxSettings.taxPercentage,
      pricesEnteredWithTax: taxSettings.pricesEnteredWithTax,
      discount: state.discount,
    }),
    [state.lineItems, state.discount, taxSettings]
  );

  function addRow() {
    setState((s) => ({ ...s, lineItems: [...s.lineItems, { qty: 1, title: '', description: '', rate: 0, taxable: true }] }));
  }

  function addPredefined(itemId: string) {
    const item = predefinedItems.find((p) => p.id === itemId);
    if (!item) return;
    setState((s) => ({
      ...s,
      lineItems: [...s.lineItems, { qty: item.qty, title: item.title, description: item.description ?? '', rate: item.rate, taxable: true }],
    }));
  }

  function save(asStatus: 'DRAFT' | 'SENT') {
    startTransition(async () => {
      const payload = { ...state, status: asStatus };
      const r = initial ? await updateQuote(initial.id, payload) : await createQuote(payload);
      // server action redirects on create
    });
  }

  // ... JSX
}
```

### 8. Quote View Page

`app/(admin)/quotes/[id]/page.tsx` shows the read-only quote rendering (same component
that's used on the public page in Step 6, but with admin actions visible) plus action
buttons:

- **Send** — calls `sendQuoteEmail(id)`. For now this just sets status=SENT and toasts the
  public link to clipboard. Step 10 will hook up real email.
- **Copy Public Link** — copies `${APP_URL}/q/${publicToken}` to clipboard
- **Convert to Invoice** — calls `convertQuoteToInvoice(id)`, redirects to the new invoice
- **Edit** — links to `/quotes/[id]/edit`
- **Delete** — confirms, calls `deleteQuote(id)`
- **Status dropdown** — manual status override, calls `changeQuoteStatus(id, newStatus)`

Show the quote in the visual template (same layout as the PDF — built in Step 9).

## Verification Checklist

- [ ] `/quotes` shows the status tabs with live counts
- [ ] `/quotes/new` form renders with empty line items repeater
- [ ] Adding a pre-defined line item from the dropdown appends a populated row
- [ ] Totals update live as you type
- [ ] Tax inclusive/exclusive toggle in settings produces correct math
- [ ] Saving a quote creates it, redirects to `/quotes/[id]`
- [ ] Quote number increments correctly across multiple creates
- [ ] Edit page pre-fills all values
- [ ] Send button sets status to SENT and copies link to clipboard
- [ ] Convert to Invoice creates a matching invoice and marks quote CONVERTED
- [ ] Delete removes the quote and its line items
- [ ] AuditLog gets entries for CREATED / UPDATED / SENT / CONVERTED / DELETED
- [ ] `npx tsc --noEmit` passes

## Commit

```bash
git add -A
git commit -m "step-5: quotes admin module — list, form with line items, view, actions"
```

## Next

Proceed to `06-QUOTES-PUBLIC.md`.

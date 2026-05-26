# Step 7 — Invoices (Admin) + Payments

## Goal

Mirror the Quotes admin module for Invoices, plus add the Payment recording flow. The big
difference: invoices track payments and have a `paid` and `totalDue` calculation.

## Prerequisites

- Steps 0–6 complete

## Differences from Quotes

| Quote | Invoice |
|---|---|
| `validUntil` field | `dueDate` field |
| No payments | Has `Payment[]` relation |
| No `paid` / `totalDue` | Tracks `paid` (sum of payments) and `totalDue` (total - paid) |
| Statuses: DRAFT/SENT/ACCEPTED/DECLINED/EXPIRED/CONVERTED/CANCELLED | Statuses: DRAFT/SENT/PAID/PARTIAL/OVERDUE/CANCELLED |
| No public Pay button | Pay Now button on public view (Step 8) |
| Status auto: EXPIRED if validUntil passed | Status auto: OVERDUE if dueDate passed unpaid |

## Steps

### 1. Server Actions

`app/(admin)/invoices/actions.ts`:

```ts
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { calculateTotals, lineItemAmount } from '@/lib/totals';
import { getNextInvoiceNumber } from '@/lib/numbering';
import { getInvoiceSettings, getTaxSettings } from '@/lib/settings';
import { writeAudit } from '@/lib/audit';
import { getAdminEmail } from '@/lib/auth';

const lineItemSchema = z.object({
  qty: z.coerce.number().min(0),
  title: z.string(),
  description: z.string().optional(),
  rate: z.coerce.number().min(0),
  taxable: z.coerce.boolean().default(true),
});

const invoiceSchema = z.object({
  clientId: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  orderNumber: z.string().optional(),
  dueDate: z.string(),
  createdDate: z.string(),
  terms: z.string().optional(),
  footer: z.string().optional(),
  discount: z.coerce.number().min(0).default(0),
  lineItems: z.array(lineItemSchema),
  status: z.enum(['DRAFT', 'SENT']).default('DRAFT'),
});

type InvoiceInput = z.infer<typeof invoiceSchema>;

export async function createInvoice(input: InvoiceInput) {
  const data = invoiceSchema.parse(input);
  const [invoiceSettings, taxSettings] = await Promise.all([
    getInvoiceSettings(),
    getTaxSettings(),
  ]);

  const totals = calculateTotals({
    lineItems: data.lineItems,
    taxPercentage: taxSettings.taxPercentage,
    pricesEnteredWithTax: taxSettings.pricesEnteredWithTax as 'inclusive' | 'exclusive',
    discount: data.discount,
  });

  const created = await prisma.$transaction(async (tx) => {
    const number = await getNextInvoiceNumber(tx);
    return tx.invoice.create({
      data: {
        number,
        clientId: data.clientId,
        title: data.title,
        description: data.description,
        orderNumber: data.orderNumber,
        dueDate: new Date(data.dueDate),
        createdDate: new Date(data.createdDate),
        status: data.status,
        subtotal: totals.subtotal,
        taxPercentage: taxSettings.taxPercentage,
        taxAmount: totals.taxAmount,
        discount: totals.discount,
        paid: 0,
        totalDue: totals.total,
        total: totals.total,
        terms: data.terms ?? invoiceSettings.defaultTerms,
        footer: data.footer ?? invoiceSettings.defaultFooter,
        lineItems: {
          create: data.lineItems.map((li, idx) => ({
            parentType: 'INVOICE',
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
    action: 'INVOICE_CREATED',
    targetType: 'INVOICE',
    targetId: created.id,
    metadata: { number: created.number, status: created.status },
  });

  revalidatePath('/invoices');
  redirect(`/invoices/${created.id}`);
}

export async function updateInvoice(id: string, input: InvoiceInput) {
  const data = invoiceSchema.parse(input);
  const taxSettings = await getTaxSettings();

  const totals = calculateTotals({
    lineItems: data.lineItems,
    taxPercentage: taxSettings.taxPercentage,
    pricesEnteredWithTax: taxSettings.pricesEnteredWithTax as 'inclusive' | 'exclusive',
    discount: data.discount,
  });

  // Preserve existing payments
  const existing = await prisma.invoice.findUnique({
    where: { id },
    select: { paid: true },
  });
  const paid = existing?.paid ?? 0;
  const totalDue = Math.max(0, totals.total - paid);

  await prisma.$transaction([
    prisma.lineItem.deleteMany({ where: { invoiceId: id } }),
    prisma.invoice.update({
      where: { id },
      data: {
        clientId: data.clientId,
        title: data.title,
        description: data.description,
        orderNumber: data.orderNumber,
        dueDate: new Date(data.dueDate),
        createdDate: new Date(data.createdDate),
        status: data.status,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        discount: totals.discount,
        totalDue,
        total: totals.total,
        terms: data.terms,
        footer: data.footer,
        lineItems: {
          create: data.lineItems.map((li, idx) => ({
            parentType: 'INVOICE',
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
    action: 'INVOICE_UPDATED',
    targetType: 'INVOICE',
    targetId: id,
  });

  revalidatePath('/invoices');
  revalidatePath(`/invoices/${id}`);
  return { ok: true };
}

export async function deleteInvoice(id: string) {
  await prisma.invoice.delete({ where: { id } });
  await writeAudit({
    actor: await getAdminEmail(),
    action: 'INVOICE_DELETED',
    targetType: 'INVOICE',
    targetId: id,
  });
  revalidatePath('/invoices');
  return { ok: true };
}

export async function changeInvoiceStatus(id: string, newStatus: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) return { ok: false };
  await prisma.invoice.update({
    where: { id },
    data: { status: newStatus as never },
  });
  await writeAudit({
    actor: await getAdminEmail(),
    action: 'INVOICE_STATUS_MANUAL_OVERRIDE',
    targetType: 'INVOICE',
    targetId: id,
    metadata: { from: invoice.status, to: newStatus },
  });
  revalidatePath(`/invoices/${id}`);
  return { ok: true };
}

export async function sendInvoiceEmail(id: string) {
  await prisma.invoice.update({
    where: { id },
    data: { status: 'SENT' },
  });
  await writeAudit({
    actor: await getAdminEmail(),
    action: 'INVOICE_SENT',
    targetType: 'INVOICE',
    targetId: id,
  });
  // TODO Step 10: replace with sendTemplatedEmail('invoiceAvailable', ...)
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  const publicLink = `${process.env.NEXT_PUBLIC_APP_URL}/i/${invoice!.publicToken}`;
  revalidatePath(`/invoices/${id}`);
  return { ok: true, publicLink };
}

const paymentSchema = z.object({
  date: z.string(),
  amount: z.coerce.number().positive(),
  method: z.enum(['GENERIC', 'RAZORPAY', 'BANK', 'UPI', 'CASH']).default('GENERIC'),
  paymentId: z.string().optional(),
  memo: z.string().optional(),
});

export async function recordPayment(invoiceId: string, formData: FormData) {
  const data = paymentSchema.parse({
    date: formData.get('date'),
    amount: formData.get('amount'),
    method: formData.get('method'),
    paymentId: formData.get('paymentId') || undefined,
    memo: formData.get('memo') || undefined,
  });

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        invoiceId,
        date: new Date(data.date),
        amount: data.amount,
        method: data.method,
        paymentId: data.paymentId,
        memo: data.memo,
        status: 'COMPLETED',
      },
    });

    // Recompute paid + status
    const sumPaid = await tx.payment.aggregate({
      where: { invoiceId, status: 'COMPLETED' },
      _sum: { amount: true },
    });
    const totalPaid = sumPaid._sum.amount ?? 0;

    const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new Error('Invoice not found');

    const totalDue = Math.max(0, invoice.total - totalPaid);
    let newStatus = invoice.status;
    if (totalPaid >= invoice.total) newStatus = 'PAID';
    else if (totalPaid > 0) newStatus = 'PARTIAL';

    await tx.invoice.update({
      where: { id: invoiceId },
      data: { paid: totalPaid, totalDue, status: newStatus },
    });
  });

  await writeAudit({
    actor: await getAdminEmail(),
    action: 'INVOICE_PAYMENT_RECORDED',
    targetType: 'INVOICE',
    targetId: invoiceId,
    metadata: { amount: data.amount, method: data.method },
  });

  revalidatePath(`/invoices/${invoiceId}`);
  return { ok: true };
}

export async function deletePayment(paymentId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return { ok: false };
  const invoiceId = payment.invoiceId;

  await prisma.$transaction(async (tx) => {
    await tx.payment.delete({ where: { id: paymentId } });
    const sumPaid = await tx.payment.aggregate({
      where: { invoiceId, status: 'COMPLETED' },
      _sum: { amount: true },
    });
    const totalPaid = sumPaid._sum.amount ?? 0;
    const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new Error('Invoice not found');
    const totalDue = Math.max(0, invoice.total - totalPaid);
    let newStatus = invoice.status;
    if (totalPaid >= invoice.total) newStatus = 'PAID';
    else if (totalPaid > 0) newStatus = 'PARTIAL';
    else newStatus = invoice.status === 'PAID' || invoice.status === 'PARTIAL' ? 'SENT' : invoice.status;
    await tx.invoice.update({
      where: { id: invoiceId },
      data: { paid: totalPaid, totalDue, status: newStatus },
    });
  });

  await writeAudit({
    actor: await getAdminEmail(),
    action: 'INVOICE_PAYMENT_DELETED',
    targetType: 'INVOICE',
    targetId: invoiceId,
    metadata: { paymentId },
  });

  revalidatePath(`/invoices/${invoiceId}`);
  return { ok: true };
}

// Helper: compute OVERDUE status on read (not stored)
export function computeDisplayStatus(invoice: { status: string; dueDate: Date }): string {
  if (invoice.status === 'SENT' && invoice.dueDate < new Date()) return 'OVERDUE';
  return invoice.status;
}
```

### 2. Invoice List Page

Mirror the Quote list page (`/quotes/page.tsx`):
- Status tabs: ALL | DRAFT | SENT | PAID | PARTIAL | OVERDUE | CANCELLED
- Same filter/search/pagination structure
- "Due:" instead of "Valid:" under created date
- **Compute OVERDUE on the fly** via `computeDisplayStatus()`:

```ts
const invoicesWithStatus = invoices.map((inv) => ({
  ...inv,
  displayStatus: computeDisplayStatus(inv),
}));
```

Then filter by `displayStatus` for the OVERDUE tab.

### 3. Invoice Form (new + edit)

`app/(admin)/invoices/new/page.tsx` and `app/(admin)/invoices/[id]/edit/page.tsx` — same
structure as the Quote form, rendering a shared `<InvoiceForm>` client component.

Differences:
- "Valid Until Date" → "Due Date"
- No payments repeater on the form itself (payments are recorded on the view page via modal)

### 4. Invoice View Page

`app/(admin)/invoices/[id]/page.tsx`:
- Renders the invoice using the shared template (Step 9)
- Action buttons:
  - **Send** — calls `sendInvoiceEmail`, copies public link to clipboard
  - **Record Payment** — opens a modal with date/amount/method/payment ID/memo
  - **Download PDF** — links to `/invoices/[id]/pdf` (Step 9)
  - **Edit** — links to edit page
  - **Delete** — confirms, deletes
  - **Status dropdown** — manual override
- Below the invoice: **Payments table** showing all recorded payments with delete buttons

### 5. Record Payment Modal

`app/(admin)/invoices/[id]/record-payment-dialog.tsx`:

```tsx
'use client';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { recordPayment } from './actions';

export function RecordPaymentDialog({ invoiceId, open, onOpenChange, totalDue }: {
  invoiceId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  totalDue: number;
}) {
  const [pending, startTransition] = useTransition();
  const [method, setMethod] = useState('GENERIC');

  function onSubmit(formData: FormData) {
    formData.set('method', method);
    startTransition(async () => {
      const r = await recordPayment(invoiceId, formData);
      if (r.ok) {
        toast.success('Payment recorded');
        onOpenChange(false);
      } else {
        toast.error('Failed');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input id="amount" name="amount" type="number" step="0.01" min="0" defaultValue={totalDue} required />
          </div>
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="GENERIC">Generic</SelectItem>
                <SelectItem value="RAZORPAY">Razorpay</SelectItem>
                <SelectItem value="BANK">Bank Transfer</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="CASH">Cash</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentId">Payment ID / Reference</Label>
            <Input id="paymentId" name="paymentId" placeholder="Optional reference" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="memo">Memo</Label>
            <Textarea id="memo" name="memo" rows={2} placeholder="Optional notes" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Saving...' : 'Record'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

## Verification Checklist

- [ ] `/invoices` lists all invoices with proper status tabs and counts
- [ ] OVERDUE tab shows invoices where dueDate is past and status is SENT
- [ ] `/invoices/new` form creates an invoice, redirects to view page
- [ ] Invoice number increments (AKEYI-0128 → 0129 → 0130)
- [ ] Auto-converting from a quote pulls in line items correctly
- [ ] Record Payment modal works: payment recorded, status updates (PARTIAL if partial, PAID if equals total)
- [ ] Deleting a payment recomputes paid/totalDue correctly
- [ ] Edit page preserves existing payments (don't wipe them on update)
- [ ] AuditLog entries for all actions
- [ ] `npx tsc --noEmit` passes

## Commit

```bash
git add -A
git commit -m "step-7: invoices admin module — list, form, view, payment recording"
```

## Next

Proceed to `08-INVOICES-PUBLIC.md`.

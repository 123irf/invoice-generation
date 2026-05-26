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
import { sendTemplatedEmail, buildInvoiceContext } from '@/lib/email';

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
            parentType: 'INVOICE' as const,
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
            parentType: 'INVOICE' as const,
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
  const invoice = await prisma.invoice.update({
    where: { id },
    data: { status: 'SENT' },
    include: { client: true },
  });

  const publicLink = `${process.env.NEXT_PUBLIC_APP_URL}/i/${invoice.publicToken}`;
  const context = buildInvoiceContext(invoice, publicLink);

  await sendTemplatedEmail({
    templateKey: 'invoiceAvailable',
    to: invoice.client.email,
    context,
  });

  await writeAudit({
    actor: await getAdminEmail(),
    action: 'INVOICE_SENT',
    targetType: 'INVOICE',
    targetId: id,
    metadata: { to: invoice.client.email },
  });

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

export async function sendReminderNow(id: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { client: true },
  });
  if (!invoice) return { ok: false };

  const publicLink = `${process.env.NEXT_PUBLIC_APP_URL}/i/${invoice.publicToken}`;
  const r = await sendTemplatedEmail({
    templateKey: 'paymentReminder',
    to: invoice.client.email,
    context: buildInvoiceContext(invoice, publicLink),
  });

  await writeAudit({
    actor: await getAdminEmail(),
    action: 'INVOICE_REMINDER_SENT',
    targetType: 'INVOICE',
    targetId: id,
  });

  return r;
}

// Helper: compute OVERDUE status on read (not stored)
export function computeDisplayStatus(invoice: { status: string; dueDate: Date }): string {
  if (invoice.status === 'SENT' && invoice.dueDate < new Date()) return 'OVERDUE';
  return invoice.status;
}

'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { calculateTotals, lineItemAmount } from '@/lib/totals';
import { getNextQuoteNumber, getNextInvoiceNumber } from '@/lib/numbering';
import { getQuoteSettings, getTaxSettings, getInvoiceSettings } from '@/lib/settings';
import { writeAudit } from '@/lib/audit';
import { getAdminEmail } from '@/lib/auth';
import { sendTemplatedEmail, buildQuoteContext } from '@/lib/email';
import { requirePermission } from '@/lib/permissions';
import { generateQuotePdf } from '@/lib/generate-pdf';

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
  await requirePermission('quotes.create');
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

  const number = await getNextQuoteNumber();
  const created = await prisma.quote.create({
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
          parentType: 'QUOTE' as const,
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

  await writeAudit({
    actor: await getAdminEmail(),
    action: 'QUOTE_CREATED',
    targetType: 'QUOTE',
    targetId: created.id,
    metadata: { number: created.number, status: created.status },
  });

  revalidatePath('/invoice-generation');
  redirect(`/invoice-generation/${created.id}`);
}

export async function updateQuote(id: string, input: QuoteInput) {
  await requirePermission('quotes.edit');
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
            parentType: 'QUOTE' as const,
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

  revalidatePath('/invoice-generation');
  revalidatePath(`/invoice-generation/${id}`);
  return { ok: true };
}

export async function deleteQuote(id: string) {
  await requirePermission('quotes.delete');
  await prisma.quote.delete({ where: { id } });
  await writeAudit({
    actor: await getAdminEmail(),
    action: 'QUOTE_DELETED',
    targetType: 'QUOTE',
    targetId: id,
  });
  revalidatePath('/invoice-generation');
  return { ok: true };
}

export async function changeQuoteStatus(id: string, newStatus: string) {
  await requirePermission('quotes.edit');
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
  revalidatePath(`/invoice-generation/${id}`);
  return { ok: true };
}

// Send action — wired to SMTP
export async function sendQuoteEmail(id: string) {
  await requirePermission('quotes.send');
  const quote = await prisma.quote.update({
    where: { id },
    data: { status: 'SENT' },
    include: { client: true },
  });

  const publicLink = `${process.env.NEXT_PUBLIC_APP_URL}/q/${quote.publicToken}`;
  const context = buildQuoteContext(quote, publicLink);

  // Generate PDF attachment
  const pdfBuffer = await generateQuotePdf(id);

  const emailResult = await sendTemplatedEmail({
    templateKey: 'quoteAvailable',
    to: quote.client.email,
    context,
    attachments: [{ filename: `${quote.number}.pdf`, content: pdfBuffer }],
  });

  await writeAudit({
    actor: await getAdminEmail(),
    action: 'QUOTE_SENT',
    targetType: 'QUOTE',
    targetId: id,
    metadata: { to: quote.client.email },
  });

  revalidatePath(`/invoice-generation/${id}`);
  revalidatePath('/invoice-generation');
  if (!emailResult.ok) {
    return { ok: false, error: emailResult.error ?? 'Email send failed' };
  }
  return { ok: true, publicLink };
}

// Convert quote to invoice — used directly by admin AND auto-called from public accept (Step 6)
export async function convertQuoteToInvoice(quoteId: string) {
  await requirePermission('quotes.convert');
  const invoiceSettings = await getInvoiceSettings();
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { lineItems: { orderBy: { order: 'asc' } } },
  });
  if (!quote) throw new Error('Quote not found');
  if (quote.convertedInvoiceId) throw new Error('Quote already converted');

  const number = await getNextInvoiceNumber();
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + invoiceSettings.dueDateDays);

  const result = await prisma.invoice.create({
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
          parentType: 'INVOICE' as const,
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

  await prisma.quote.update({
    where: { id: quote.id },
    data: { status: 'CONVERTED', convertedInvoiceId: result.id },
  });

  await writeAudit({
    actor: await getAdminEmail(),
    action: 'QUOTE_CONVERTED_TO_INVOICE',
    targetType: 'QUOTE',
    targetId: quoteId,
    metadata: { invoiceId: result.id, invoiceNumber: result.number },
  });

  revalidatePath('/invoice-generation');
  revalidatePath('/invoices');
  return { ok: true, invoiceId: result.id };
}

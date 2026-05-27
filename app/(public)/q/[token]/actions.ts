'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { writeAudit } from '@/lib/audit';
import { getClientIp } from '@/lib/rate-limit';
import { getQuoteSettings, getInvoiceSettings } from '@/lib/settings';
import { getNextInvoiceNumber } from '@/lib/numbering';
import { sendTemplatedEmail, buildInvoiceContext } from '@/lib/email';

export async function acceptQuote(token: string) {
  const ip = await getClientIp();
  const settings = await getQuoteSettings();
  const invoiceSettings = await getInvoiceSettings();

  try {
    const quote = await prisma.quote.findUnique({
      where: { publicToken: token },
      include: { lineItems: { orderBy: { order: 'asc' } } },
    });
    if (!quote) throw new Error('Quote not found');
    if (quote.status !== 'SENT') {
      throw new Error(`Cannot accept — quote is already ${quote.status.toLowerCase()}`);
    }

    await prisma.quote.update({
      where: { id: quote.id },
      data: { status: 'ACCEPTED', acceptedAt: new Date() },
    });

    let newInvoiceId: string | null = null;

    if (settings.acceptedQuoteAction === 'convert_and_send' || settings.acceptedQuoteAction === 'convert_only') {
      const number = await getNextInvoiceNumber();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + invoiceSettings.dueDateDays);

      const invoice = await prisma.invoice.create({
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
      newInvoiceId = invoice.id;

      await prisma.quote.update({
        where: { id: quote.id },
        data: { status: 'CONVERTED', convertedInvoiceId: invoice.id },
      });
    }

    const result = { quoteId: quote.id, newInvoiceId, action: settings.acceptedQuoteAction };

    await writeAudit({
      actor: 'client@public',
      actorIp: ip,
      action: 'QUOTE_ACCEPTED_BY_CLIENT',
      targetType: 'QUOTE',
      targetId: result.quoteId,
      metadata: { action: result.action, newInvoiceId: result.newInvoiceId },
    });

    // Auto-send invoice email if quote action is convert_and_send
    if (result.newInvoiceId && result.action === 'convert_and_send') {
      const newInvoice = await prisma.invoice.findUnique({
        where: { id: result.newInvoiceId },
        include: { client: true },
      });
      if (newInvoice) {
        const publicLink = `${process.env.NEXT_PUBLIC_APP_URL}/i/${newInvoice.publicToken}`;
        await sendTemplatedEmail({
          templateKey: 'invoiceAvailable',
          to: newInvoice.client.email,
          context: buildInvoiceContext(newInvoice, publicLink),
        });
      }
    }

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

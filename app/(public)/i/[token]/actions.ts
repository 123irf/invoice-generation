'use server';

import Razorpay from 'razorpay';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { writeAudit } from '@/lib/audit';
import { getClientIp } from '@/lib/rate-limit';
import { sendTemplatedEmail, buildInvoiceContext } from '@/lib/email';

const razorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
  ? new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
  : null;

export async function createRazorpayOrder(token: string) {
  if (!razorpay) return { ok: false as const, error: 'Razorpay not configured' };

  const invoice = await prisma.invoice.findUnique({
    where: { publicToken: token },
    include: { client: true },
  });
  if (!invoice) return { ok: false as const, error: 'Invoice not found' };
  if (invoice.totalDue <= 0) return { ok: false as const, error: 'Invoice already paid' };

  const amountPaise = Math.round(invoice.totalDue * 100); // Razorpay uses smallest currency unit

  try {
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: invoice.number,
      notes: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.number,
        clientEmail: invoice.client.email,
      },
    });

    await writeAudit({
      actor: 'client@public',
      actorIp: await getClientIp(),
      action: 'INVOICE_PAY_INITIATED',
      targetType: 'INVOICE',
      targetId: invoice.id,
      metadata: { orderId: order.id, amount: amountPaise },
    });

    return {
      ok: true as const,
      orderId: order.id,
      amount: amountPaise,
      currency: 'INR',
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      prefill: {
        name: invoice.client.businessName,
        email: invoice.client.email,
        contact: invoice.client.phone ?? '',
      },
      invoiceNumber: invoice.number,
    };
  } catch (e: any) {
    return { ok: false as const, error: e.message };
  }
}

export async function verifyRazorpayPayment(
  token: string,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
) {
  const ip = await getClientIp();
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return { ok: false as const, error: 'Razorpay not configured' };

  // CRITICAL: Verify signature on the server. Never trust the client.
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    await writeAudit({
      actor: 'client@public',
      actorIp: ip,
      action: 'INVOICE_PAY_INVALID_SIGNATURE',
      targetType: 'INVOICE',
      metadata: { razorpayOrderId, razorpayPaymentId },
    });
    return { ok: false as const, error: 'Invalid signature' };
  }

  const invoice = await prisma.invoice.findUnique({
    where: { publicToken: token },
    include: { client: true },
  });
  if (!invoice) return { ok: false as const, error: 'Invoice not found' };

  // Guard: don't double-record a payment for the same Razorpay payment ID
  const existing = await prisma.payment.findFirst({
    where: { paymentId: razorpayPaymentId },
  });
  if (existing) {
    return { ok: true as const, alreadyRecorded: true };
  }

  // Compute the amount paid for this transaction by querying Razorpay
  let paidAmount = invoice.totalDue;
  try {
    if (razorpay) {
      const payment = await razorpay.payments.fetch(razorpayPaymentId);
      paidAmount = Number(payment.amount) / 100;
    }
  } catch {
    // Fall back to totalDue if fetch fails
  }

  // Record payment and update invoice
  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        date: new Date(),
        amount: paidAmount,
        method: 'RAZORPAY',
        paymentId: razorpayPaymentId,
        status: 'COMPLETED',
        memo: `Razorpay order: ${razorpayOrderId}`,
      },
    });

    const sumPaid = await tx.payment.aggregate({
      where: { invoiceId: invoice.id, status: 'COMPLETED' },
      _sum: { amount: true },
    });
    const totalPaid = sumPaid._sum.amount ?? 0;
    const totalDue = Math.max(0, invoice.total - totalPaid);
    const newStatus = totalPaid >= invoice.total ? 'PAID' : 'PARTIAL';

    await tx.invoice.update({
      where: { id: invoice.id },
      data: { paid: totalPaid, totalDue, status: newStatus },
    });
  });

  await writeAudit({
    actor: 'client@public',
    actorIp: ip,
    action: 'INVOICE_PAID_BY_CLIENT',
    targetType: 'INVOICE',
    targetId: invoice.id,
    metadata: { razorpayPaymentId, razorpayOrderId, amount: paidAmount },
  });

  // Send payment received email (don't await — fire and forget so signature verification responds fast)
  const publicLink = `${process.env.NEXT_PUBLIC_APP_URL}/i/${invoice.publicToken}`;
  sendTemplatedEmail({
    templateKey: 'paymentReceived',
    to: invoice.client.email,
    context: buildInvoiceContext({ ...invoice, paid: invoice.paid + paidAmount }, publicLink, paidAmount),
  }).catch((err) => console.error('Payment received email failed:', err));

  revalidatePath(`/i/${token}`);
  return { ok: true as const };
}

# Step 11 — Razorpay Payments (Test Mode)

## Goal

Replace the Pay button stub from Step 8 with full Razorpay Checkout integration in test mode.
Server creates an order, client opens Razorpay Checkout modal, server verifies the payment
signature, marks the invoice paid, and sends a payment-received email.

## Prerequisites

- Steps 0–10 complete
- Razorpay account → switch to Test Mode → API keys generated
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID` set in `.env.local`

## Razorpay Concepts

1. **Order** — server-side object representing intent to receive payment (amount + currency)
2. **Checkout** — client-side modal where customer enters card details, opened via Razorpay JS SDK
3. **Signature** — HMAC SHA256 of `orderId|paymentId` using secret key; verified on the server to confirm the payment is legitimate

## Steps

### 1. Server: Create Razorpay Order

`app/(public)/i/[token]/actions.ts`:

```ts
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
  if (!razorpay) return { ok: false, error: 'Razorpay not configured' };

  const invoice = await prisma.invoice.findUnique({
    where: { publicToken: token },
    include: { client: true },
  });
  if (!invoice) return { ok: false, error: 'Invoice not found' };
  if (invoice.totalDue <= 0) return { ok: false, error: 'Invoice already paid' };

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
      ok: true,
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
    return { ok: false, error: e.message };
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
  if (!secret) return { ok: false, error: 'Razorpay not configured' };

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
    return { ok: false, error: 'Invalid signature' };
  }

  const invoice = await prisma.invoice.findUnique({
    where: { publicToken: token },
    include: { client: true },
  });
  if (!invoice) return { ok: false, error: 'Invoice not found' };

  // Guard: don't double-record a payment for the same Razorpay payment ID
  const existing = await prisma.payment.findFirst({
    where: { paymentId: razorpayPaymentId },
  });
  if (existing) {
    return { ok: true, alreadyRecorded: true };
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
  return { ok: true };
}
```

### 2. Client: Pay Button with Razorpay Checkout

Replace `components/public/pay-button.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/currency';
import { createRazorpayOrder, verifyRazorpayPayment } from '@/app/(public)/i/[token]/actions';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function PayButton({ token, amount }: { token: string; amount: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    try {
      const order = await createRazorpayOrder(token);
      if (!order.ok) {
        toast.error(order.error ?? 'Failed to create order');
        setPending(false);
        return;
      }

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Ultrakey IT Solutions',
        description: `Payment for invoice ${order.invoiceNumber}`,
        order_id: order.orderId,
        prefill: order.prefill,
        theme: { color: '#2C5282' },
        handler: async (response: any) => {
          const r = await verifyRazorpayPayment(
            token,
            response.razorpay_order_id,
            response.razorpay_payment_id,
            response.razorpay_signature
          );
          if (r.ok) {
            toast.success('Payment successful!');
            router.push(`/i/${token}/paid`);
          } else {
            toast.error(r.error ?? 'Verification failed');
          }
        },
        modal: {
          ondismiss: () => setPending(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        toast.error(response.error?.description ?? 'Payment failed');
        setPending(false);
      });
      rzp.open();
    } catch (e: any) {
      toast.error(e.message ?? 'Something went wrong');
      setPending(false);
    }
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <Button
        size="lg"
        onClick={onClick}
        disabled={pending}
        className="bg-blue-600 hover:bg-blue-700"
      >
        {pending ? 'Processing...' : `Pay Now — ${formatCurrency(amount)}`}
      </Button>
    </>
  );
}
```

### 3. Test Card Hint on Public Invoice Page

Add a small hint to the public invoice view (only when payable):

```tsx
{isPayable && process.env.NODE_ENV !== 'production' && (
  <div className="text-xs text-slate-500 text-center mt-2">
    Test card: <code>4111 1111 1111 1111</code> · any future expiry · any 3-digit CVV
  </div>
)}
```

### 4. (Optional) Webhook Endpoint for Async Updates

Razorpay can also POST a webhook to confirm payments asynchronously, useful when the client
closes the browser before the success page loads. For MVP we rely on the synchronous
handler. To add later:

`app/api/razorpay/webhook/route.ts` (skeleton):

```ts
import { NextRequest } from 'next/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex');
  if (expected !== signature) return new Response('Invalid signature', { status: 400 });

  const event = JSON.parse(body);
  if (event.event === 'payment.captured') {
    // Same logic as verifyRazorpayPayment, idempotent
  }
  return Response.json({ ok: true });
}
```

Document this as v1.1 work in the README.

## Verification Checklist

- [ ] Razorpay env vars set
- [ ] Open public invoice → click Pay Now → Razorpay modal opens
- [ ] Test card `4111 1111 1111 1111` with future expiry and any CVV → payment success
- [ ] Browser redirects to `/i/[token]/paid` page
- [ ] Invoice in DB updated: status PAID, paid = total, totalDue = 0
- [ ] Payment row created with `method: RAZORPAY`, `paymentId` set
- [ ] Payment-received email arrives in client's inbox (and BCC to admin)
- [ ] Audit log has INVOICE_PAY_INITIATED, INVOICE_PAID_BY_CLIENT entries
- [ ] Refreshing public invoice now shows "Paid in full" banner
- [ ] Tampering with signature in DevTools causes verification failure and INVOICE_PAY_INVALID_SIGNATURE audit entry
- [ ] Replaying the same payment ID does not double-record (idempotency check)
- [ ] `npx tsc --noEmit` passes

## Commit

```bash
git add -A
git commit -m "step-11: Razorpay test-mode integration with HMAC signature verification"
```

## Next

Proceed to `12-DASHBOARD.md`.

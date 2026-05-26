import { NextRequest } from 'next/server';
import crypto from 'crypto';

// Skeleton: Razorpay webhook for async payment confirmation (v1.1)
// Configure RAZORPAY_WEBHOOK_SECRET in .env.local and set the
// webhook URL in the Razorpay Dashboard to enable this endpoint.

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    return new Response('Webhook secret not configured', { status: 500 });
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  if (expected !== signature) {
    return new Response('Invalid signature', { status: 400 });
  }

  const event = JSON.parse(body);

  if (event.event === 'payment.captured') {
    // TODO (v1.1): Same idempotent logic as verifyRazorpayPayment
    // - Look up invoice by order receipt / notes
    // - Check if payment already recorded (idempotency)
    // - Record payment + update invoice status
    // - Send payment-received email
  }

  return Response.json({ ok: true });
}

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
            toast.error('error' in r ? r.error ?? 'Verification failed' : 'Verification failed');
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

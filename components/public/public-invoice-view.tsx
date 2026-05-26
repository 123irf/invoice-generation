'use client';

import { buttonVariants } from '@/components/ui/button';
import { QuoteInvoiceTemplate } from '@/components/shared/quote-invoice-template';
import { PayButton } from './pay-button';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PublicInvoiceView({ token, dto }: { token: string; dto: any }) {
  const fullyPaid = dto.totalDue <= 0;
  const isPayable = !fullyPaid && (dto.rawStatus === 'SENT' || dto.rawStatus === 'PARTIAL');

  return (
    <>
      {fullyPaid && (
        <div className="bg-green-50 border border-green-200 text-green-900 p-3 rounded mb-4 text-center font-medium">
          This invoice has been paid in full. Thank you!
        </div>
      )}

      {dto.status === 'OVERDUE' && !fullyPaid && (
        <div className="bg-red-50 border border-red-200 text-red-900 p-3 rounded mb-4 text-center font-medium">
          This invoice is overdue.
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg p-8">
        <QuoteInvoiceTemplate kind="invoice" dto={dto} />

        <div className="flex flex-wrap gap-3 justify-center mt-8 pt-8 border-t">
          {isPayable && (
            <PayButton token={token} amount={dto.totalDue} />
          )}
          <a
            href={`/api/invoice/${token}/pdf`}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: 'outline' }))}
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </a>
        </div>
        {isPayable && process.env.NODE_ENV !== 'production' && (
          <div className="text-xs text-slate-500 text-center mt-2">
            Test card: <code>4111 1111 1111 1111</code> · any future expiry · any 3-digit CVV
          </div>
        )}
      </div>
    </>
  );
}

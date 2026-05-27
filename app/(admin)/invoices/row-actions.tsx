'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Download, Mail } from 'lucide-react';
import { sendInvoiceEmail } from './actions';

interface Props {
  invoiceId: string;
  admin?: boolean;
}

export function InvoiceRowActions({ invoiceId, admin }: Props) {
  const [pending, startTransition] = useTransition();

  function onSendEmail() {
    startTransition(async () => {
      const r = await sendInvoiceEmail(invoiceId);
      if (r.ok) {
        toast.success('Invoice email sent');
      } else {
        toast.error(r.error || 'Failed to send email');
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <a
        href={`/invoices/${invoiceId}/pdf`}
        download
        className="inline-flex items-center justify-center h-7 w-7 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
        title="Download PDF"
      >
        <Download className="h-4 w-4" />
      </a>
      {admin && (
        <button
          onClick={onSendEmail}
          disabled={pending}
          className="inline-flex items-center justify-center h-7 w-7 rounded hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-colors disabled:opacity-50"
          title="Send Email"
        >
          <Mail className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

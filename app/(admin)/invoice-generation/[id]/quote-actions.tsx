'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  sendQuoteEmail,
  convertQuoteToInvoice,
  deleteQuote,
  changeQuoteStatus,
} from '../actions';
import { Send, FileText, Pencil, Trash2, Link2, ArrowRight, Download } from 'lucide-react';

const ALL_STATUSES = ['DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED', 'CONVERTED'];

interface Props {
  quoteId: string;
  currentStatus: string;
  publicToken: string;
  convertedInvoiceId: string | null;
  admin?: boolean;
}

export function QuoteActions({ quoteId, currentStatus, publicToken, convertedInvoiceId, admin }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);

  function onSend() {
    startTransition(async () => {
      const r = await sendQuoteEmail(quoteId);
      if (r.ok) {
        if (r.publicLink) {
          await navigator.clipboard.writeText(r.publicLink);
          toast.success('Status set to SENT. Public link copied to clipboard.');
        } else {
          toast.success('Status set to SENT.');
        }
        router.refresh();
      } else {
        toast.error('Failed to send');
      }
    });
  }

  function onCopyLink() {
    const link = `${window.location.origin}/q/${publicToken}`;
    navigator.clipboard.writeText(link);
    toast.success('Public link copied to clipboard');
  }

  function onConvert() {
    startTransition(async () => {
      try {
        const r = await convertQuoteToInvoice(quoteId);
        if (r.ok) {
          toast.success('Invoice created from quote');
          router.push(`/invoices/${r.invoiceId}`);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to convert';
        toast.error(msg);
      }
    });
  }

  function onDelete() {
    startTransition(async () => {
      const r = await deleteQuote(quoteId);
      if (r.ok) {
        toast.success('Quote deleted');
        router.push('/invoice-generation?type=quotations');
      } else {
        toast.error('Failed to delete');
      }
    });
  }

  function onStatusChange(newStatus: string) {
    startTransition(async () => {
      const r = await changeQuoteStatus(quoteId, newStatus);
      if (r.ok) {
        toast.success(`Status changed to ${newStatus}`);
        router.refresh();
      } else {
        toast.error('Failed to change status');
      }
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-6">
        {admin && (
          <Button onClick={onSend} disabled={pending}>
            <Send className="h-4 w-4 mr-2" />
            Send Email
          </Button>
        )}

        <Button variant="outline" onClick={onCopyLink}>
          <Link2 className="h-4 w-4 mr-2" />
          Copy Public Link
        </Button>

        {admin && !convertedInvoiceId && currentStatus !== 'CONVERTED' && (
          <Button variant="outline" onClick={onConvert} disabled={pending}>
            <ArrowRight className="h-4 w-4 mr-2" />
            Convert to Invoice
          </Button>
        )}

        {convertedInvoiceId && (
          <Button
            variant="outline"
            onClick={() => router.push(`/invoices/${convertedInvoiceId}`)}
          >
            <FileText className="h-4 w-4 mr-2" />
            View Invoice
          </Button>
        )}

        <a
          href={`/invoice-generation/${quoteId}/pdf`}
          download
          className={cn(buttonVariants({ variant: 'outline' }))}
        >
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </a>

        {admin && (
          <>
            <Button variant="outline" onClick={() => router.push(`/invoice-generation/${quoteId}/edit`)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>

            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>

            {/* Status override */}
            <Select value={currentStatus} onValueChange={(val: string | null) => { if (val) onStatusChange(val); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this quote?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The quote and all its line items will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={onDelete} disabled={pending}>
              {pending ? 'Deleting...' : 'Delete Quote'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

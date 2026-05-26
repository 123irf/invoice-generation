'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
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
  sendInvoiceEmail,
  deleteInvoice,
  changeInvoiceStatus,
  sendReminderNow,
} from '../actions';
import { RecordPaymentDialog } from './record-payment-dialog';
import { Send, Pencil, Trash2, Link2, CreditCard, Bell } from 'lucide-react';

const ALL_STATUSES = ['DRAFT', 'SENT', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED'];

interface Props {
  invoiceId: string;
  currentStatus: string;
  publicToken: string;
  totalDue: number;
}

export function InvoiceActions({ invoiceId, currentStatus, publicToken, totalDue }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  function onSend() {
    startTransition(async () => {
      const r = await sendInvoiceEmail(invoiceId);
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
    const link = `${window.location.origin}/i/${publicToken}`;
    navigator.clipboard.writeText(link);
    toast.success('Public link copied to clipboard');
  }

  function onDelete() {
    startTransition(async () => {
      const r = await deleteInvoice(invoiceId);
      if (r.ok) {
        toast.success('Invoice deleted');
        router.push('/invoices');
      } else {
        toast.error('Failed to delete');
      }
    });
  }

  function onSendReminder() {
    startTransition(async () => {
      const r = await sendReminderNow(invoiceId);
      if (r.ok) {
        toast.success('Reminder sent');
      } else {
        toast.error('error' in r && r.error ? r.error : 'Failed to send reminder');
      }
    });
  }

  function onStatusChange(newStatus: string) {
    startTransition(async () => {
      const r = await changeInvoiceStatus(invoiceId, newStatus);
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
        {currentStatus === 'DRAFT' && (
          <Button onClick={onSend} disabled={pending}>
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
        )}

        <Button variant="outline" onClick={() => setPaymentOpen(true)}>
          <CreditCard className="h-4 w-4 mr-2" />
          Record Payment
        </Button>

        <Button variant="outline" onClick={onSendReminder} disabled={pending}>
          <Bell className="h-4 w-4 mr-2" />
          Send Reminder Now
        </Button>

        <Button variant="outline" onClick={onCopyLink}>
          <Link2 className="h-4 w-4 mr-2" />
          Copy Public Link
        </Button>

        <Button variant="outline" onClick={() => router.push(`/invoices/${invoiceId}/edit`)}>
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
      </div>

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this invoice?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The invoice, all its line items, and payment records will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={onDelete} disabled={pending}>
              {pending ? 'Deleting...' : 'Delete Invoice'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <RecordPaymentDialog
        invoiceId={invoiceId}
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        totalDue={totalDue}
      />
    </>
  );
}

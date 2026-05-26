'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { QuoteInvoiceTemplate } from '@/components/shared/quote-invoice-template';
import { acceptQuote, declineQuote } from '@/app/(public)/q/[token]/actions';

export function PublicQuoteView({ token, dto, acceptText, declineReasonRequired, showAcceptButton }: any) {
  const router = useRouter();
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [pending, startTransition] = useTransition();

  const isActionable = dto.status === 'SENT' && showAcceptButton;

  function onAccept() {
    startTransition(async () => {
      const r = await acceptQuote(token);
      if (r.ok) {
        router.push(`/q/${token}/accepted`);
      } else {
        toast.error(r.error ?? 'Failed to accept');
      }
    });
  }

  function onDecline() {
    if (declineReasonRequired && !declineReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    startTransition(async () => {
      const r = await declineQuote(token, declineReason);
      if (r.ok) {
        router.push(`/q/${token}/declined`);
      } else {
        toast.error(r.error ?? 'Failed');
      }
    });
  }

  return (
    <>
      {!isActionable && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 p-3 rounded mb-4">
          This quote is {dto.status.toLowerCase()} and no longer actionable.
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg p-8">
        <QuoteInvoiceTemplate kind="quote" dto={dto} />

        {isActionable && (
          <div className="flex gap-3 justify-center mt-8 pt-8 border-t">
            <Button size="lg" onClick={() => setAcceptOpen(true)} className="bg-green-600 hover:bg-green-700">
              Accept Quote
            </Button>
            <Button size="lg" variant="outline" onClick={() => setDeclineOpen(true)}>
              Decline
            </Button>
          </div>
        )}
      </div>

      {/* Accept confirmation modal */}
      <Dialog open={acceptOpen} onOpenChange={setAcceptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept this quote?</DialogTitle>
            <DialogDescription dangerouslySetInnerHTML={{ __html: acceptText }} />
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptOpen(false)}>Cancel</Button>
            <Button onClick={onAccept} disabled={pending} className="bg-green-600 hover:bg-green-700">
              {pending ? 'Accepting...' : 'Confirm Accept'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline modal with reason */}
      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline this quote?</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason {declineReasonRequired ? '*' : '(optional)'}
            </Label>
            <Textarea
              id="reason"
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={onDecline} disabled={pending}>
              {pending ? 'Declining...' : 'Confirm Decline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

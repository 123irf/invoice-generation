'use client';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { recordPayment } from '../actions';

export function RecordPaymentDialog({ invoiceId, open, onOpenChange, totalDue }: {
  invoiceId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  totalDue: number;
}) {
  const [pending, startTransition] = useTransition();
  const [method, setMethod] = useState('GENERIC');

  function onSubmit(formData: FormData) {
    formData.set('method', method);
    startTransition(async () => {
      const r = await recordPayment(invoiceId, formData);
      if (r.ok) {
        toast.success('Payment recorded');
        onOpenChange(false);
      } else {
        toast.error('Failed');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount ({'\u20B9'})</Label>
            <Input id="amount" name="amount" type="number" step="0.01" min="0" defaultValue={totalDue} required />
          </div>
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={method} onValueChange={(val: string | null) => { if (val) setMethod(val); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="GENERIC">Generic</SelectItem>
                <SelectItem value="RAZORPAY">Razorpay</SelectItem>
                <SelectItem value="BANK">Bank Transfer</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="CASH">Cash</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentId">Payment ID / Reference</Label>
            <Input id="paymentId" name="paymentId" placeholder="Optional reference" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="memo">Memo</Label>
            <Textarea id="memo" name="memo" rows={2} placeholder="Optional notes" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Saving...' : 'Record'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

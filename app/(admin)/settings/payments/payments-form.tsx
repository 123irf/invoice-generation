'use client';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { savePaymentSettings } from './actions';

export function PaymentsForm({ settings }: { settings: any }) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState({
    currencySymbol: settings.currencySymbol,
    currencyPosition: settings.currencyPosition,
    thousandSeparator: settings.thousandSeparator,
    decimalSeparator: settings.decimalSeparator,
    numberOfDecimals: settings.numberOfDecimals,
    paymentPageFooter: settings.paymentPageFooter,
    bankDetails: settings.bankDetails ?? '',
    genericPayment: settings.genericPayment,
  });

  function update(key: string, value: any) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit() {
    const fd = new FormData();
    Object.entries(state).forEach(([k, v]) => fd.set(k, String(v)));
    startTransition(async () => {
      const r = await savePaymentSettings(fd);
      if (r.ok) toast.success('Payment settings saved');
    });
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Currency Symbol</Label>
          <Input value={state.currencySymbol} onChange={(e) => update('currencySymbol', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Currency Position</Label>
          <Select value={state.currencyPosition} onValueChange={(v) => update('currencyPosition', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left ({state.currencySymbol}100.00)</SelectItem>
              <SelectItem value="left_space">Left with space ({state.currencySymbol} 100.00)</SelectItem>
              <SelectItem value="right">Right (100.00{state.currencySymbol})</SelectItem>
              <SelectItem value="right_space">Right with space (100.00 {state.currencySymbol})</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Thousand Separator</Label>
          <Input value={state.thousandSeparator} onChange={(e) => update('thousandSeparator', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Decimal Separator</Label>
          <Input value={state.decimalSeparator} onChange={(e) => update('decimalSeparator', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Number of Decimals</Label>
          <Input
            type="number"
            value={state.numberOfDecimals}
            onChange={(e) => update('numberOfDecimals', parseInt(e.target.value) || 0)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Payment Page Footer</Label>
        <Textarea
          value={state.paymentPageFooter}
          onChange={(e) => update('paymentPageFooter', e.target.value)}
          rows={3}
        />
        <p className="text-xs text-slate-500">HTML allowed.</p>
      </div>

      <div className="space-y-2">
        <Label>Bank Details</Label>
        <Textarea
          value={state.bankDetails}
          onChange={(e) => update('bankDetails', e.target.value)}
          rows={4}
        />
        <p className="text-xs text-slate-500">Bank account details for manual payment. HTML allowed.</p>
      </div>

      <div className="space-y-2">
        <Label>Generic Payment Info</Label>
        <Textarea
          value={state.genericPayment}
          onChange={(e) => update('genericPayment', e.target.value)}
          rows={4}
        />
        <p className="text-xs text-slate-500">Generic payment instructions shown to clients. HTML allowed.</p>
      </div>

      <Button type="submit" disabled={pending}>{pending ? 'Saving...' : 'Save'}</Button>
    </form>
  );
}

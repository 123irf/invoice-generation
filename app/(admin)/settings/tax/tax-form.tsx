'use client';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { saveTaxSettings } from './actions';

export function TaxForm({ settings }: { settings: any }) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState({
    pricesEnteredWithTax: settings.pricesEnteredWithTax,
    taxPercentage: settings.taxPercentage,
    taxName: settings.taxName,
  });

  function update(key: string, value: any) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit() {
    const fd = new FormData();
    Object.entries(state).forEach(([k, v]) => fd.set(k, String(v)));
    startTransition(async () => {
      const r = await saveTaxSettings(fd);
      if (r.ok) toast.success('Tax settings saved');
    });
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <div className="space-y-3">
        <Label>Prices Entered With Tax</Label>
        <RadioGroup
          value={state.pricesEnteredWithTax}
          onValueChange={(v) => update('pricesEnteredWithTax', v)}
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="inclusive" id="tax-inclusive" />
            <Label htmlFor="tax-inclusive" className="font-normal">
              Yes, I will enter prices inclusive of tax
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="exclusive" id="tax-exclusive" />
            <Label htmlFor="tax-exclusive" className="font-normal">
              No, I will enter prices exclusive of tax
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tax Percentage (%)</Label>
          <Input
            type="number"
            step="0.01"
            value={state.taxPercentage}
            onChange={(e) => update('taxPercentage', parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-2">
          <Label>Tax Name</Label>
          <Input value={state.taxName} onChange={(e) => update('taxName', e.target.value)} />
          <p className="text-xs text-slate-500">e.g. GST (18%), VAT, Sales Tax</p>
        </div>
      </div>

      <Button type="submit" disabled={pending}>{pending ? 'Saving...' : 'Save'}</Button>
    </form>
  );
}

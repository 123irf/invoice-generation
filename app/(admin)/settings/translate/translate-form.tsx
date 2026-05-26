'use client';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveTranslateSettings } from './actions';

const fields = [
  { key: 'quoteLabel', label: 'Quote' },
  { key: 'quoteLabelPlural', label: 'Quotes (Plural)' },
  { key: 'invoiceLabel', label: 'Invoice' },
  { key: 'invoiceLabelPlural', label: 'Invoices (Plural)' },
  { key: 'hrsQtyLabel', label: 'Hrs/Qty' },
  { key: 'serviceLabel', label: 'Service' },
  { key: 'ratePriceLabel', label: 'Rate/Price' },
  { key: 'adjustLabel', label: 'Adjust' },
  { key: 'subTotalLabel', label: 'Sub Total' },
  { key: 'discountLabel', label: 'Discount' },
  { key: 'totalLabel', label: 'Total' },
  { key: 'totalDueLabel', label: 'Total Due' },
];

export function TranslateForm({ settings }: { settings: any }) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState(() => {
    const initial: Record<string, string> = {};
    fields.forEach((f) => {
      initial[f.key] = settings[f.key] ?? '';
    });
    return initial;
  });

  function update(key: string, value: string) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit() {
    const fd = new FormData();
    Object.entries(state).forEach(([k, v]) => fd.set(k, v));
    startTransition(async () => {
      const r = await saveTranslateSettings(fd);
      if (r.ok) toast.success('Translate settings saved');
    });
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <div className="bg-blue-50 border border-blue-200 text-sm text-blue-900 rounded p-3">
        Customize the labels used throughout quotes and invoices. Useful for localization.
      </div>

      <div className="grid grid-cols-2 gap-4">
        {fields.map((f) => (
          <div key={f.key} className="space-y-2">
            <Label>{f.label}</Label>
            <Input value={state[f.key]} onChange={(e) => update(f.key, e.target.value)} />
          </div>
        ))}
      </div>

      <Button type="submit" disabled={pending}>{pending ? 'Saving...' : 'Save'}</Button>
    </form>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { saveGeneralSettings } from './actions';

const monthOptions = Array.from({ length: 12 }, (_, i) => {
  const month = String(i + 1).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return { value: `${month}-01`, label: `01 ${monthNames[i]}` };
});

const endMonthOptions = Array.from({ length: 12 }, (_, i) => {
  const month = String(i + 1).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const lastDay = new Date(2024, i + 1, 0).getDate();
  return { value: `${month}-${String(lastDay).padStart(2, '0')}`, label: `${lastDay} ${monthNames[i]}` };
});

export function GeneralForm(props: {
  fiscalYearStart: string;
  fiscalYearEnd: string;
  predefinedLineItemsText: string;
}) {
  const [pending, startTransition] = useTransition();
  const [start, setStart] = useState(props.fiscalYearStart);
  const [end, setEnd] = useState(props.fiscalYearEnd);
  const [items, setItems] = useState(props.predefinedLineItemsText);

  function onSubmit(formData: FormData) {
    formData.set('fiscalYearStart', start);
    formData.set('fiscalYearEnd', end);
    formData.set('predefinedLineItemsText', items);
    startTransition(async () => {
      const r = await saveGeneralSettings(formData);
      if (r.ok) toast.success('Settings saved');
      else toast.error('Failed to save');
    });
  }

  return (
    <form action={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label>Year Start</Label>
        <Select value={start} onValueChange={(v) => { if (v) setStart(v); }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {monthOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-slate-500">The start date of the fiscal year</p>
      </div>

      <div className="space-y-2">
        <Label>Year End</Label>
        <Select value={end} onValueChange={(v) => { if (v) setEnd(v); }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {endMonthOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-slate-500">The end date of the fiscal year</p>
      </div>

      <div className="space-y-2">
        <Label>Pre-Defined Line Items</Label>
        <Textarea
          value={items}
          onChange={(e) => setItems(e.target.value)}
          rows={8}
          className="font-mono text-xs"
        />
        <p className="text-xs text-slate-500">
          Add 1 line item per line in this format: <code>Qty | Title | Price | Description</code>.
          Each field separated with a | symbol. Price should be numbers only, no currency symbol.
          If you prefer to have an item blank, you still need the | symbol like so: 1 | Web Design | | Designing the web
        </p>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving...' : 'Save'}
      </Button>
    </form>
  );
}

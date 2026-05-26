'use client';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { saveInvoiceSettings } from './actions';

export function InvoicesForm({ settings }: { settings: any }) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState({
    prefix: settings.prefix,
    suffix: settings.suffix,
    autoIncrement: settings.autoIncrement,
    nextNumber: settings.nextNumber,
    dueDateDays: settings.dueDateDays,
    defaultTerms: settings.defaultTerms,
    defaultFooter: settings.defaultFooter,
    notifyOnInvoicePaid: settings.notifyOnInvoicePaid,
  });

  function update(key: string, value: any) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit() {
    const fd = new FormData();
    Object.entries(state).forEach(([k, v]) => fd.set(k, String(v)));
    startTransition(async () => {
      const r = await saveInvoiceSettings(fd);
      if (r.ok) toast.success('Invoice settings saved');
    });
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Prefix</Label>
          <Input value={state.prefix} onChange={(e) => update('prefix', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Suffix</Label>
          <Input value={state.suffix} onChange={(e) => update('suffix', e.target.value)} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="autoIncrement"
          checked={state.autoIncrement}
          onCheckedChange={(v) => update('autoIncrement', !!v)}
        />
        <Label htmlFor="autoIncrement">Auto Increment Number</Label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Next Number</Label>
          <Input value={state.nextNumber} onChange={(e) => update('nextNumber', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Due Date (days)</Label>
          <Input
            type="number"
            value={state.dueDateDays}
            onChange={(e) => update('dueDateDays', parseInt(e.target.value) || 0)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Default Terms</Label>
        <Textarea
          value={state.defaultTerms}
          onChange={(e) => update('defaultTerms', e.target.value)}
          rows={4}
        />
        <p className="text-xs text-slate-500">HTML allowed.</p>
      </div>

      <div className="space-y-2">
        <Label>Default Footer</Label>
        <Textarea
          value={state.defaultFooter}
          onChange={(e) => update('defaultFooter', e.target.value)}
          rows={3}
        />
        <p className="text-xs text-slate-500">HTML allowed.</p>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="notifyOnInvoicePaid"
          checked={state.notifyOnInvoicePaid}
          onCheckedChange={(v) => update('notifyOnInvoicePaid', !!v)}
        />
        <Label htmlFor="notifyOnInvoicePaid">Notify me when an invoice is paid</Label>
      </div>

      <Button type="submit" disabled={pending}>{pending ? 'Saving...' : 'Save'}</Button>
    </form>
  );
}

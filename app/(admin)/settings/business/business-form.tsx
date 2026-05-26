'use client';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { saveBusinessSettings } from './actions';

export function BusinessForm({ settings }: { settings: any }) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState({
    logoUrl: settings.logoUrl ?? '',
    name: settings.name,
    address: settings.address,
    extraInfo: settings.extraInfo,
    website: settings.website,
  });

  function onSubmit() {
    const fd = new FormData();
    Object.entries(state).forEach(([k, v]) => fd.set(k, v as string));
    startTransition(async () => {
      const r = await saveBusinessSettings(fd);
      if (r.ok) toast.success('Business settings saved');
    });
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <div className="bg-blue-50 border border-blue-200 text-sm text-blue-900 rounded p-3">
        All of the Business Details below will be displayed on the Quotes &amp; Invoices.
      </div>

      <div className="space-y-2">
        <Label>Logo URL</Label>
        <Input
          value={state.logoUrl}
          onChange={(e) => setState({ ...state, logoUrl: e.target.value })}
          placeholder="https://..."
        />
        <p className="text-xs text-slate-500">Logo of your business. If no logo is added, the name of your business will be used instead.</p>
        {state.logoUrl && <img src={state.logoUrl} alt="Logo preview" className="h-16 mt-2 border rounded" />}
      </div>

      <div className="space-y-2">
        <Label>Business Name</Label>
        <Input value={state.name} onChange={(e) => setState({ ...state, name: e.target.value })} />
      </div>

      <div className="space-y-2">
        <Label>Address</Label>
        <Textarea
          value={state.address}
          onChange={(e) => setState({ ...state, address: e.target.value })}
          rows={5}
        />
        <p className="text-xs text-slate-500">Add your full address and format it anyway you like. Basic HTML is allowed.</p>
      </div>

      <div className="space-y-2">
        <Label>Extra Business Info</Label>
        <Textarea
          value={state.extraInfo}
          onChange={(e) => setState({ ...state, extraInfo: e.target.value })}
          rows={4}
        />
        <p className="text-xs text-slate-500">Extra business info such as Business Number, phone or email. HTML allowed. Add your GST/VAT/ABN here.</p>
      </div>

      <div className="space-y-2">
        <Label>Website</Label>
        <Input value={state.website} onChange={(e) => setState({ ...state, website: e.target.value })} />
      </div>

      <Button type="submit" disabled={pending}>{pending ? 'Saving...' : 'Save'}</Button>
    </form>
  );
}

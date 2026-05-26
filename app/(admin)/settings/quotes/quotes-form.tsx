'use client';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { saveQuoteSettings } from './actions';

export function QuotesForm({ settings }: { settings: any }) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState({
    prefix: settings.prefix,
    suffix: settings.suffix,
    autoIncrement: settings.autoIncrement,
    nextNumber: settings.nextNumber,
    validForDays: settings.validForDays,
    defaultTerms: settings.defaultTerms,
    defaultFooter: settings.defaultFooter,
    showAcceptButton: settings.showAcceptButton,
    acceptedQuoteAction: settings.acceptedQuoteAction,
    acceptQuoteText: settings.acceptQuoteText,
    acceptedQuoteMessage: settings.acceptedQuoteMessage,
    declineReasonRequired: settings.declineReasonRequired,
    declinedQuoteMessage: settings.declinedQuoteMessage,
    notifyOnAccept: settings.notifyOnAccept,
  });

  function update(key: string, value: any) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit() {
    const fd = new FormData();
    Object.entries(state).forEach(([k, v]) => fd.set(k, String(v)));
    startTransition(async () => {
      const r = await saveQuoteSettings(fd);
      if (r.ok) toast.success('Quote settings saved');
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
          <Label>Valid For (days)</Label>
          <Input
            type="number"
            value={state.validForDays}
            onChange={(e) => update('validForDays', parseInt(e.target.value) || 0)}
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
          id="showAcceptButton"
          checked={state.showAcceptButton}
          onCheckedChange={(v) => update('showAcceptButton', !!v)}
        />
        <Label htmlFor="showAcceptButton">Show Accept/Decline buttons on quote</Label>
      </div>

      <div className="space-y-2">
        <Label>Accepted Quote Action</Label>
        <Select value={state.acceptedQuoteAction} onValueChange={(v) => update('acceptedQuoteAction', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="convert_and_send">Convert Quote to Invoice and send to client</SelectItem>
            <SelectItem value="convert_only">Convert Quote to Invoice only</SelectItem>
            <SelectItem value="mark_accepted">Mark as Accepted only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Accept Quote Text</Label>
        <Textarea
          value={state.acceptQuoteText}
          onChange={(e) => update('acceptQuoteText', e.target.value)}
          rows={3}
        />
        <p className="text-xs text-slate-500">Text shown to client before they accept.</p>
      </div>

      <div className="space-y-2">
        <Label>Accepted Quote Message</Label>
        <Textarea
          value={state.acceptedQuoteMessage}
          onChange={(e) => update('acceptedQuoteMessage', e.target.value)}
          rows={3}
        />
        <p className="text-xs text-slate-500">Message shown after a quote is accepted.</p>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="declineReasonRequired"
          checked={state.declineReasonRequired}
          onCheckedChange={(v) => update('declineReasonRequired', !!v)}
        />
        <Label htmlFor="declineReasonRequired">Require reason when declining</Label>
      </div>

      <div className="space-y-2">
        <Label>Declined Quote Message</Label>
        <Textarea
          value={state.declinedQuoteMessage}
          onChange={(e) => update('declinedQuoteMessage', e.target.value)}
          rows={3}
        />
        <p className="text-xs text-slate-500">Message shown after a quote is declined.</p>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="notifyOnAccept"
          checked={state.notifyOnAccept}
          onCheckedChange={(v) => update('notifyOnAccept', !!v)}
        />
        <Label htmlFor="notifyOnAccept">Notify me when a quote is accepted</Label>
      </div>

      <Button type="submit" disabled={pending}>{pending ? 'Saving...' : 'Save'}</Button>
    </form>
  );
}

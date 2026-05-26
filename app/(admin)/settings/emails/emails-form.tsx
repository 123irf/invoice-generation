'use client';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { saveEmailSettings } from './actions';

const wildcards = [
  { key: '%number%', desc: 'Quote or Invoice number' },
  { key: '%client_first_name%', desc: "Client's first name" },
  { key: '%client_last_name%', desc: "Client's last name" },
  { key: '%client_business_name%', desc: "Client's business name" },
  { key: '%total%', desc: 'Total amount' },
  { key: '%due_date%', desc: 'Due date' },
  { key: '%link%', desc: 'Public link to the document' },
  { key: '%last_payment%', desc: 'Last payment amount' },
  { key: '%is_was%', desc: '"is" or "was" depending on due date' },
];

export function EmailsForm({ settings }: { settings: any }) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState({ ...settings });

  function update(key: string, value: any) {
    setState((prev: any) => ({ ...prev, [key]: value }));
  }

  function onSubmit() {
    const fd = new FormData();
    Object.entries(state).forEach(([k, v]) => {
      if (k === 'id' || k === 'updatedAt') return;
      fd.set(k, String(v));
    });
    startTransition(async () => {
      const r = await saveEmailSettings(fd);
      if (r.ok) toast.success('Email settings saved');
    });
  }

  return (
    <div className="flex gap-8">
      <form action={onSubmit} className="space-y-8 flex-1">
        {/* Sender Settings */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">Sender Settings</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input value={state.emailAddress} onChange={(e) => update('emailAddress', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email Name</Label>
              <Input value={state.emailName} onChange={(e) => update('emailName', e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="bccOnClientEmails"
              checked={state.bccOnClientEmails}
              onCheckedChange={(v) => update('bccOnClientEmails', !!v)}
            />
            <Label htmlFor="bccOnClientEmails">BCC me on all client emails</Label>
          </div>
          <div className="space-y-2">
            <Label>Footer Text</Label>
            <Input value={state.footerText} onChange={(e) => update('footerText', e.target.value)} />
          </div>
        </section>

        {/* Quote Available Email */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">Quote Available Email</h2>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input value={state.quoteAvailableSubject} onChange={(e) => update('quoteAvailableSubject', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Content</Label>
            <Textarea
              value={state.quoteAvailableContent}
              onChange={(e) => update('quoteAvailableContent', e.target.value)}
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label>Button Text</Label>
            <Input value={state.quoteAvailableButton} onChange={(e) => update('quoteAvailableButton', e.target.value)} />
          </div>
        </section>

        {/* Invoice Available Email */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">Invoice Available Email</h2>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input value={state.invoiceAvailableSubject} onChange={(e) => update('invoiceAvailableSubject', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Content</Label>
            <Textarea
              value={state.invoiceAvailableContent}
              onChange={(e) => update('invoiceAvailableContent', e.target.value)}
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label>Button Text</Label>
            <Input value={state.invoiceAvailableButton} onChange={(e) => update('invoiceAvailableButton', e.target.value)} />
          </div>
        </section>

        {/* Payment Received Email */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">Payment Received Email</h2>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input value={state.paymentReceivedSubject} onChange={(e) => update('paymentReceivedSubject', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Content</Label>
            <Textarea
              value={state.paymentReceivedContent}
              onChange={(e) => update('paymentReceivedContent', e.target.value)}
              rows={4}
            />
          </div>
        </section>

        {/* Payment Reminder Email */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">Payment Reminder Email</h2>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input value={state.paymentReminderSubject} onChange={(e) => update('paymentReminderSubject', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Content</Label>
            <Textarea
              value={state.paymentReminderContent}
              onChange={(e) => update('paymentReminderContent', e.target.value)}
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label>Button Text</Label>
            <Input value={state.paymentReminderButton} onChange={(e) => update('paymentReminderButton', e.target.value)} />
          </div>
        </section>

        {/* Reminder Schedule */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">Automatic Reminders</h2>
          <p className="text-sm text-slate-600">Select when to automatically send payment reminder emails.</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'reminder7DaysBefore', label: '7 days before due date' },
              { key: 'reminder1DayBefore', label: '1 day before due date' },
              { key: 'reminderOnDueDate', label: 'On due date' },
              { key: 'reminder1DayAfter', label: '1 day after due date' },
              { key: 'reminder7DaysAfter', label: '7 days after due date' },
              { key: 'reminder14DaysAfter', label: '14 days after due date' },
              { key: 'reminder21DaysAfter', label: '21 days after due date' },
              { key: 'reminder30DaysAfter', label: '30 days after due date' },
            ].map((r) => (
              <div key={r.key} className="flex items-center gap-2">
                <Checkbox
                  id={r.key}
                  checked={state[r.key]}
                  onCheckedChange={(v) => update(r.key, !!v)}
                />
                <Label htmlFor={r.key} className="font-normal">{r.label}</Label>
              </div>
            ))}
          </div>
        </section>

        <Button type="submit" disabled={pending}>{pending ? 'Saving...' : 'Save'}</Button>
      </form>

      {/* Wildcards Reference Panel */}
      <aside className="w-64 shrink-0">
        <div className="sticky top-6 rounded border border-slate-200 bg-slate-50 p-4">
          <h3 className="font-semibold text-sm text-slate-900 mb-3">Available Wildcards</h3>
          <ul className="space-y-2">
            {wildcards.map((w) => (
              <li key={w.key} className="text-xs">
                <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">{w.key}</code>
                <span className="block text-slate-500 mt-0.5">{w.desc}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}

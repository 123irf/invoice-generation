# Step 3 — Settings (All 8 Tabs)

## Goal

Build the complete `/settings` page with 8 tabs: General, Business, Quotes, Invoices,
Payments, Tax, Emails, Translate. Each tab is a server component for read + a client form
for write, backed by a Server Action.

After this step, the admin can configure every aspect of the app from one page.

## Prerequisites

- Step 2 complete (Clerk auth working, admin layout up)

## Architecture

- All 8 settings are singleton tables (already seeded in Step 1)
- Each tab is its own URL: `/settings/general`, `/settings/business`, etc.
- `/settings` redirects to `/settings/general`
- Tab nav is a shared component across all 8 pages
- One Server Action per settings table

## Steps

### 1. Build helpers

`lib/settings.ts`:

```ts
import { prisma } from './prisma';

// Each of these getters returns the singleton row, creating it if missing.

export async function getBusinessSettings() {
  let s = await prisma.businessSettings.findFirst();
  if (!s) s = await prisma.businessSettings.create({ data: {} });
  return s;
}

export async function getQuoteSettings() {
  let s = await prisma.quoteSettings.findFirst();
  if (!s) s = await prisma.quoteSettings.create({ data: {} });
  return s;
}

export async function getInvoiceSettings() {
  let s = await prisma.invoiceSettings.findFirst();
  if (!s) s = await prisma.invoiceSettings.create({ data: {} });
  return s;
}

export async function getPaymentSettings() {
  let s = await prisma.paymentSettings.findFirst();
  if (!s) s = await prisma.paymentSettings.create({ data: {} });
  return s;
}

export async function getTaxSettings() {
  let s = await prisma.taxSettings.findFirst();
  if (!s) s = await prisma.taxSettings.create({ data: {} });
  return s;
}

export async function getEmailSettings() {
  let s = await prisma.emailSettings.findFirst();
  if (!s) s = await prisma.emailSettings.create({ data: {} });
  return s;
}

export async function getTranslateSettings() {
  let s = await prisma.translateSettings.findFirst();
  if (!s) s = await prisma.translateSettings.create({ data: {} });
  return s;
}
```

`lib/sanitize.ts`:

```ts
import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = ['br', 'b', 'strong', 'i', 'em', 'a', 'p', 'span', 'ul', 'ol', 'li'];
const ALLOWED_ATTR = ['href', 'target', 'rel'];

export function sanitizeHTML(html: string | null | undefined): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
}

export function sanitizeAndPreserveNewlines(text: string | null | undefined): string {
  if (!text) return '';
  return sanitizeHTML(text.replace(/\n/g, '<br>'));
}
```

### 2. Build the tab navigation

`components/admin/settings-tabs.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/settings/general', label: 'General' },
  { href: '/settings/business', label: 'Business' },
  { href: '/settings/quotes', label: 'Quotes' },
  { href: '/settings/invoices', label: 'Invoices' },
  { href: '/settings/payments', label: 'Payments' },
  { href: '/settings/tax', label: 'Tax' },
  { href: '/settings/emails', label: 'Emails' },
  { href: '/settings/translate', label: 'Translate' },
];

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <nav className="border-b border-slate-200 mb-6">
      <div className="flex gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                active
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

### 3. Update `/settings` redirect

Replace `app/(admin)/settings/page.tsx`:

```tsx
import { redirect } from 'next/navigation';
export default function SettingsIndex() {
  redirect('/settings/general');
}
```

### 4. Create settings layout

`app/(admin)/settings/layout.tsx`:

```tsx
import { SettingsTabs } from '@/components/admin/settings-tabs';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Settings</h1>
      <SettingsTabs />
      <div className="max-w-3xl">{children}</div>
    </div>
  );
}
```

### 5. Build each tab page + form + action

Pattern is the same for all 8. Below shows General + Business in full; apply the same
pattern to the remaining 6.

#### 5.1 General Tab

`app/(admin)/settings/general/actions.ts`:

```ts
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { writeAudit } from '@/lib/audit';
import { getAdminEmail } from '@/lib/auth';

const monthDay = /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;

const schema = z.object({
  fiscalYearStart: z.string().regex(monthDay),
  fiscalYearEnd: z.string().regex(monthDay),
  predefinedLineItemsText: z.string(),
});

export async function saveGeneralSettings(formData: FormData) {
  const raw = {
    fiscalYearStart: formData.get('fiscalYearStart') as string,
    fiscalYearEnd: formData.get('fiscalYearEnd') as string,
    predefinedLineItemsText: formData.get('predefinedLineItemsText') as string,
  };
  const data = schema.parse(raw);

  // Update business settings (fiscal year)
  const business = await prisma.businessSettings.findFirst();
  await prisma.businessSettings.update({
    where: { id: business!.id },
    data: {
      fiscalYearStart: data.fiscalYearStart,
      fiscalYearEnd: data.fiscalYearEnd,
    },
  });

  // Parse pre-defined line items from textarea
  const lines = data.predefinedLineItemsText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const items = lines
    .map((line, index) => {
      const parts = line.split('|').map((p) => p.trim());
      if (parts.length < 3) return null;
      const [qty, title, rate, description] = parts;
      return {
        qty: parseInt(qty, 10) || 1,
        title: title || '',
        rate: parseFloat(rate) || 0,
        description: description || null,
        order: index,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  await prisma.$transaction([
    prisma.predefinedLineItem.deleteMany(),
    prisma.predefinedLineItem.createMany({ data: items }),
  ]);

  await writeAudit({
    actor: await getAdminEmail(),
    action: 'SETTINGS_UPDATED',
    targetType: 'SETTINGS',
    metadata: { section: 'general', itemCount: items.length },
  });

  revalidatePath('/settings/general');
  return { ok: true };
}
```

`app/(admin)/settings/general/page.tsx`:

```tsx
import { getBusinessSettings } from '@/lib/settings';
import { prisma } from '@/lib/prisma';
import { GeneralForm } from './general-form';

export default async function GeneralSettingsPage() {
  const business = await getBusinessSettings();
  const items = await prisma.predefinedLineItem.findMany({
    orderBy: { order: 'asc' },
  });

  const itemsText = items
    .map((i) => `${i.qty} | ${i.title} | ${i.rate} | ${i.description ?? ''}`)
    .join('\n');

  return (
    <GeneralForm
      fiscalYearStart={business.fiscalYearStart}
      fiscalYearEnd={business.fiscalYearEnd}
      predefinedLineItemsText={itemsText}
    />
  );
}
```

`app/(admin)/settings/general/general-form.tsx`:

```tsx
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
        <Select value={start} onValueChange={setStart}>
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
        <Select value={end} onValueChange={setEnd}>
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
```

#### 5.2 Business Tab

`app/(admin)/settings/business/actions.ts`:

```ts
'use server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { writeAudit } from '@/lib/audit';
import { getAdminEmail } from '@/lib/auth';

const schema = z.object({
  logoUrl: z.string().url().or(z.literal('')).optional(),
  name: z.string().min(1),
  address: z.string(),
  extraInfo: z.string(),
  website: z.string().url().or(z.literal('')).optional(),
});

export async function saveBusinessSettings(formData: FormData) {
  const data = schema.parse({
    logoUrl: formData.get('logoUrl') || '',
    name: formData.get('name'),
    address: formData.get('address'),
    extraInfo: formData.get('extraInfo'),
    website: formData.get('website') || '',
  });

  const existing = await prisma.businessSettings.findFirst();
  await prisma.businessSettings.update({
    where: { id: existing!.id },
    data: {
      logoUrl: data.logoUrl || null,
      name: data.name,
      address: data.address,
      extraInfo: data.extraInfo,
      website: data.website || '',
    },
  });

  await writeAudit({
    actor: await getAdminEmail(),
    action: 'SETTINGS_UPDATED',
    targetType: 'SETTINGS',
    metadata: { section: 'business' },
  });

  revalidatePath('/settings/business');
  return { ok: true };
}
```

`app/(admin)/settings/business/page.tsx`:

```tsx
import { getBusinessSettings } from '@/lib/settings';
import { BusinessForm } from './business-form';

export default async function BusinessSettingsPage() {
  const s = await getBusinessSettings();
  return <BusinessForm settings={s} />;
}
```

`app/(admin)/settings/business/business-form.tsx`:

```tsx
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
    Object.entries(state).forEach(([k, v]) => fd.set(k, v));
    startTransition(async () => {
      const r = await saveBusinessSettings(fd);
      if (r.ok) toast.success('Business settings saved');
    });
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <div className="bg-blue-50 border border-blue-200 text-sm text-blue-900 rounded p-3">
        All of the Business Details below will be displayed on the Quotes & Invoices.
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
```

### 5.3 — 5.8 Remaining Tabs

Apply the **same pattern** (page + form + action) to the remaining 6 tabs. Below are the
field maps; the implementation mirrors Business above.

#### Quotes (`/settings/quotes`)
Fields from QuoteSettings: `prefix, suffix, autoIncrement, nextNumber, validForDays,
defaultTerms, defaultFooter, showAcceptButton, acceptedQuoteAction, acceptQuoteText,
acceptedQuoteMessage, declineReasonRequired, declinedQuoteMessage, notifyOnAccept`.

`acceptedQuoteAction` is a Select with options:
- `convert_and_send` → "Convert Quote to Invoice and send to client"
- `convert_only` → "Convert Quote to Invoice only"
- `mark_accepted` → "Mark as Accepted only"

#### Invoices (`/settings/invoices`)
Fields from InvoiceSettings: `prefix, suffix, autoIncrement, nextNumber, dueDateDays,
defaultTerms, defaultFooter, notifyOnInvoicePaid`.

#### Payments (`/settings/payments`)
Fields from PaymentSettings: `currencySymbol, currencyPosition (select),
thousandSeparator, decimalSeparator, numberOfDecimals, paymentPageFooter, bankDetails,
genericPayment`.

`currencyPosition` Select options:
- `left` → "Left (₹100.00)"
- `left_space` → "Left with space (₹ 100.00)"
- `right` → "Right (100.00₹)"
- `right_space` → "Right with space (100.00 ₹)"

#### Tax (`/settings/tax`)
Fields from TaxSettings: `pricesEnteredWithTax (radio: inclusive | exclusive),
taxPercentage, taxName`.

#### Emails (`/settings/emails`)
Fields from EmailSettings: all 4 template subjects+content+button, the 8 reminder
checkboxes, sender fields, BCC, footer. Long form — split into visual sections with
headers. Show wildcards reference panel on the right side (read-only `<aside>` with the
list of supported wildcards from `lib/wildcards.ts` — Step 10).

#### Translate (`/settings/translate`)
Fields from TranslateSettings: 12 text inputs.

For each: page reads from `getXxxSettings()`, passes to form. Form has local state and
calls action on submit. Action validates with Zod, updates row, writes audit, revalidates.

## Verification Checklist

- [ ] All 8 tabs visible at `/settings/general` through `/settings/translate`
- [ ] Each tab loads default values from the seeded settings
- [ ] Saving each tab persists changes (refresh page to verify)
- [ ] Toast appears on successful save
- [ ] Predefined line items textarea round-trips correctly (save, reload, same content)
- [ ] Active tab is highlighted in the tab nav
- [ ] AuditLog table gets a new row each time you save (check `npx prisma studio`)
- [ ] `npx tsc --noEmit` passes

## Commit

```bash
git add -A
git commit -m "step-3: complete settings module — 8 tabs with forms and server actions"
```

## Next

Proceed to `04-CLIENTS.md`.

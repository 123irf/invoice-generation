# Step 10 — Email Integration (Resend + Wildcards)

## Goal

Wire up Resend to actually send the emails that were stubbed in Steps 5 and 7. Build a
wildcard rendering engine, a base email template using React Email, and three transactional
templates (quote available, invoice available, payment received). Add a manual "Send
Reminder Now" button on the invoice view.

## Prerequisites

- Steps 0–9 complete
- Resend account, API key in `.env.local` as `RESEND_API_KEY`
- A verified sender domain in Resend (for production), or use Resend's `onboarding@resend.dev` for dev

## Steps

### 1. Wildcard Engine

`lib/wildcards.ts`:

```ts
interface WildcardContext {
  client?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string;
    businessName?: string;
  };
  number?: string;
  link?: string;
  total?: string;
  validUntil?: string;
  dueDate?: string;
  lastPayment?: string;
  totalPaid?: string;
  totalOwed?: string;
  isOverdue?: boolean;
}

export function renderWildcards(template: string, ctx: WildcardContext): string {
  if (!template) return '';
  return template.replace(/%(\w+)%/g, (match, key) => {
    switch (key) {
      case 'client_first_name': return ctx.client?.firstName ?? '';
      case 'client_last_name':  return ctx.client?.lastName ?? '';
      case 'client_email':      return ctx.client?.email ?? '';
      case 'client_business_name': return ctx.client?.businessName ?? '';
      case 'number':            return ctx.number ?? '';
      case 'link':              return ctx.link ?? '';
      case 'total':             return ctx.total ?? '';
      case 'valid_until':       return ctx.validUntil ?? '';
      case 'due_date':          return ctx.dueDate ?? '';
      case 'last_payment':      return ctx.lastPayment ?? '';
      case 'total_paid':        return ctx.totalPaid ?? '';
      case 'total_owed':        return ctx.totalOwed ?? '';
      case 'is_was':            return ctx.isOverdue ? 'was' : 'is';
      default:                  return match; // leave unknown wildcards untouched
    }
  });
}

export const SUPPORTED_WILDCARDS = [
  { tag: '%client_first_name%', desc: "Client's first name" },
  { tag: '%client_last_name%', desc: "Client's last name" },
  { tag: '%client_email%', desc: "Client's email" },
  { tag: '%client_business_name%', desc: "Client's business name" },
  { tag: '%number%', desc: 'Quote/invoice number' },
  { tag: '%link%', desc: 'Public link to the quote/invoice' },
  { tag: '%total%', desc: 'Total amount (formatted)' },
  { tag: '%valid_until%', desc: 'Quote valid-until date' },
  { tag: '%due_date%', desc: 'Invoice due date' },
  { tag: '%last_payment%', desc: 'Last payment amount' },
  { tag: '%total_paid%', desc: 'Amount paid' },
  { tag: '%total_owed%', desc: 'Amount still owed' },
  { tag: '%is_was%', desc: 'Resolves to "is" or "was" depending on due date' },
];
```

### 2. Base Email Template

We use plain HTML in the email body (no React Email package needed for MVP). Build a
wrapper that takes a subject + body + button URL + button text.

`emails/base-email.ts`:

```ts
import { sanitizeHTML } from '@/lib/sanitize';

interface EmailParams {
  greeting: string;
  bodyText: string;
  buttonText?: string;
  buttonUrl?: string;
  footerText: string;
  businessName: string;
}

export function renderEmailHtml({ greeting, bodyText, buttonText, buttonUrl, footerText, businessName }: EmailParams): string {
  const buttonHtml = buttonUrl && buttonText
    ? `
      <table cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
        <tr>
          <td bgcolor="#2C5282" style="border-radius: 4px;">
            <a href="${buttonUrl}" style="display: inline-block; padding: 12px 24px; color: #ffffff; text-decoration: none; font-weight: bold;">
              ${buttonText}
            </a>
          </td>
        </tr>
      </table>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #F7FAFC;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="padding: 32px 16px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background-color: #2C5282; padding: 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px;">${businessName}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="color: #1A202C; font-size: 16px; margin: 0 0 16px;">${greeting}</p>
              <div style="color: #1A202C; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${sanitizeHTML(bodyText)}</div>
              ${buttonHtml}
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px; background-color: #F7FAFC; border-top: 1px solid #E2E8F0; text-align: center; color: #718096; font-size: 12px;">
              ${sanitizeHTML(footerText)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
```

### 3. Resend Client + sendTemplatedEmail

`lib/email.ts`:

```ts
import { Resend } from 'resend';
import { prisma } from './prisma';
import { renderWildcards } from './wildcards';
import { renderEmailHtml } from '@/emails/base-email';
import {
  getEmailSettings,
  getBusinessSettings,
} from './settings';
import { formatCurrency, formatDate } from './currency';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

type TemplateKey =
  | 'quoteAvailable'
  | 'invoiceAvailable'
  | 'paymentReceived'
  | 'paymentReminder';

interface SendOptions {
  templateKey: TemplateKey;
  to: string;
  context: any; // wildcard context, depends on template
}

export async function sendTemplatedEmail({ templateKey, to, context }: SendOptions) {
  if (!resend) {
    console.warn('Resend not configured — skipping email send for', templateKey, 'to', to);
    return { ok: false, error: 'Resend not configured' };
  }

  const [emailSettings, business] = await Promise.all([
    getEmailSettings(),
    getBusinessSettings(),
  ]);

  // Pick the right template fields
  let subject = '';
  let content = '';
  let buttonText: string | undefined;
  switch (templateKey) {
    case 'quoteAvailable':
      subject = emailSettings.quoteAvailableSubject;
      content = emailSettings.quoteAvailableContent;
      buttonText = emailSettings.quoteAvailableButton;
      break;
    case 'invoiceAvailable':
      subject = emailSettings.invoiceAvailableSubject;
      content = emailSettings.invoiceAvailableContent;
      buttonText = emailSettings.invoiceAvailableButton;
      break;
    case 'paymentReceived':
      subject = emailSettings.paymentReceivedSubject;
      content = emailSettings.paymentReceivedContent;
      break;
    case 'paymentReminder':
      subject = emailSettings.paymentReminderSubject;
      content = emailSettings.paymentReminderContent;
      buttonText = emailSettings.paymentReminderButton;
      break;
  }

  const renderedSubject = renderWildcards(subject, context);
  const renderedContent = renderWildcards(content, context);
  const renderedButtonText = buttonText ? renderWildcards(buttonText, context) : undefined;

  const greeting = `Hi ${context.client?.firstName ?? context.client?.businessName ?? 'there'},`;

  const html = renderEmailHtml({
    greeting,
    bodyText: renderedContent,
    buttonText: renderedButtonText,
    buttonUrl: context.link,
    footerText: emailSettings.footerText,
    businessName: business.name,
  });

  const from = `${emailSettings.emailName} <${emailSettings.emailAddress}>`;
  const bcc = emailSettings.bccOnClientEmails ? emailSettings.emailAddress : undefined;

  try {
    const response = await resend.emails.send({
      from,
      to,
      bcc,
      subject: renderedSubject,
      html,
    });

    await prisma.emailLog.create({
      data: {
        templateKey,
        to,
        bcc,
        subject: renderedSubject,
        status: 'SENT',
        resendId: response.data?.id,
      },
    });

    return { ok: true, id: response.data?.id };
  } catch (e: any) {
    await prisma.emailLog.create({
      data: {
        templateKey,
        to,
        bcc,
        subject: renderedSubject,
        status: 'FAILED',
        errorMsg: e.message ?? String(e),
      },
    });
    return { ok: false, error: e.message };
  }
}

// Helpers to build context from DB objects

export function buildQuoteContext(quote: any, publicLink: string) {
  return {
    client: {
      firstName: quote.client.firstName,
      lastName: quote.client.lastName,
      email: quote.client.email,
      businessName: quote.client.businessName,
    },
    number: quote.number,
    link: publicLink,
    total: formatCurrency(quote.total),
    validUntil: formatDate(quote.validUntil),
  };
}

export function buildInvoiceContext(invoice: any, publicLink: string, lastPaymentAmount?: number) {
  const now = new Date();
  return {
    client: {
      firstName: invoice.client.firstName,
      lastName: invoice.client.lastName,
      email: invoice.client.email,
      businessName: invoice.client.businessName,
    },
    number: invoice.number,
    link: publicLink,
    total: formatCurrency(invoice.total),
    dueDate: formatDate(invoice.dueDate),
    totalPaid: formatCurrency(invoice.paid),
    totalOwed: formatCurrency(invoice.totalDue),
    lastPayment: lastPaymentAmount ? formatCurrency(lastPaymentAmount) : '',
    isOverdue: invoice.dueDate < now,
  };
}
```

### 4. Wire Real Email into Quote Send

Replace `sendQuoteEmail` in `app/(admin)/quotes/actions.ts`:

```ts
import { sendTemplatedEmail, buildQuoteContext } from '@/lib/email';

export async function sendQuoteEmail(id: string) {
  const quote = await prisma.quote.update({
    where: { id },
    data: { status: 'SENT' },
    include: { client: true },
  });

  const publicLink = `${process.env.NEXT_PUBLIC_APP_URL}/q/${quote.publicToken}`;
  const context = buildQuoteContext(quote, publicLink);

  await sendTemplatedEmail({
    templateKey: 'quoteAvailable',
    to: quote.client.email,
    context,
  });

  await writeAudit({
    actor: await getAdminEmail(),
    action: 'QUOTE_SENT',
    targetType: 'QUOTE',
    targetId: id,
    metadata: { to: quote.client.email },
  });

  revalidatePath(`/quotes/${id}`);
  return { ok: true, publicLink };
}
```

### 5. Wire Real Email into Invoice Send

Replace `sendInvoiceEmail` in `app/(admin)/invoices/actions.ts`:

```ts
import { sendTemplatedEmail, buildInvoiceContext } from '@/lib/email';

export async function sendInvoiceEmail(id: string) {
  const invoice = await prisma.invoice.update({
    where: { id },
    data: { status: 'SENT' },
    include: { client: true },
  });

  const publicLink = `${process.env.NEXT_PUBLIC_APP_URL}/i/${invoice.publicToken}`;
  const context = buildInvoiceContext(invoice, publicLink);

  await sendTemplatedEmail({
    templateKey: 'invoiceAvailable',
    to: invoice.client.email,
    context,
  });

  await writeAudit({
    actor: await getAdminEmail(),
    action: 'INVOICE_SENT',
    targetType: 'INVOICE',
    targetId: id,
    metadata: { to: invoice.client.email },
  });

  revalidatePath(`/invoices/${id}`);
  return { ok: true, publicLink };
}
```

### 6. Auto-Email on Quote Accept (Convert + Send)

In `app/(public)/q/[token]/actions.ts`, inside `acceptQuote`, after creating the invoice:

```ts
// At the bottom of acceptQuote, AFTER the transaction:
if (result.newInvoiceId && settings.acceptedQuoteAction === 'convert_and_send') {
  const newInvoice = await prisma.invoice.findUnique({
    where: { id: result.newInvoiceId },
    include: { client: true },
  });
  if (newInvoice) {
    const publicLink = `${process.env.NEXT_PUBLIC_APP_URL}/i/${newInvoice.publicToken}`;
    await sendTemplatedEmail({
      templateKey: 'invoiceAvailable',
      to: newInvoice.client.email,
      context: buildInvoiceContext(newInvoice, publicLink),
    });
  }
}
```

### 7. Manual "Send Reminder Now" Button

On the invoice view page (`app/(admin)/invoices/[id]/page.tsx`), add a button that calls:

```ts
'use server';
export async function sendReminderNow(id: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { client: true },
  });
  if (!invoice) return { ok: false };

  const publicLink = `${process.env.NEXT_PUBLIC_APP_URL}/i/${invoice.publicToken}`;
  const r = await sendTemplatedEmail({
    templateKey: 'paymentReminder',
    to: invoice.client.email,
    context: buildInvoiceContext(invoice, publicLink),
  });

  await writeAudit({
    actor: await getAdminEmail(),
    action: 'INVOICE_REMINDER_SENT',
    targetType: 'INVOICE',
    targetId: id,
  });

  return r;
}
```

Add the button in the invoice view's action group:

```tsx
<Button variant="outline" onClick={() => startTransition(() => sendReminderNow(invoice.id))}>
  Send Reminder Now
</Button>
```

### 8. Spec Deviation: Automated Reminder Cron

Document in README that the 8-tier reminder schedule from EmailSettings is NOT yet
automated. For v1.1, build a daily cron (Vercel Cron or `app/api/cron/reminders/route.ts`)
that runs through invoices and sends the right reminder template based on `dueDate` offset.
For MVP, the admin manually clicks "Send Reminder Now" when needed.

## Verification Checklist

- [ ] `RESEND_API_KEY` set in `.env.local`
- [ ] Click "Send" on a quote → email arrives in the client's inbox within seconds
- [ ] Wildcards in subject and body are correctly replaced
- [ ] BCC arrives at the configured admin email
- [ ] EmailLog table gets a SENT row
- [ ] Wrong API key produces an EmailLog row with status FAILED and the error
- [ ] Send Reminder Now button works on an invoice view
- [ ] Auto-conversion from public quote accept sends an invoice email
- [ ] Email HTML renders correctly in Gmail, Outlook, Apple Mail
- [ ] `npx tsc --noEmit` passes

## Commit

```bash
git add -A
git commit -m "step-10: Resend integration with wildcard engine and 3 transactional templates"
```

## Next

Proceed to `11-PAYMENTS.md`.

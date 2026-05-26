# Step 13 — Seed Data, README, and Deployment

## Goal

Populate the database with realistic seed data (clients, quotes, invoices, payments) for
the demo. Write a comprehensive README documenting setup, spec deviations, and architecture
decisions. Deploy to Vercel with Neon Postgres.

## Prerequisites

- Steps 0–12 complete and verified
- Vercel account
- Neon Postgres project (or alternative managed Postgres)
- Resend domain verified (or use `onboarding@resend.dev` for demo)
- Razorpay test keys

## Steps

### 1. Replace `prisma/seed.ts` with the full seed

```ts
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding...');

  // Singleton settings — only create if missing
  const existingBusiness = await prisma.businessSettings.findFirst();
  if (!existingBusiness) {
    await prisma.businessSettings.create({ data: {} });
    await prisma.quoteSettings.create({ data: {} });
    await prisma.invoiceSettings.create({ data: {} });
    await prisma.paymentSettings.create({ data: {} });
    await prisma.taxSettings.create({ data: {} });
    await prisma.emailSettings.create({ data: {} });
    await prisma.translateSettings.create({ data: {} });
    console.log('✓ Default settings created');
  }

  // Pre-defined line items
  if ((await prisma.predefinedLineItem.count()) === 0) {
    await prisma.predefinedLineItem.createMany({
      data: [
        { qty: 1, title: '.com/.in Domain Registration Charges per year', rate: 1600, description: 'Domain Registration Per Year', order: 0 },
        { qty: 1, title: 'Hosting Plan for 1 year', rate: 2500, description: 'Web Hosting Space for 1 year', order: 1 },
        { qty: 1, title: 'SSL Certificate for 1 Year', rate: 1200, description: 'SSL Certificate for 1 Year', order: 2 },
        { qty: 1, title: 'Website Design', rate: 25000, description: 'Custom website design and development', order: 3 },
      ],
    });
    console.log('✓ Predefined line items created');
  }

  // Demo clients — only seed if DB is otherwise empty (don't override real data)
  const clientCount = await prisma.client.count();
  if (clientCount > 0) {
    console.log(`✓ ${clientCount} clients already exist, skipping demo data`);
    return;
  }

  const clients = await Promise.all([
    prisma.client.create({
      data: {
        businessName: 'Sainbiz Solutions Pvt. Ltd.',
        firstName: 'Sankara',
        lastName: 'Vaka',
        email: 'sankara.vaka@sainbiz.com',
        phone: '+91 98765 43210',
        address: 'Hyderabad, Telangana, India',
        extraInfo: '<b>GST:</b> 36AABCS1234N1Z5',
        website: 'https://sainbiz.com',
      },
    }),
    prisma.client.create({
      data: {
        businessName: 'First Partner Consultancy',
        firstName: 'Admin',
        email: 'support@firstpartnerconsulting.com',
        phone: '+91 90000 11111',
        address: 'Bangalore, Karnataka, India',
      },
    }),
    prisma.client.create({
      data: {
        businessName: 'Infasta',
        firstName: 'Nagaraj',
        email: 'accounts@infasta.com',
        phone: '+91 99887 76655',
        address: 'Mumbai, Maharashtra, India',
      },
    }),
    prisma.client.create({
      data: {
        businessName: 'Goldenkey Chikki',
        firstName: 'Pranay',
        lastName: 'Raj',
        email: 'sales@goldenkey.in',
        phone: '+91 90909 80808',
        address: 'Chennai, Tamil Nadu, India',
      },
    }),
    prisma.client.create({
      data: {
        businessName: 'Sai Gayatri Curry Point',
        firstName: 'DRK',
        lastName: 'Chowdary',
        email: 'drkchowdary55@gmail.com',
        phone: '+91 98765 12345',
        address: 'Hyderabad, Telangana, India',
      },
    }),
    prisma.client.create({
      data: {
        businessName: 'PrepMode Education',
        firstName: 'Admin',
        email: 'admin@prepmode.in',
        phone: '+91 88888 77777',
        address: 'Hyderabad, Telangana, India',
      },
    }),
  ]);
  console.log(`✓ ${clients.length} demo clients created`);

  const today = new Date();
  const inDays = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return d;
  };

  // Seed quotes — AKEYQ-48 through AKEYQ-52
  const quoteLineItems = [
    { qty: 1, title: 'Website Design', rate: 25000, description: 'Responsive design with up to 8 pages', taxable: true, order: 0 },
    { qty: 1, title: '.com Domain Registration', rate: 1600, description: 'Annual registration', taxable: true, order: 1 },
    { qty: 1, title: 'Hosting Plan for 1 year', rate: 2500, description: 'Web hosting', taxable: true, order: 2 },
    { qty: 1, title: 'SSL Certificate', rate: 1200, description: '1 year SSL', taxable: true, order: 3 },
  ];
  const quoteSubtotal = quoteLineItems.reduce((s, li) => s + li.qty * li.rate, 0);
  const quoteTax = Math.round(quoteSubtotal * 0.18 * 100) / 100;
  const quoteTotal = quoteSubtotal + quoteTax;

  const quoteStatuses: Array<'DRAFT' | 'SENT' | 'ACCEPTED' | 'DECLINED' | 'CONVERTED'> = [
    'DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'CONVERTED',
  ];

  for (let i = 0; i < 5; i++) {
    const number = `AKEYQ-${48 + i}`;
    await prisma.quote.create({
      data: {
        number,
        clientId: clients[i % clients.length].id,
        title: `Website redesign — ${clients[i % clients.length].businessName}`,
        status: quoteStatuses[i],
        validUntil: inDays(15),
        createdDate: inDays(-(i * 3)),
        subtotal: quoteSubtotal,
        taxPercentage: 18,
        taxAmount: quoteTax,
        discount: 0,
        total: quoteTotal,
        terms: 'This is a fixed price quote. If accepted, we require a 60% deposit upfront.',
        footer: 'Thanks for choosing Ultrakey IT Solutions Private Limited.',
        lineItems: {
          create: quoteLineItems.map((li) => ({ ...li, parentType: 'QUOTE', amount: li.qty * li.rate })),
        },
      },
    });
  }
  console.log('✓ 5 demo quotes created');

  // Update QuoteSettings.nextNumber to 53
  await prisma.quoteSettings.updateMany({ data: { nextNumber: '53' } });

  // Seed invoices — AKEYI-0124 through AKEYI-0127 with mixed statuses
  const invStatuses: Array<{ status: 'DRAFT' | 'SENT' | 'PAID' | 'PARTIAL'; dueOffset: number; paid?: number }> = [
    { status: 'DRAFT', dueOffset: 14 },
    { status: 'SENT', dueOffset: -3 }, // past-due → OVERDUE
    { status: 'PARTIAL', dueOffset: 7, paid: 15000 },
    { status: 'PAID', dueOffset: -10, paid: quoteTotal },
  ];

  for (let i = 0; i < invStatuses.length; i++) {
    const cfg = invStatuses[i];
    const number = `AKEYI-${String(124 + i).padStart(4, '0')}`;
    const paid = cfg.paid ?? 0;
    const totalDue = Math.max(0, quoteTotal - paid);

    const invoice = await prisma.invoice.create({
      data: {
        number,
        clientId: clients[i % clients.length].id,
        title: `Project services — ${clients[i % clients.length].businessName}`,
        status: cfg.status,
        dueDate: inDays(cfg.dueOffset),
        createdDate: inDays(-Math.abs(cfg.dueOffset) - 14),
        subtotal: quoteSubtotal,
        taxPercentage: 18,
        taxAmount: quoteTax,
        discount: 0,
        paid,
        totalDue,
        total: quoteTotal,
        terms: 'Payment due within 14 days. Late payment subject to 5% per month fees.',
        footer: 'Thanks for choosing Ultrakey IT Solutions Private Limited.',
        lineItems: {
          create: quoteLineItems.map((li) => ({ ...li, parentType: 'INVOICE', amount: li.qty * li.rate })),
        },
      },
    });

    if (paid > 0) {
      await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          date: inDays(-3),
          amount: paid,
          method: 'BANK',
          paymentId: `SEED-PMT-${i}`,
          memo: 'Demo seed payment',
          status: 'COMPLETED',
        },
      });
    }
  }
  console.log('✓ 4 demo invoices created (with payments)');

  // Update InvoiceSettings.nextNumber to 0128
  await prisma.invoiceSettings.updateMany({ data: { nextNumber: '0128' } });

  console.log('Seeding complete ✓');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### 2. Run the seed locally

```bash
# If you've already created data, reset first
npx prisma migrate reset

# Or just run seed if DB is empty
npx prisma db seed
```

### 3. Write `README.md`

```markdown
# Ultrakey Invoice

A standalone invoice and quotation web application for Ultrakey IT Solutions Pvt. Ltd.,
designed to be embedded into the main Ultrakey website. Built as a feature-complete clone
of the Sliced Invoices workflow with adaptations for the Indian B2B/B2C invoicing context.

## Stack

- Next.js 15 (App Router) + TypeScript
- PostgreSQL + Prisma ORM
- Clerk (admin auth)
- Tailwind CSS + shadcn/ui
- @react-pdf/renderer (PDF generation)
- Resend (transactional email)
- Razorpay test mode (payments)

## Features

- **Quotes** — create, edit, send, track status, convert to invoice
- **Invoices** — create, edit, send, payment tracking with multiple methods
- **Public client links** — clients view quotes/invoices via unique unguessable tokens; accept, decline, or pay without login
- **PDF generation** — single canonical template for both quotes and invoices with PAID/ACCEPTED watermarks
- **Email** — Resend integration with wildcard rendering and three transactional templates
- **Razorpay payments** — test-mode integration with server-side HMAC signature verification
- **Dashboard** — admin stats and recent activity
- **Settings** — eight configuration tabs covering all aspects of branding, numbering, tax, and email templates
- **Audit log** — every state-changing action recorded with actor, IP, and metadata

## Permissions Model

- **Admin** — single user, authenticated via Clerk, full access to all admin routes
- **Client** — no account, no login, accesses ONE document via unguessable `publicToken` at `/q/[token]` or `/i/[token]`

All public routes:
- Query by `publicToken`, never by sequential `id`
- Return whitelisted DTOs — never raw Prisma objects
- Rate-limit at 30 requests/minute per IP
- Validate state transitions on the server (client can't send raw status)
- Audit-log with `actor: "client@public"` distinct from admin actions

## Local Setup

```bash
# Install
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your keys

# Run migrations + seed
npx prisma migrate dev
npx prisma db seed

# Dev server
npm run dev
```

Visit `http://localhost:3000` — sign in to access the admin.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | yes | Clerk publishable key |
| `CLERK_SECRET_KEY` | yes | Clerk secret key |
| `NEXT_PUBLIC_APP_URL` | yes | Public-facing base URL |
| `RESEND_API_KEY` | optional | Without this, email is skipped silently |
| `RAZORPAY_KEY_ID` | optional | Without this, Razorpay button is disabled |
| `RAZORPAY_KEY_SECRET` | optional | |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | optional | Same as `RAZORPAY_KEY_ID`, exposed to client |

## Spec Deviations

This implementation differs from the source spec PDF in the following ways. Each was a
deliberate decision based on time and code-quality considerations.

1. **No "Adjust %" column on line items.** The spec marks this for removal (red X on screen 1). Adjustments are handled via the Discount field at the totals level.
2. **Single PDF template.** The spec shows three template thumbnails; this MVP ships one canonical template matching Sample 2 (page 11). Multi-template picker is v1.1.
3. **No client login accounts.** The spec includes WordPress-style user accounts for clients. We replace this with unique public tokens — simpler, more secure, less to maintain.
4. **No automated reminder cron.** The 8-tier reminder schedule is configurable in settings but only triggered by the manual "Send Reminder Now" button on the invoice view. A daily cron (Vercel Cron or external scheduler) is v1.1 work.
5. **No multi-template picker / no Custom CSS field.** Both deferred to v1.1.
6. **No PayPal.** Razorpay only — primary payment processor for Indian businesses.
7. **No client-facing dashboard.** The spec implies clients can view a list of their documents; in our model they only access one document at a time via a token. To view another, a fresh link is sent.

## Architecture Notes

- All settings are singleton rows (one per table) seeded on first run.
- Quote and invoice numbering uses transaction-locked counters on `QuoteSettings.nextNumber` / `InvoiceSettings.nextNumber` to prevent race conditions.
- Totals computed by `lib/totals.ts` — single source of truth used by admin forms, view pages, PDFs, and email-context builders.
- Line items are polymorphic (`parentType: 'QUOTE' | 'INVOICE'`) with conditional relations to `Quote` or `Invoice`.
- Public routes are isolated in the `(public)` route group and excluded from Clerk middleware.
- HTML fields stored in settings are sanitized via `isomorphic-dompurify` before render.

## Project Structure

```
app/
  (admin)/           # Clerk-protected admin routes
  (public)/          # Token-based public routes
  api/               # PDF and webhook routes
components/
  ui/                # shadcn primitives
  admin/             # Admin-only components
  public/            # Public-only components
  shared/            # Cross-use components
  pdf/               # @react-pdf templates
lib/
  prisma.ts          # Prisma client
  settings.ts        # Singleton settings getters
  totals.ts          # Single-source totals calculator
  numbering.ts       # Transaction-locked counters
  currency.ts        # INR formatter
  wildcards.ts       # Email template engine
  public-dto.ts      # Whitelisted projection helpers
  sanitize.ts        # DOMPurify wrapper
  audit.ts           # Audit log writer
  email.ts           # Resend integration
prisma/
  schema.prisma
  seed.ts
```

## Deployment

See deploy section below.

## License

Proprietary — Ultrakey IT Solutions Pvt. Ltd.
```

### 4. Deploy to Vercel

```bash
# Push to GitHub first
git remote add origin git@github.com:<your-username>/ultrakey-invoice.git
git push -u origin main
```

In Vercel:

1. Click **Add New → Project**
2. Import the GitHub repo
3. Framework preset: **Next.js** (auto-detected)
4. **Environment Variables** — add all from `.env.local`:
   - `DATABASE_URL` (Neon connection string with `?sslmode=require&pgbouncer=true`)
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `NEXT_PUBLIC_APP_URL` (your final Vercel URL, e.g. `https://ultrakey-invoice.vercel.app`)
   - `RESEND_API_KEY`
   - `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`
5. **Build Command:** `prisma generate && next build`
6. Click **Deploy**

After first deploy:

```bash
# Run migrations against production DB
npx prisma migrate deploy

# Seed production (if desired — usually only do this once)
DATABASE_URL="<prod-url>" npx prisma db seed
```

### 5. Post-deploy checks

- Visit your live URL → redirects to sign-in
- Sign in with your admin Clerk user
- Create a new client + quote + invoice end-to-end
- Send the invoice to your own email → confirm it arrives
- Open the public link in incognito → pay with Razorpay test card `4111 1111 1111 1111`
- Verify the paid invoice shows ✓ Paid in full

### 6. Demo Script (for interview / Loom recording)

Five minutes is enough to demonstrate the whole flow:

1. **0:00–0:30** — Sign in, show dashboard with stat cards
2. **0:30–1:00** — Visit Settings, show all 8 tabs briefly, mention they're all configurable
3. **1:00–1:30** — Create a new client
4. **1:30–2:30** — Create a new quote, demonstrate line items repeater and live totals
5. **2:30–3:00** — Send the quote, copy the public link, open it in incognito
6. **3:00–3:30** — Click Accept → show the invoice was auto-generated and emailed
7. **3:30–4:30** — Open invoice public link in incognito, click Pay → enter test card → return showing PAID
8. **4:30–5:00** — Show the audit log entries, mention key architectural decisions (token security, server-validated transitions, HMAC signature verification)

## Verification Checklist

- [ ] Seed runs cleanly on a fresh DB
- [ ] Local app boots with full demo data
- [ ] README in repo root with all sections above
- [ ] `.env.example` committed, `.env.local` ignored
- [ ] Vercel deploy succeeds
- [ ] Live URL works end-to-end
- [ ] Public quote + invoice links open in incognito without auth
- [ ] Razorpay payment with test card succeeds on production
- [ ] Email arrives from production deployment
- [ ] PDF download works from production
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] No console errors in browser

## Commit

```bash
git add -A
git commit -m "step-13: full demo seed data, README, and production deployment"
git push
```

## You're Done

Step 13 is the last build step. The application is now feature-complete per the spec
(with documented deviations). Time to record the demo Loom and submit.

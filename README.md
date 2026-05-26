# Ultrakey Invoice

A standalone invoice and quotation web application for Ultrakey IT Solutions Pvt. Ltd.,
designed to be embedded into the main Ultrakey website. Built as a feature-complete clone
of the Sliced Invoices workflow with adaptations for the Indian B2B/B2C invoicing context.

## Stack

- Next.js 16 (App Router) + TypeScript
- PostgreSQL + Prisma ORM
- Clerk (admin auth)
- Tailwind CSS + shadcn/ui
- @react-pdf/renderer (PDF generation)
- Resend (transactional email)
- Razorpay test mode (payments)

## Features

- **Quotes** -- create, edit, send, track status, convert to invoice
- **Invoices** -- create, edit, send, payment tracking with multiple methods
- **Public client links** -- clients view quotes/invoices via unique unguessable tokens; accept, decline, or pay without login
- **PDF generation** -- single canonical template for both quotes and invoices with PAID/ACCEPTED watermarks
- **Email** -- Resend integration with wildcard rendering and three transactional templates
- **Razorpay payments** -- test-mode integration with server-side HMAC signature verification
- **Dashboard** -- admin stats and recent activity
- **Settings** -- eight configuration tabs covering all aspects of branding, numbering, tax, and email templates
- **Audit log** -- every state-changing action recorded with actor, IP, and metadata

## Permissions Model

- **Admin** -- single user, authenticated via Clerk, full access to all admin routes
- **Client** -- no account, no login, accesses ONE document via unguessable `publicToken` at `/q/[token]` or `/i/[token]`

All public routes:
- Query by `publicToken`, never by sequential `id`
- Return whitelisted DTOs -- never raw Prisma objects
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

Visit `http://localhost:3000` -- sign in to access the admin.

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
3. **No client login accounts.** The spec includes WordPress-style user accounts for clients. We replace this with unique public tokens -- simpler, more secure, less to maintain.
4. **No automated reminder cron.** The 8-tier reminder schedule is configurable in settings but only triggered by the manual "Send Reminder Now" button on the invoice view. A daily cron (Vercel Cron or external scheduler) is v1.1 work.
5. **No multi-template picker / no Custom CSS field.** Both deferred to v1.1.
6. **No PayPal.** Razorpay only -- primary payment processor for Indian businesses.
7. **No client-facing dashboard.** The spec implies clients can view a list of their documents; in our model they only access one document at a time via a token. To view another, a fresh link is sent.

## Architecture Notes

- All settings are singleton rows (one per table) seeded on first run.
- Quote and invoice numbering uses transaction-locked counters on `QuoteSettings.nextNumber` / `InvoiceSettings.nextNumber` to prevent race conditions.
- Totals computed by `lib/totals.ts` -- single source of truth used by admin forms, view pages, PDFs, and email-context builders.
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

1. Push to GitHub
2. Import into Vercel (Next.js preset auto-detected)
3. Set all environment variables from `.env.example`
4. Build command: `prisma generate && next build`
5. After first deploy, run `npx prisma migrate deploy` against production DB
6. Optionally seed production: `DATABASE_URL="<prod-url>" npx prisma db seed`

## License

Proprietary -- Ultrakey IT Solutions Pvt. Ltd.

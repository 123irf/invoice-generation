# Ultrakey Invoice Application — Build Plan

A standalone invoice and quotation service for Ultrakey IT Solutions, designed to be
embeddable into the main Ultrakey website. Single-tenant, two roles (admin + public client),
based on screen-by-screen requirements from the Ultrakey spec PDF.

## Tech Stack (locked)

- **Framework:** Next.js 15 (App Router) + TypeScript
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** Clerk
- **Styling:** Tailwind CSS + shadcn/ui
- **PDF:** @react-pdf/renderer
- **Email:** Resend
- **Payments:** Razorpay (test mode)
- **Deploy:** Vercel + Neon Postgres

## Build Order

Follow strictly. Each step depends on the previous one. Paste the contents of each MD
into Claude Code as a self-contained task. Verify the checklist at the end of each step
before moving on.

| Step | File | Feature |
|------|------|---------|
| 0    | 00-SETUP.md            | Project scaffold, packages, env, configs |
| 1    | 01-DATABASE.md         | Prisma schema, migrations, generate |
| 2    | 02-AUTH.md             | Clerk auth, middleware, route groups, layouts |
| 3    | 03-SETTINGS.md         | All 8 settings tabs (General → Translate) |
| 4    | 04-CLIENTS.md          | Clients CRUD + Add Client modal |
| 5    | 05-QUOTES.md           | Admin quotes: list + form + view |
| 6    | 06-QUOTES-PUBLIC.md    | Public quote view + accept/decline flow |
| 7    | 07-INVOICES.md         | Admin invoices: list + form + view + payments |
| 8    | 08-INVOICES-PUBLIC.md  | Public invoice view |
| 9    | 09-PDF.md              | Shared PDF templates for quote and invoice |
| 10   | 10-EMAIL.md            | Resend integration, wildcards, 3 email templates |
| 11   | 11-PAYMENTS.md         | Razorpay test mode + HMAC signature verification |
| 12   | 12-DASHBOARD.md        | Admin dashboard: stats + recent activity |
| 13   | 13-SEED-DEPLOY.md      | Seed data, README, Vercel + Neon deployment |

## Permissions Model

- **ADMIN** — single user, authenticated via Clerk, full access to all admin routes under `(admin)`
- **CLIENT** — no account, no login, accesses ONE quote or invoice via unguessable public token

Public routes only:
- `/q/[token]` — view quote, accept, decline
- `/i/[token]` — view invoice, pay via Razorpay

Everything else is admin-only.

## Spec Deviations (document in README)

1. **No Adjust % column on line items** — spec marks this for removal (red X on Screen 1)
2. **Single PDF template** — spec shows 3 thumbnails, MVP ships one canonical template (Sample 2 layout from page 11)
3. **No client login** — spec has WordPress user-account flow; we use public tokens (architectural decision)
4. **No automated reminder cron** — manual "Send Reminder Now" button on invoice. Architecture for v1.1 documented.
5. **No multi-template picker, no Custom CSS** — both deferred to v1.1
6. **No PayPal** — spec mentions, MVP uses Razorpay only

## How to Use This Documentation

For each step file:

1. Open a fresh Claude Code session in the project directory
2. Paste the entire MD file contents as the first message
3. Let Claude Code execute the step
4. Run the verification checklist at the bottom of the MD
5. Commit with the suggested commit message
6. Move to the next step

Do NOT skip ahead. Steps build on each other.

## Estimated Time

- Step 0: 20 min
- Step 1: 15 min
- Step 2: 20 min
- Step 3: 60 min
- Step 4: 25 min
- Step 5: 60 min
- Step 6: 40 min
- Step 7: 50 min
- Step 8: 20 min
- Step 9: 45 min
- Step 10: 35 min
- Step 11: 35 min
- Step 12: 20 min
- Step 13: 30 min

**Total: ~7 hours of focused build time.** If you have 3 hours, skip steps 10–11 (use stubs)
and shortcut step 13 — that drops it to ~4 hours.

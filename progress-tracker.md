# Ultrakey IT Solutions — Invoice Application Progress Tracker

## Step 0: Project Setup

| # | Task | Status |
|---|------|--------|
| 1 | Initialize Next.js | ✅ Done |
| 2 | Install Application Packages | ✅ Done |
| 3 | Install shadcn/ui + components | ✅ Done |
| 4 | Initialize Prisma (PostgreSQL) | ✅ Done |
| 5 | Create project folder structure | ✅ Done |
| 6 | Environment variables (.env + .env.example) | ✅ Done |
| 7 | Update .gitignore | ✅ Done |
| 8 | Configure lib/prisma.ts | ✅ Done |
| 9 | Configure lib/utils.ts | ✅ Done |
| 10 | Update app/layout.tsx (Inter, ClerkProvider, Toaster) | ✅ Done |
| 11 | Replace app/page.tsx (redirect to /dashboard) | ✅ Done |
| 12 | Clerk keys configured | ✅ Done |
| 13 | Neon Database URL | ✅ Done |
| V | Verification (tsc, dev server, prisma db push) | ✅ Done |

## Step 1: Database Schema
| # | Task | Status |
|---|------|--------|
| - | Prisma schema + migrations | ✅ Done |

## Step 2–12: Features (from MD-FILE)
| Step | Feature | Status |
|------|---------|--------|
| 01 | Database schema | ✅ Done |
| 02 | Auth + middleware | ✅ Done (Clerk) |
| 03 | Dashboard | ✅ Done |
| 04 | Clients CRUD | ✅ Done |
| 05 | Quotes CRUD | ✅ Done |
| 06 | Quotes Public View | ✅ Done |
| 07 | Invoices CRUD + Payments | ✅ Done |
| 08 | Invoices Public View | ✅ Done |
| 09 | PDF generation / Shared template | ✅ Done |
| 10 | Settings | ✅ Done |
| 11 | Resend email | ✅ Done |
| 12 | Razorpay payments | ✅ Done |
| 13 | Seed data + README + Deploy prep | ✅ Done |

## Step 7 Details: Invoices Admin + Payments
| # | Task | Status |
|---|------|--------|
| 1 | Server actions (actions.ts) — CRUD, payment recording, status changes | ✅ Done |
| 2 | Invoice list page with status tabs (ALL/DRAFT/SENT/PAID/PARTIAL/OVERDUE/CANCELLED) | ✅ Done |
| 3 | Invoice form component (invoice-form.tsx) — mirrors QuoteForm with dueDate | ✅ Done |
| 4 | New invoice page (new/page.tsx) | ✅ Done |
| 5 | Invoice view page ([id]/page.tsx) with payments table | ✅ Done |
| 6 | Invoice edit page ([id]/edit/page.tsx) | ✅ Done |
| 7 | Invoice actions component (Send, Record Payment, Edit, Delete, Status dropdown) | ✅ Done |
| 8 | Record Payment dialog (date, amount, method, reference, memo) | ✅ Done |
| 9 | OVERDUE computed on-the-fly via computeDisplayStatus() | ✅ Done |
| 10 | Audit log entries for all invoice/payment actions | ✅ Done |

## Step 11 Details: Resend Email Integration (MD-FILE/10-EMAIL.md)
| # | Task | Status |
|---|------|--------|
| 1 | Wildcard engine (lib/wildcards.ts) — %client_first_name%, %number%, %link%, etc. | ✅ Done |
| 2 | Base email HTML template (emails/base-email.ts) — header, body, button, footer | ✅ Done |
| 3 | Resend client + sendTemplatedEmail (lib/email.ts) — template routing, wildcard rendering, EmailLog | ✅ Done |
| 4 | buildQuoteContext / buildInvoiceContext helpers in lib/email.ts | ✅ Done |
| 5 | Wire real email into sendQuoteEmail (quotes/actions.ts) | ✅ Done |
| 6 | Wire real email into sendInvoiceEmail (invoices/actions.ts) | ✅ Done |
| 7 | Auto-email on public quote accept (convert_and_send) in q/[token]/actions.ts | ✅ Done |
| 8 | sendReminderNow server action (invoices/actions.ts) | ✅ Done |
| 9 | Send Reminder Now button in invoice-actions.tsx (Bell icon) | ✅ Done |
| 10 | EmailLog model in Prisma schema (SENT/FAILED status, resendId tracking) | ✅ Done |
| 11 | resend package installed (v6.12.4) | ✅ Done |
| 12 | BCC support via emailSettings.bccOnClientEmails | ✅ Done |
| 13 | `npx tsc --noEmit` passes | ✅ Done |
| - | Note: Automated reminder cron deferred to v1.1 (admin uses manual Send Reminder Now) | ℹ️ Deferred |

## Step 12 Details: Razorpay Payments (MD-FILE/11-PAYMENTS.md)
| # | Task | Status |
|---|------|--------|
| 1 | createRazorpayOrder server action (app/(public)/i/[token]/actions.ts) | ✅ Done |
| 2 | verifyRazorpayPayment server action with HMAC SHA256 signature verification | ✅ Done |
| 3 | Idempotency guard — prevents double-recording same Razorpay payment ID | ✅ Done |
| 4 | Payment amount fetched from Razorpay API (fallback to totalDue) | ✅ Done |
| 5 | PayButton with Razorpay Checkout modal (components/public/pay-button.tsx) | ✅ Done |
| 6 | Razorpay JS SDK loaded via next/script (afterInteractive) | ✅ Done |
| 7 | Redirect to /i/[token]/paid on success | ✅ Done |
| 8 | Payment-received email sent (fire-and-forget) after successful payment | ✅ Done |
| 9 | Audit log entries: INVOICE_PAY_INITIATED, INVOICE_PAID_BY_CLIENT, INVOICE_PAY_INVALID_SIGNATURE | ✅ Done |
| 10 | Test card hint shown in non-production (4111 1111 1111 1111) | ✅ Done |
| 11 | Webhook skeleton (app/api/razorpay/webhook/route.ts) | ✅ Done |
| 12 | razorpay package already installed (v2.9.6) | ✅ Done |
| 13 | `npx tsc --noEmit` passes | ✅ Done |
| - | Note: Full webhook handler deferred to v1.1 (MVP uses synchronous verification) | ℹ️ Deferred |

## Step 13 Details: Admin Dashboard (MD-FILE/12-DASHBOARD.md)
| # | Task | Status |
|---|------|--------|
| 1 | Four stat cards: Quotes Pending, Invoices Unpaid, Overdue, Collected This Month | ✅ Done |
| 2 | Quick action links: + Client, + Quote, + Invoice | ✅ Done |
| 3 | Recent Quotes panel (5 most recent, status badges, totals) | ✅ Done |
| 4 | Recent Invoices panel (5 most recent, OVERDUE computed, paid/total progress) | ✅ Done |
| 5 | Stat cards link to filtered list pages | ✅ Done |
| 6 | Empty states for no quotes / no invoices | ✅ Done |
| 7 | Collected This Month uses date-fns startOfMonth/endOfMonth | ✅ Done |
| 8 | `npx tsc --noEmit` passes | ✅ Done |

## Step 14 Details: Seed Data + README + Deploy Prep (MD-FILE/13-SEED-DEPLOY.md)
| # | Task | Status |
|---|------|--------|
| 1 | Full seed.ts: 6 demo clients, 5 quotes (mixed statuses), 4 invoices (with payments) | ✅ Done |
| 2 | Seed preserves existing data (skips if clients already exist) | ✅ Done |
| 3 | Seed updates nextNumber counters (QuoteSettings, InvoiceSettings) | ✅ Done |
| 4 | Seed uses project's PrismaPg adapter pattern | ✅ Done |
| 5 | Comprehensive README.md (stack, features, permissions, setup, env vars, spec deviations, architecture, project structure, deployment) | ✅ Done |
| 6 | .env.example with all required/optional variables | ✅ Done |
| 7 | `npx tsc --noEmit` passes | ✅ Done |

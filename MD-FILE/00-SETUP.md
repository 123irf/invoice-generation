# Step 0 — Project Setup

## Goal

Scaffold a Next.js 15 application with all required packages installed, environment
variables defined, and base configurations in place. No features yet — just the foundation.

## Prerequisites

- Node.js 20 or later (`node -v` to confirm)
- npm or pnpm
- Accounts created on:
  - Clerk (clerk.com) — auth provider
  - Neon (neon.tech) — Postgres for production
  - Resend (resend.com) — email
  - Razorpay (razorpay.com) — payments (TEST mode)
  - Vercel (vercel.com) — deployment

## Steps

### 1. Initialize Next.js

```bash
npx create-next-app@latest ultrakey-invoice \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias "@/*" \
  --no-turbopack

cd ultrakey-invoice
```

When prompted:
- TypeScript: Yes
- ESLint: Yes
- Tailwind: Yes
- `src/` directory: No
- App Router: Yes
- Turbopack: No (for stability)
- Import alias: `@/*`

### 2. Install Application Packages

```bash
npm install \
  @clerk/nextjs \
  @prisma/client \
  @react-pdf/renderer \
  resend \
  razorpay \
  isomorphic-dompurify \
  zod \
  date-fns \
  lucide-react \
  class-variance-authority \
  clsx \
  tailwind-merge

npm install -D \
  prisma \
  tsx \
  @types/node
```

### 3. Install shadcn/ui

```bash
npx shadcn@latest init
```

Choices:
- Style: Default
- Base color: Slate
- CSS variables: Yes

Add the components we'll need throughout:

```bash
npx shadcn@latest add \
  button input textarea label select checkbox radio-group \
  dialog dropdown-menu form table badge card \
  separator tabs toast sonner skeleton
```

### 4. Initialize Prisma

```bash
npx prisma init --datasource-provider postgresql
```

This creates `prisma/schema.prisma` and a `.env` file with `DATABASE_URL`.

### 5. Project Folder Structure

Create the following structure (file contents come in later steps):

```
ultrakey-invoice/
├── app/
│   ├── (admin)/                  # Authenticated routes
│   │   ├── dashboard/
│   │   ├── clients/
│   │   ├── quotes/
│   │   ├── invoices/
│   │   └── settings/
│   ├── (public)/                 # Public token routes
│   │   ├── q/[token]/
│   │   └── i/[token]/
│   ├── api/                      # API routes
│   │   └── razorpay/
│   ├── sign-in/[[...rest]]/
│   ├── layout.tsx
│   ├── globals.css
│   └── page.tsx
├── components/
│   ├── ui/                       # shadcn components (auto-generated)
│   ├── admin/                    # Admin-specific components
│   ├── public/                   # Public-page components
│   ├── shared/                   # Cross-use components
│   └── pdf/                      # PDF templates
├── lib/
│   ├── prisma.ts                 # Prisma client singleton
│   ├── settings.ts               # Settings helpers
│   ├── totals.ts                 # Totals calculator (single source of truth)
│   ├── currency.ts               # INR formatting
│   ├── wildcards.ts              # Email wildcard engine
│   ├── public-dto.ts             # Whitelist projection helpers
│   ├── sanitize.ts               # DOMPurify wrapper
│   ├── audit.ts                  # Audit log writer
│   └── utils.ts                  # shadcn cn() helper
├── emails/                       # React Email templates
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── public/
├── middleware.ts                 # Clerk middleware
├── .env.local
├── .env.example
└── README.md
```

Create empty directories:

```bash
mkdir -p app/{\(admin\)/{dashboard,clients,quotes,invoices,settings},\(public\)/{q,i},api/razorpay,sign-in}
mkdir -p components/{admin,public,shared,pdf}
mkdir -p lib emails
```

### 6. Environment Variables

Create `.env.local` (DO NOT commit):

```bash
# Database (Neon for production, local Postgres or Neon for dev)
DATABASE_URL="postgresql://user:password@host:5432/ultrakey_invoice?sslmode=require"

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-in"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Resend (added in Step 10)
RESEND_API_KEY=""

# Razorpay (added in Step 11)
RAZORPAY_KEY_ID=""
RAZORPAY_KEY_SECRET=""
NEXT_PUBLIC_RAZORPAY_KEY_ID=""
```

Create `.env.example` with the same keys but empty values. Commit this one.

### 7. Update `.gitignore`

Add:

```
.env*.local
.env
/prisma/migrations/migration_lock.toml
```

(Keep migration files committed; only ignore `.env` files and lock.)

### 8. Configure `lib/prisma.ts`

```ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### 9. Configure `lib/utils.ts` (shadcn helper — usually auto-created)

```ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 10. Update `app/layout.tsx`

```tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Ultrakey IT — Invoicing',
  description: 'Quote and invoice management for Ultrakey IT Solutions',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          {children}
          <Toaster richColors position="top-right" />
        </body>
      </html>
    </ClerkProvider>
  );
}
```

### 11. Replace `app/page.tsx` (landing redirect)

```tsx
import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/dashboard');
}
```

### 12. Get Clerk Keys

1. Go to clerk.com → create application "Ultrakey Invoice"
2. Enable Email/Password sign-in only (disable social for MVP)
3. Disable sign-ups in production settings (single admin user — you create them manually in Clerk dashboard)
4. Copy publishable + secret keys into `.env.local`
5. Create one admin user in Clerk dashboard with your test email

### 13. Get Neon Database URL

1. Go to neon.tech → create project "ultrakey-invoice"
2. Copy the pooled connection string
3. Paste into `DATABASE_URL` in `.env.local`

For local dev with local Postgres instead:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ultrakey_invoice"
```

## Verification Checklist

Run these commands and confirm:

```bash
# Type-check
npx tsc --noEmit

# Dev server boots
npm run dev
# Open http://localhost:3000 — should redirect to /dashboard, then to Clerk sign-in
# (sign-in page will 404 until Step 2 — that's expected)

# Prisma can connect
npx prisma db push --skip-generate
# Should succeed (creates an empty DB, no tables yet)
```

If all three commands succeed, Step 0 is done.

## Commit

```bash
git add -A
git commit -m "step-0: project scaffold with Next.js 15, Prisma, Clerk, shadcn/ui"
```

## Next

Proceed to `01-DATABASE.md`.

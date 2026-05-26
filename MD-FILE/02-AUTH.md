# Step 2 — Authentication & Route Groups

## Goal

Wire up Clerk authentication with two route groups: `(admin)` requires login, `(public)` is
open. Build the shared admin layout (sidebar nav) and a public layout. After this step you
can sign in and see a (still empty) dashboard shell.

## Prerequisites

- Step 1 complete (schema migrated, settings seeded)
- Clerk app created, keys in `.env.local`, one test admin user created in Clerk dashboard

## Steps

### 1. Create `middleware.ts` at the project root

```ts
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/q/:token',
  '/q/:token/(.*)',
  '/i/:token',
  '/i/:token/(.*)',
  '/api/razorpay/(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

### 2. Create sign-in route

`app/sign-in/[[...rest]]/page.tsx`:

```tsx
import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <SignIn />
    </div>
  );
}
```

### 3. Create the admin layout

`app/(admin)/layout.tsx`:

```tsx
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminTopbar } from '@/components/admin/admin-topbar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminTopbar />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
```

### 4. Create `components/admin/admin-sidebar.tsx`

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  FileText,
  Receipt,
  Settings,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/quotes', label: 'Quotes', icon: FileText },
  { href: '/invoices', label: 'Invoices', icon: Receipt },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 bg-white border-r border-slate-200 min-h-[calc(100vh-3.5rem)]">
      <nav className="p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

### 5. Create `components/admin/admin-topbar.tsx`

```tsx
import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';

export function AdminTopbar() {
  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      <Link href="/dashboard" className="font-semibold text-slate-900">
        Ultrakey Invoice
      </Link>
      <UserButton afterSignOutUrl="/sign-in" />
    </header>
  );
}
```

### 6. Create placeholder admin pages

These are stubs — real content comes in later steps. They just need to exist so navigation works.

`app/(admin)/dashboard/page.tsx`:

```tsx
export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Dashboard</h1>
      <p className="text-slate-600">Coming in Step 12.</p>
    </div>
  );
}
```

`app/(admin)/clients/page.tsx`:

```tsx
export default function ClientsPage() {
  return <div><h1 className="text-2xl font-bold">Clients</h1><p className="text-slate-600">Coming in Step 4.</p></div>;
}
```

`app/(admin)/quotes/page.tsx`:

```tsx
export default function QuotesPage() {
  return <div><h1 className="text-2xl font-bold">Quotes</h1><p className="text-slate-600">Coming in Step 5.</p></div>;
}
```

`app/(admin)/invoices/page.tsx`:

```tsx
export default function InvoicesPage() {
  return <div><h1 className="text-2xl font-bold">Invoices</h1><p className="text-slate-600">Coming in Step 7.</p></div>;
}
```

`app/(admin)/settings/page.tsx`:

```tsx
export default function SettingsPage() {
  return <div><h1 className="text-2xl font-bold">Settings</h1><p className="text-slate-600">Coming in Step 3.</p></div>;
}
```

### 7. Create the public layout

`app/(public)/layout.tsx`:

```tsx
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-100">
      <main className="max-w-4xl mx-auto py-12 px-4">{children}</main>
    </div>
  );
}
```

`app/(public)/q/[token]/page.tsx` (stub):

```tsx
export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <div className="bg-white p-8 rounded-lg shadow">Quote token: {token} — coming in Step 6.</div>;
}
```

`app/(public)/i/[token]/page.tsx` (stub):

```tsx
export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <div className="bg-white p-8 rounded-lg shadow">Invoice token: {token} — coming in Step 8.</div>;
}
```

### 8. Build a helper for getting the current admin user

`lib/auth.ts`:

```ts
import { auth, currentUser } from '@clerk/nextjs/server';

export async function getAdminUser() {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await currentUser();
  return user;
}

export async function getAdminEmail() {
  const user = await getAdminUser();
  return user?.emailAddresses[0]?.emailAddress ?? 'admin@unknown';
}
```

### 9. Build the audit log helper

`lib/audit.ts`:

```ts
import { prisma } from '@/lib/prisma';

interface AuditEntry {
  actor: string;
  actorIp?: string;
  action: string;
  targetType: 'QUOTE' | 'INVOICE' | 'CLIENT' | 'SETTINGS' | 'PAYMENT' | 'EMAIL';
  targetId?: string;
  metadata?: Record<string, unknown>;
}

export async function writeAudit(entry: AuditEntry) {
  try {
    await prisma.auditLog.create({
      data: {
        actor: entry.actor,
        actorIp: entry.actorIp,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        metadata: entry.metadata as never,
      },
    });
  } catch (err) {
    // Don't fail user-facing requests if audit write fails
    console.error('Audit write failed:', err);
  }
}
```

## Verification Checklist

- [ ] `npm run dev` boots
- [ ] Visit `http://localhost:3000/` → redirects to `/sign-in`
- [ ] Sign in with your Clerk test user → redirects to `/dashboard`
- [ ] Sidebar shows all 5 nav items, click each to verify routing
- [ ] Active nav item is highlighted
- [ ] UserButton in top-right shows your avatar and a Sign Out option
- [ ] Visit `/q/test-token-123` in incognito (no auth) → renders the stub page WITHOUT redirecting to sign-in
- [ ] Visit `/i/test-token-456` in incognito → same, no auth required
- [ ] Visit `/dashboard` in incognito → redirects to sign-in
- [ ] `npx tsc --noEmit` passes

## Commit

```bash
git add -A
git commit -m "step-2: Clerk auth, route groups, admin layout shell, audit log helper"
```

## Next

Proceed to `03-SETTINGS.md`.

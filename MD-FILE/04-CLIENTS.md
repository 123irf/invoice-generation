# Step 4 — Clients Module

## Goal

Build the Clients section: a list page with search, an Add Client modal, edit, and delete.
This module is consumed by Quotes (Step 5) and Invoices (Step 7) via the client picker.

## Prerequisites

- Steps 0–3 complete

## Architecture Decision

The original spec offers two flows — "Existing WordPress User" and "Create New User"
(with username/password). We're dropping both because our clients don't log in. **One
simple form** captures all the data we need.

Document this in the README under "Spec Deviations".

## Steps

### 1. Server Action

`app/(admin)/clients/actions.ts`:

```ts
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { writeAudit } from '@/lib/audit';
import { getAdminEmail } from '@/lib/auth';

const clientSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  address: z.string().optional(),
  extraInfo: z.string().optional(),
  website: z.string().url().or(z.literal('')).optional(),
});

export async function createClient(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = clientSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }
  const client = await prisma.client.create({
    data: {
      businessName: parsed.data.businessName,
      firstName: parsed.data.firstName || null,
      lastName: parsed.data.lastName || null,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      extraInfo: parsed.data.extraInfo || null,
      website: parsed.data.website || null,
    },
  });
  await writeAudit({
    actor: await getAdminEmail(),
    action: 'CLIENT_CREATED',
    targetType: 'CLIENT',
    targetId: client.id,
  });
  revalidatePath('/clients');
  return { ok: true, client };
}

export async function updateClient(id: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = clientSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }
  await prisma.client.update({
    where: { id },
    data: {
      businessName: parsed.data.businessName,
      firstName: parsed.data.firstName || null,
      lastName: parsed.data.lastName || null,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      extraInfo: parsed.data.extraInfo || null,
      website: parsed.data.website || null,
    },
  });
  await writeAudit({
    actor: await getAdminEmail(),
    action: 'CLIENT_UPDATED',
    targetType: 'CLIENT',
    targetId: id,
  });
  revalidatePath('/clients');
  return { ok: true };
}

export async function deleteClient(id: string) {
  // Block delete if client has quotes or invoices
  const used = await prisma.client.findUnique({
    where: { id },
    include: { _count: { select: { quotes: true, invoices: true } } },
  });
  if (!used) return { ok: false, error: 'Client not found' };
  if (used._count.quotes > 0 || used._count.invoices > 0) {
    return {
      ok: false,
      error: `Cannot delete — client has ${used._count.quotes} quotes and ${used._count.invoices} invoices.`,
    };
  }
  await prisma.client.delete({ where: { id } });
  await writeAudit({
    actor: await getAdminEmail(),
    action: 'CLIENT_DELETED',
    targetType: 'CLIENT',
    targetId: id,
  });
  revalidatePath('/clients');
  return { ok: true };
}
```

### 2. List Page

`app/(admin)/clients/page.tsx`:

```tsx
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ClientActions } from './client-actions';
import { AddClientButton } from './add-client-button';
import { Plus } from 'lucide-react';

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const clients = await prisma.client.findMany({
    where: q
      ? {
          OR: [
            { businessName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
          ],
        }
      : undefined,
    include: { _count: { select: { quotes: true, invoices: true } } },
    orderBy: { businessName: 'asc' },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
        <AddClientButton />
      </div>

      <form className="mb-4">
        <Input name="q" defaultValue={q} placeholder="Search by name or email..." className="max-w-sm" />
      </form>

      <div className="bg-white rounded-lg border border-slate-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Business Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Quotes / Invoices</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-500 py-12">
                  No clients yet. Click "Add Client" to create one.
                </TableCell>
              </TableRow>
            )}
            {clients.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.businessName}</TableCell>
                <TableCell>
                  {[c.firstName, c.lastName].filter(Boolean).join(' ') || '—'}
                </TableCell>
                <TableCell className="text-slate-600">{c.email}</TableCell>
                <TableCell className="text-slate-600">
                  {c._count.quotes} / {c._count.invoices}
                </TableCell>
                <TableCell>
                  <ClientActions client={c} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

### 3. Add Client Button + Modal

`app/(admin)/clients/add-client-button.tsx`:

```tsx
'use client';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClientFormDialog } from './client-form-dialog';

export function AddClientButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Add Client
      </Button>
      <ClientFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
```

### 4. Client Form Dialog (shared for Add + Edit)

`app/(admin)/clients/client-form-dialog.tsx`:

```tsx
'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createClient, updateClient } from './actions';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: {
    id: string;
    businessName: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    phone: string | null;
    address: string | null;
    extraInfo: string | null;
    website: string | null;
  };
}

export function ClientFormDialog({ open, onOpenChange, client }: Props) {
  const isEdit = !!client;
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = isEdit
        ? await updateClient(client.id, formData)
        : await createClient(formData);
      if (result.ok) {
        toast.success(isEdit ? 'Client updated' : 'Client created');
        onOpenChange(false);
      } else {
        toast.error('Failed: ' + (result.error || 'Validation error'));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Client' : 'Add Client'}</DialogTitle>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="businessName">Business / Client Name *</Label>
            <Input id="businessName" name="businessName" defaultValue={client?.businessName} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" name="firstName" defaultValue={client?.firstName ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" name="lastName" defaultValue={client?.lastName ?? ''} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" name="email" type="email" defaultValue={client?.email} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" defaultValue={client?.phone ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" name="address" rows={3} defaultValue={client?.address ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="extraInfo">Extra Info</Label>
            <Textarea
              id="extraInfo"
              name="extraInfo"
              rows={2}
              defaultValue={client?.extraInfo ?? ''}
              placeholder="GST number, VAT, additional contact info..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input id="website" name="website" defaultValue={client?.website ?? ''} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Client'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### 5. Row Actions (Edit + Delete)

`app/(admin)/clients/client-actions.tsx`:

```tsx
'use client';

import { useState, useTransition } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ClientFormDialog } from './client-form-dialog';
import { deleteClient } from './actions';

export function ClientActions({ client }: { client: any }) {
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onDelete() {
    if (!confirm(`Delete ${client.businessName}? This cannot be undone.`)) return;
    startTransition(async () => {
      const r = await deleteClient(client.id);
      if (r.ok) toast.success('Client deleted');
      else toast.error(r.error || 'Failed to delete');
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>Edit</DropdownMenuItem>
          <DropdownMenuItem
            className="text-red-600"
            onClick={onDelete}
            disabled={pending}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ClientFormDialog open={editOpen} onOpenChange={setEditOpen} client={client} />
    </>
  );
}
```

## Verification Checklist

- [ ] `/clients` shows empty state initially
- [ ] Add Client opens modal, submitting creates a row
- [ ] Edit on a row pre-fills the form and saves changes
- [ ] Search filters the list by name/email
- [ ] Delete prompts confirmation, removes the row
- [ ] Trying to delete a client with quotes/invoices (after Step 5/7) shows an error
- [ ] AuditLog gets CLIENT_CREATED / CLIENT_UPDATED / CLIENT_DELETED entries
- [ ] `npx tsc --noEmit` passes

## Commit

```bash
git add -A
git commit -m "step-4: clients CRUD with add/edit modal, search, delete protection"
```

## Next

Proceed to `05-QUOTES.md`.

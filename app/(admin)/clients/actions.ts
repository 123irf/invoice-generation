'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { writeAudit } from '@/lib/audit';
import { getAdminEmail, hashPassword } from '@/lib/auth';
import { requirePermission } from '@/lib/permissions';

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
  await requirePermission('clients.create');
  const raw = Object.fromEntries(formData.entries());
  const parsed = clientSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstError = Object.values(fieldErrors).flat()[0] ?? 'Validation error';
    return { ok: false, error: firstError };
  }

  try {
    const createUserAccount = formData.get('createUserAccount') === 'true';
    const userPassword = formData.get('userPassword') as string | null;
    const existingUserId = formData.get('existingUserId') as string | null;

    let userId: string | null = null;

    // Option A: link to existing user
    if (existingUserId) {
      const existing = await prisma.user.findUnique({ where: { id: existingUserId } });
      if (!existing) return { ok: false, error: 'Selected user not found' };

      const alreadyLinked = await prisma.client.findUnique({ where: { userId: existingUserId } });
      if (alreadyLinked) return { ok: false, error: 'This user is already linked to another client' };

      userId = existingUserId;
    }

    // Option B: create new user account for this client
    if (createUserAccount && !existingUserId) {
      if (!userPassword || userPassword.length < 6) {
        return { ok: false, error: 'Password must be at least 6 characters' };
      }

      const emailTaken = await prisma.user.findUnique({ where: { email: parsed.data.email } });
      if (emailTaken) {
        return { ok: false, error: 'A user account with this email already exists' };
      }

      const hash = await hashPassword(userPassword);
      const name = [parsed.data.firstName, parsed.data.lastName].filter(Boolean).join(' ') || parsed.data.businessName;
      const newUser = await prisma.user.create({
        data: {
          email: parsed.data.email,
          passwordHash: hash,
          name,
          role: 'CLIENT',
        },
      });
      userId = newUser.id;
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
        userId,
      },
    });

    await writeAudit({
      actor: await getAdminEmail(),
      action: 'CLIENT_CREATED',
      targetType: 'CLIENT',
      targetId: client.id,
      metadata: { userLinked: !!userId },
    });

    revalidatePath('/clients');
    return { ok: true, client };
  } catch (err: unknown) {
    console.error('createClient error:', err);
    const message = err instanceof Error ? err.message : 'Something went wrong';
    return { ok: false, error: message };
  }
}

export async function updateClient(id: string, formData: FormData) {
  await requirePermission('clients.edit');
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
  await requirePermission('clients.delete');
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

/** Get CLIENT-role users that are not yet linked to any client record */
export async function getUnlinkedClientUsers() {
  return prisma.user.findMany({
    where: {
      role: 'CLIENT',
      client: null,
    },
    select: { id: true, email: true, name: true },
    orderBy: { email: 'asc' },
  });
}

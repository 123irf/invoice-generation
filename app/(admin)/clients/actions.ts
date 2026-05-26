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

'use server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { writeAudit } from '@/lib/audit';
import { getAdminEmail } from '@/lib/auth';

const schema = z.object({
  logoUrl: z.string().url().or(z.literal('')).optional(),
  name: z.string().min(1),
  address: z.string(),
  extraInfo: z.string(),
  website: z.string().url().or(z.literal('')).optional(),
});

export async function saveBusinessSettings(formData: FormData) {
  const data = schema.parse({
    logoUrl: formData.get('logoUrl') || '',
    name: formData.get('name'),
    address: formData.get('address'),
    extraInfo: formData.get('extraInfo'),
    website: formData.get('website') || '',
  });

  const existing = await prisma.businessSettings.findFirst();
  await prisma.businessSettings.update({
    where: { id: existing!.id },
    data: {
      logoUrl: data.logoUrl || null,
      name: data.name,
      address: data.address,
      extraInfo: data.extraInfo,
      website: data.website || '',
    },
  });

  await writeAudit({
    actor: await getAdminEmail(),
    action: 'SETTINGS_UPDATED',
    targetType: 'SETTINGS',
    metadata: { section: 'business' },
  });

  revalidatePath('/settings/business');
  return { ok: true };
}

'use server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { writeAudit } from '@/lib/audit';
import { getAdminEmail } from '@/lib/auth';

const schema = z.object({
  pricesEnteredWithTax: z.enum(['inclusive', 'exclusive']),
  taxPercentage: z.coerce.number().min(0).max(100),
  taxName: z.string().min(1),
});

export async function saveTaxSettings(formData: FormData) {
  const data = schema.parse({
    pricesEnteredWithTax: formData.get('pricesEnteredWithTax'),
    taxPercentage: formData.get('taxPercentage'),
    taxName: formData.get('taxName'),
  });

  const existing = await prisma.taxSettings.findFirst();
  await prisma.taxSettings.update({
    where: { id: existing!.id },
    data,
  });

  await writeAudit({
    actor: await getAdminEmail(),
    action: 'SETTINGS_UPDATED',
    targetType: 'SETTINGS',
    metadata: { section: 'tax' },
  });

  revalidatePath('/settings/tax');
  return { ok: true };
}

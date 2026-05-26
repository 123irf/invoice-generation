'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { writeAudit } from '@/lib/audit';
import { getAdminEmail } from '@/lib/auth';

const monthDay = /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;

const schema = z.object({
  fiscalYearStart: z.string().regex(monthDay),
  fiscalYearEnd: z.string().regex(monthDay),
  predefinedLineItemsText: z.string(),
});

export async function saveGeneralSettings(formData: FormData) {
  const raw = {
    fiscalYearStart: formData.get('fiscalYearStart') as string,
    fiscalYearEnd: formData.get('fiscalYearEnd') as string,
    predefinedLineItemsText: formData.get('predefinedLineItemsText') as string,
  };
  const data = schema.parse(raw);

  // Update business settings (fiscal year)
  const business = await prisma.businessSettings.findFirst();
  await prisma.businessSettings.update({
    where: { id: business!.id },
    data: {
      fiscalYearStart: data.fiscalYearStart,
      fiscalYearEnd: data.fiscalYearEnd,
    },
  });

  // Parse pre-defined line items from textarea
  const lines = data.predefinedLineItemsText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const items = lines
    .map((line, index) => {
      const parts = line.split('|').map((p) => p.trim());
      if (parts.length < 3) return null;
      const [qty, title, rate, description] = parts;
      return {
        qty: parseInt(qty, 10) || 1,
        title: title || '',
        rate: parseFloat(rate) || 0,
        description: description || null,
        order: index,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  await prisma.$transaction([
    prisma.predefinedLineItem.deleteMany(),
    prisma.predefinedLineItem.createMany({ data: items }),
  ]);

  await writeAudit({
    actor: await getAdminEmail(),
    action: 'SETTINGS_UPDATED',
    targetType: 'SETTINGS',
    metadata: { section: 'general', itemCount: items.length },
  });

  revalidatePath('/settings/general');
  return { ok: true };
}

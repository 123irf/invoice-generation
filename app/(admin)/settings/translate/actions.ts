'use server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { writeAudit } from '@/lib/audit';
import { getAdminEmail } from '@/lib/auth';

const schema = z.object({
  quoteLabel: z.string().min(1),
  quoteLabelPlural: z.string().min(1),
  invoiceLabel: z.string().min(1),
  invoiceLabelPlural: z.string().min(1),
  hrsQtyLabel: z.string().min(1),
  serviceLabel: z.string().min(1),
  ratePriceLabel: z.string().min(1),
  adjustLabel: z.string().min(1),
  subTotalLabel: z.string().min(1),
  discountLabel: z.string().min(1),
  totalLabel: z.string().min(1),
  totalDueLabel: z.string().min(1),
});

export async function saveTranslateSettings(formData: FormData) {
  const data = schema.parse({
    quoteLabel: formData.get('quoteLabel'),
    quoteLabelPlural: formData.get('quoteLabelPlural'),
    invoiceLabel: formData.get('invoiceLabel'),
    invoiceLabelPlural: formData.get('invoiceLabelPlural'),
    hrsQtyLabel: formData.get('hrsQtyLabel'),
    serviceLabel: formData.get('serviceLabel'),
    ratePriceLabel: formData.get('ratePriceLabel'),
    adjustLabel: formData.get('adjustLabel'),
    subTotalLabel: formData.get('subTotalLabel'),
    discountLabel: formData.get('discountLabel'),
    totalLabel: formData.get('totalLabel'),
    totalDueLabel: formData.get('totalDueLabel'),
  });

  const existing = await prisma.translateSettings.findFirst();
  await prisma.translateSettings.update({
    where: { id: existing!.id },
    data,
  });

  await writeAudit({
    actor: await getAdminEmail(),
    action: 'SETTINGS_UPDATED',
    targetType: 'SETTINGS',
    metadata: { section: 'translate' },
  });

  revalidatePath('/settings/translate');
  return { ok: true };
}

'use server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { writeAudit } from '@/lib/audit';
import { getAdminEmail } from '@/lib/auth';

const schema = z.object({
  currencySymbol: z.string().min(1),
  currencyPosition: z.enum(['left', 'left_space', 'right', 'right_space']),
  thousandSeparator: z.string(),
  decimalSeparator: z.string(),
  numberOfDecimals: z.coerce.number().int().min(0).max(10),
  paymentPageFooter: z.string(),
  bankDetails: z.string(),
  genericPayment: z.string(),
});

export async function savePaymentSettings(formData: FormData) {
  const data = schema.parse({
    currencySymbol: formData.get('currencySymbol'),
    currencyPosition: formData.get('currencyPosition'),
    thousandSeparator: formData.get('thousandSeparator'),
    decimalSeparator: formData.get('decimalSeparator'),
    numberOfDecimals: formData.get('numberOfDecimals'),
    paymentPageFooter: formData.get('paymentPageFooter'),
    bankDetails: formData.get('bankDetails'),
    genericPayment: formData.get('genericPayment'),
  });

  const existing = await prisma.paymentSettings.findFirst();
  await prisma.paymentSettings.update({
    where: { id: existing!.id },
    data: {
      ...data,
      bankDetails: data.bankDetails || null,
    },
  });

  await writeAudit({
    actor: await getAdminEmail(),
    action: 'SETTINGS_UPDATED',
    targetType: 'SETTINGS',
    metadata: { section: 'payments' },
  });

  revalidatePath('/settings/payments');
  return { ok: true };
}

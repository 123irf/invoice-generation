'use server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { writeAudit } from '@/lib/audit';
import { getAdminEmail } from '@/lib/auth';

const schema = z.object({
  prefix: z.string(),
  suffix: z.string(),
  autoIncrement: z.boolean(),
  nextNumber: z.string(),
  validForDays: z.coerce.number().int().min(1),
  defaultTerms: z.string(),
  defaultFooter: z.string(),
  showAcceptButton: z.boolean(),
  acceptedQuoteAction: z.enum(['convert_and_send', 'convert_only', 'mark_accepted']),
  acceptQuoteText: z.string(),
  acceptedQuoteMessage: z.string(),
  declineReasonRequired: z.boolean(),
  declinedQuoteMessage: z.string(),
  notifyOnAccept: z.boolean(),
});

export async function saveQuoteSettings(formData: FormData) {
  const data = schema.parse({
    prefix: formData.get('prefix'),
    suffix: formData.get('suffix'),
    autoIncrement: formData.get('autoIncrement') === 'true',
    nextNumber: formData.get('nextNumber'),
    validForDays: formData.get('validForDays'),
    defaultTerms: formData.get('defaultTerms'),
    defaultFooter: formData.get('defaultFooter'),
    showAcceptButton: formData.get('showAcceptButton') === 'true',
    acceptedQuoteAction: formData.get('acceptedQuoteAction'),
    acceptQuoteText: formData.get('acceptQuoteText'),
    acceptedQuoteMessage: formData.get('acceptedQuoteMessage'),
    declineReasonRequired: formData.get('declineReasonRequired') === 'true',
    declinedQuoteMessage: formData.get('declinedQuoteMessage'),
    notifyOnAccept: formData.get('notifyOnAccept') === 'true',
  });

  const existing = await prisma.quoteSettings.findFirst();
  await prisma.quoteSettings.update({
    where: { id: existing!.id },
    data,
  });

  await writeAudit({
    actor: await getAdminEmail(),
    action: 'SETTINGS_UPDATED',
    targetType: 'SETTINGS',
    metadata: { section: 'quotes' },
  });

  revalidatePath('/settings/invoice-generation');
  return { ok: true };
}

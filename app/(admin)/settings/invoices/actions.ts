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
  dueDateDays: z.coerce.number().int().min(1),
  defaultTerms: z.string(),
  defaultFooter: z.string(),
  notifyOnInvoicePaid: z.boolean(),
});

export async function saveInvoiceSettings(formData: FormData) {
  const data = schema.parse({
    prefix: formData.get('prefix'),
    suffix: formData.get('suffix'),
    autoIncrement: formData.get('autoIncrement') === 'true',
    nextNumber: formData.get('nextNumber'),
    dueDateDays: formData.get('dueDateDays'),
    defaultTerms: formData.get('defaultTerms'),
    defaultFooter: formData.get('defaultFooter'),
    notifyOnInvoicePaid: formData.get('notifyOnInvoicePaid') === 'true',
  });

  const existing = await prisma.invoiceSettings.findFirst();
  await prisma.invoiceSettings.update({
    where: { id: existing!.id },
    data,
  });

  await writeAudit({
    actor: await getAdminEmail(),
    action: 'SETTINGS_UPDATED',
    targetType: 'SETTINGS',
    metadata: { section: 'invoices' },
  });

  revalidatePath('/settings/invoices');
  return { ok: true };
}

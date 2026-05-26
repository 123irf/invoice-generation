'use server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { writeAudit } from '@/lib/audit';
import { getAdminEmail } from '@/lib/auth';

const schema = z.object({
  emailAddress: z.string().email(),
  emailName: z.string().min(1),
  bccOnClientEmails: z.boolean(),
  footerText: z.string(),

  quoteAvailableSubject: z.string(),
  quoteAvailableContent: z.string(),
  quoteAvailableButton: z.string(),

  invoiceAvailableSubject: z.string(),
  invoiceAvailableContent: z.string(),
  invoiceAvailableButton: z.string(),

  paymentReceivedSubject: z.string(),
  paymentReceivedContent: z.string(),

  paymentReminderSubject: z.string(),
  paymentReminderContent: z.string(),
  paymentReminderButton: z.string(),

  reminder7DaysBefore: z.boolean(),
  reminder1DayBefore: z.boolean(),
  reminderOnDueDate: z.boolean(),
  reminder1DayAfter: z.boolean(),
  reminder7DaysAfter: z.boolean(),
  reminder14DaysAfter: z.boolean(),
  reminder21DaysAfter: z.boolean(),
  reminder30DaysAfter: z.boolean(),
});

export async function saveEmailSettings(formData: FormData) {
  const data = schema.parse({
    emailAddress: formData.get('emailAddress'),
    emailName: formData.get('emailName'),
    bccOnClientEmails: formData.get('bccOnClientEmails') === 'true',
    footerText: formData.get('footerText'),

    quoteAvailableSubject: formData.get('quoteAvailableSubject'),
    quoteAvailableContent: formData.get('quoteAvailableContent'),
    quoteAvailableButton: formData.get('quoteAvailableButton'),

    invoiceAvailableSubject: formData.get('invoiceAvailableSubject'),
    invoiceAvailableContent: formData.get('invoiceAvailableContent'),
    invoiceAvailableButton: formData.get('invoiceAvailableButton'),

    paymentReceivedSubject: formData.get('paymentReceivedSubject'),
    paymentReceivedContent: formData.get('paymentReceivedContent'),

    paymentReminderSubject: formData.get('paymentReminderSubject'),
    paymentReminderContent: formData.get('paymentReminderContent'),
    paymentReminderButton: formData.get('paymentReminderButton'),

    reminder7DaysBefore: formData.get('reminder7DaysBefore') === 'true',
    reminder1DayBefore: formData.get('reminder1DayBefore') === 'true',
    reminderOnDueDate: formData.get('reminderOnDueDate') === 'true',
    reminder1DayAfter: formData.get('reminder1DayAfter') === 'true',
    reminder7DaysAfter: formData.get('reminder7DaysAfter') === 'true',
    reminder14DaysAfter: formData.get('reminder14DaysAfter') === 'true',
    reminder21DaysAfter: formData.get('reminder21DaysAfter') === 'true',
    reminder30DaysAfter: formData.get('reminder30DaysAfter') === 'true',
  });

  const existing = await prisma.emailSettings.findFirst();
  await prisma.emailSettings.update({
    where: { id: existing!.id },
    data,
  });

  await writeAudit({
    actor: await getAdminEmail(),
    action: 'SETTINGS_UPDATED',
    targetType: 'SETTINGS',
    metadata: { section: 'emails' },
  });

  revalidatePath('/settings/emails');
  return { ok: true };
}

import { getBusinessSettings } from '@/lib/settings';
import { prisma } from '@/lib/prisma';
import { GeneralForm } from './general-form';

export default async function GeneralSettingsPage() {
  const business = await getBusinessSettings();
  const items = await prisma.predefinedLineItem.findMany({
    orderBy: { order: 'asc' },
  });

  const itemsText = items
    .map((i) => `${i.qty} | ${i.title} | ${i.rate} | ${i.description ?? ''}`)
    .join('\n');

  return (
    <GeneralForm
      fiscalYearStart={business.fiscalYearStart}
      fiscalYearEnd={business.fiscalYearEnd}
      predefinedLineItemsText={itemsText}
    />
  );
}

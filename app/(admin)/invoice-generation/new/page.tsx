import { prisma } from '@/lib/prisma';
import { getQuoteSettings, getTaxSettings } from '@/lib/settings';
import { QuoteForm } from '../quote-form';

export default async function NewQuotePage() {
  const [clients, predefinedItems, quoteSettings, taxSettings] = await Promise.all([
    prisma.client.findMany({
      select: { id: true, businessName: true, email: true },
      orderBy: { businessName: 'asc' },
    }),
    prisma.predefinedLineItem.findMany({ orderBy: { order: 'asc' } }),
    getQuoteSettings(),
    getTaxSettings(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">New Quote</h1>
      <QuoteForm
        clients={clients}
        predefinedItems={predefinedItems}
        defaults={{
          defaultTerms: quoteSettings.defaultTerms,
          defaultFooter: quoteSettings.defaultFooter,
          validForDays: quoteSettings.validForDays,
        }}
        taxSettings={{
          taxPercentage: taxSettings.taxPercentage,
          pricesEnteredWithTax: taxSettings.pricesEnteredWithTax,
          taxName: taxSettings.taxName,
        }}
      />
    </div>
  );
}

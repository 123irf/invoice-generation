import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getQuoteSettings, getTaxSettings } from '@/lib/settings';
import { QuoteForm } from '../../quote-form';

export default async function EditQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [quote, clients, predefinedItems, quoteSettings, taxSettings] = await Promise.all([
    prisma.quote.findUnique({
      where: { id },
      include: { lineItems: { orderBy: { order: 'asc' } } },
    }),
    prisma.client.findMany({
      select: { id: true, businessName: true, email: true },
      orderBy: { businessName: 'asc' },
    }),
    prisma.predefinedLineItem.findMany({ orderBy: { order: 'asc' } }),
    getQuoteSettings(),
    getTaxSettings(),
  ]);

  if (!quote) notFound();

  const initial = {
    id: quote.id,
    clientId: quote.clientId,
    title: quote.title,
    description: quote.description,
    orderNumber: quote.orderNumber,
    validUntil: quote.validUntil.toISOString().split('T')[0],
    createdDate: quote.createdDate.toISOString().split('T')[0],
    terms: quote.terms,
    footer: quote.footer,
    discount: quote.discount,
    status: quote.status,
    lineItems: quote.lineItems.map((li) => ({
      qty: li.qty,
      title: li.title,
      description: li.description,
      rate: li.rate,
      taxable: li.taxable,
    })),
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Edit Quote {quote.number}</h1>
      <QuoteForm
        initial={initial}
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

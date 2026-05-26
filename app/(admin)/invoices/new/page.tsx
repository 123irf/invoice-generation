import { prisma } from '@/lib/prisma';
import { getInvoiceSettings, getTaxSettings } from '@/lib/settings';
import { InvoiceForm } from '../invoice-form';

export default async function NewInvoicePage() {
  const [clients, predefinedItems, invoiceSettings, taxSettings] = await Promise.all([
    prisma.client.findMany({
      select: { id: true, businessName: true, email: true },
      orderBy: { businessName: 'asc' },
    }),
    prisma.predefinedLineItem.findMany({ orderBy: { order: 'asc' } }),
    getInvoiceSettings(),
    getTaxSettings(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">New Invoice</h1>
      <InvoiceForm
        clients={clients}
        predefinedItems={predefinedItems}
        defaults={{
          defaultTerms: invoiceSettings.defaultTerms,
          defaultFooter: invoiceSettings.defaultFooter,
          dueDateDays: invoiceSettings.dueDateDays,
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

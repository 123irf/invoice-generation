import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getInvoiceSettings, getTaxSettings } from '@/lib/settings';
import { InvoiceForm } from '../../invoice-form';

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [invoice, clients, predefinedItems, invoiceSettings, taxSettings] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: { lineItems: { orderBy: { order: 'asc' } } },
    }),
    prisma.client.findMany({
      select: { id: true, businessName: true, email: true },
      orderBy: { businessName: 'asc' },
    }),
    prisma.predefinedLineItem.findMany({ orderBy: { order: 'asc' } }),
    getInvoiceSettings(),
    getTaxSettings(),
  ]);

  if (!invoice) notFound();

  const initial = {
    id: invoice.id,
    clientId: invoice.clientId,
    title: invoice.title,
    description: invoice.description,
    orderNumber: invoice.orderNumber,
    dueDate: invoice.dueDate.toISOString().split('T')[0],
    createdDate: invoice.createdDate.toISOString().split('T')[0],
    terms: invoice.terms,
    footer: invoice.footer,
    discount: invoice.discount,
    status: invoice.status,
    lineItems: invoice.lineItems.map((li) => ({
      qty: li.qty,
      title: li.title,
      description: li.description,
      rate: li.rate,
      taxable: li.taxable,
    })),
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Edit Invoice {invoice.number}</h1>
      <InvoiceForm
        initial={initial}
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

import { renderToBuffer } from '@react-pdf/renderer';
import { prisma } from './prisma';
import {
  getBusinessSettings,
  getPaymentSettings,
  getTaxSettings,
  getTranslateSettings,
} from './settings';
import { toPublicQuoteDTO, toPublicInvoiceDTO } from './public-dto';
import { DocumentPdf } from '@/components/pdf/document-pdf';

export async function generateQuotePdf(quoteId: string): Promise<Buffer> {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { client: true, lineItems: true },
  });
  if (!quote) throw new Error('Quote not found');

  const [business, paymentSettings, taxSettings, labels] = await Promise.all([
    getBusinessSettings(),
    getPaymentSettings(),
    getTaxSettings(),
    getTranslateSettings(),
  ]);
  const dto = toPublicQuoteDTO(quote, business, paymentSettings, taxSettings, labels);
  return Buffer.from(await renderToBuffer(<DocumentPdf kind="quote" dto={dto} />));
}

export async function generateInvoicePdf(invoiceId: string): Promise<Buffer> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { client: true, lineItems: true, payments: { where: { status: 'COMPLETED' } } },
  });
  if (!invoice) throw new Error('Invoice not found');

  const [business, paymentSettings, taxSettings, labels] = await Promise.all([
    getBusinessSettings(),
    getPaymentSettings(),
    getTaxSettings(),
    getTranslateSettings(),
  ]);
  const dto = toPublicInvoiceDTO(invoice, business, paymentSettings, taxSettings, labels);
  return Buffer.from(await renderToBuffer(<DocumentPdf kind="invoice" dto={dto} />));
}

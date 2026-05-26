import { sanitizeHTML } from './sanitize';

// ============================================================
// Invoice DTO
// ============================================================

interface InvoiceWithRelations {
  id: string;
  number: string;
  publicToken: string;
  title: string | null;
  description: string | null;
  status: string;
  dueDate: Date;
  createdDate: Date;
  subtotal: number;
  taxPercentage: number;
  taxAmount: number;
  discount: number;
  paid: number;
  totalDue: number;
  total: number;
  terms: string | null;
  footer: string | null;
  client: any;
  lineItems: any[];
  payments: Array<{
    date: Date;
    amount: number;
    method: string;
    paymentId: string | null;
  }>;
}

export function toPublicInvoiceDTO(
  invoice: InvoiceWithRelations,
  business: any,
  paymentSettings: any,
  taxSettings: any,
  labels: any
) {
  // Compute display status (OVERDUE on the fly)
  let displayStatus = invoice.status;
  if (invoice.status === 'SENT' && invoice.dueDate < new Date()) {
    displayStatus = 'OVERDUE';
  }

  return {
    number: invoice.number,
    title: invoice.title,
    description: sanitizeHTML(invoice.description),
    status: displayStatus,
    rawStatus: invoice.status,
    dueDate: invoice.dueDate.toISOString(),
    createdDate: invoice.createdDate.toISOString(),
    subtotal: invoice.subtotal,
    taxPercentage: invoice.taxPercentage,
    taxAmount: invoice.taxAmount,
    discount: invoice.discount,
    paid: invoice.paid,
    totalDue: invoice.totalDue,
    total: invoice.total,
    terms: sanitizeHTML(invoice.terms),
    footer: sanitizeHTML(invoice.footer),
    lineItems: invoice.lineItems
      .sort((a, b) => a.order - b.order)
      .map((li) => ({
        qty: li.qty,
        title: li.title,
        description: li.description,
        rate: li.rate,
        amount: li.amount,
        taxable: li.taxable,
      })),
    payments: invoice.payments.map((p) => ({
      date: p.date.toISOString(),
      amount: p.amount,
      method: p.method,
      paymentId: p.paymentId,
    })),
    client: {
      businessName: invoice.client.businessName,
      firstName: invoice.client.firstName,
      lastName: invoice.client.lastName,
      email: invoice.client.email,
      address: sanitizeHTML(invoice.client.address),
      extraInfo: sanitizeHTML(invoice.client.extraInfo),
      website: invoice.client.website,
    },
    business: {
      name: business.name,
      logoUrl: business.logoUrl,
      address: sanitizeHTML(business.address),
      extraInfo: sanitizeHTML(business.extraInfo),
      website: business.website,
    },
    paymentInfo: sanitizeHTML(paymentSettings.genericPayment),
    bankDetails: sanitizeHTML(paymentSettings.bankDetails),
    taxName: taxSettings.taxName,
    labels,
  };
}

// ============================================================
// Quote DTO
// ============================================================

interface QuoteWithRelations {
  id: string;
  number: string;
  publicToken: string;
  title: string | null;
  description: string | null;
  status: string;
  validUntil: Date;
  createdDate: Date;
  subtotal: number;
  taxPercentage: number;
  taxAmount: number;
  discount: number;
  total: number;
  terms: string | null;
  footer: string | null;
  declineReason: string | null;
  client: {
    businessName: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    phone: string | null;
    address: string | null;
    extraInfo: string | null;
    website: string | null;
  };
  lineItems: Array<{
    qty: number;
    title: string;
    description: string | null;
    rate: number;
    amount: number;
    taxable: boolean;
    order: number;
  }>;
}

export function toPublicQuoteDTO(
  quote: QuoteWithRelations,
  business: { name: string; logoUrl: string | null; address: string; extraInfo: string; website: string },
  paymentSettings: { genericPayment: string; bankDetails: string | null },
  taxSettings: { taxName: string; taxPercentage: number },
  labels: { quoteLabel: string; subTotalLabel: string; discountLabel: string; totalLabel: string; totalDueLabel: string; hrsQtyLabel: string; serviceLabel: string; ratePriceLabel: string }
) {
  return {
    number: quote.number,
    title: quote.title,
    description: sanitizeHTML(quote.description),
    status: quote.status,
    validUntil: quote.validUntil.toISOString(),
    createdDate: quote.createdDate.toISOString(),
    subtotal: quote.subtotal,
    taxPercentage: quote.taxPercentage,
    taxAmount: quote.taxAmount,
    discount: quote.discount,
    total: quote.total,
    terms: sanitizeHTML(quote.terms),
    footer: sanitizeHTML(quote.footer),
    lineItems: quote.lineItems
      .sort((a, b) => a.order - b.order)
      .map((li) => ({
        qty: li.qty,
        title: li.title,
        description: li.description,
        rate: li.rate,
        amount: li.amount,
        taxable: li.taxable,
      })),
    client: {
      businessName: quote.client.businessName,
      firstName: quote.client.firstName,
      lastName: quote.client.lastName,
      email: quote.client.email,
      address: sanitizeHTML(quote.client.address),
      extraInfo: sanitizeHTML(quote.client.extraInfo),
      website: quote.client.website,
    },
    business: {
      name: business.name,
      logoUrl: business.logoUrl,
      address: sanitizeHTML(business.address),
      extraInfo: sanitizeHTML(business.extraInfo),
      website: business.website,
    },
    paymentInfo: sanitizeHTML(paymentSettings.genericPayment),
    bankDetails: sanitizeHTML(paymentSettings.bankDetails),
    taxName: taxSettings.taxName,
    labels,
  };
}

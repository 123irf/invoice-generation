interface WildcardContext {
  client?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string;
    businessName?: string;
  };
  number?: string;
  link?: string;
  total?: string;
  validUntil?: string;
  dueDate?: string;
  lastPayment?: string;
  totalPaid?: string;
  totalOwed?: string;
  isOverdue?: boolean;
}

export function renderWildcards(template: string, ctx: WildcardContext): string {
  if (!template) return '';
  return template.replace(/%(\w+)%/g, (match, key) => {
    switch (key) {
      case 'client_first_name': return ctx.client?.firstName ?? '';
      case 'client_last_name':  return ctx.client?.lastName ?? '';
      case 'client_email':      return ctx.client?.email ?? '';
      case 'client_business_name': return ctx.client?.businessName ?? '';
      case 'number':            return ctx.number ?? '';
      case 'link':              return ctx.link ?? '';
      case 'total':             return ctx.total ?? '';
      case 'valid_until':       return ctx.validUntil ?? '';
      case 'due_date':          return ctx.dueDate ?? '';
      case 'last_payment':      return ctx.lastPayment ?? '';
      case 'total_paid':        return ctx.totalPaid ?? '';
      case 'total_owed':        return ctx.totalOwed ?? '';
      case 'is_was':            return ctx.isOverdue ? 'was' : 'is';
      default:                  return match; // leave unknown wildcards untouched
    }
  });
}

export const SUPPORTED_WILDCARDS = [
  { tag: '%client_first_name%', desc: "Client's first name" },
  { tag: '%client_last_name%', desc: "Client's last name" },
  { tag: '%client_email%', desc: "Client's email" },
  { tag: '%client_business_name%', desc: "Client's business name" },
  { tag: '%number%', desc: 'Quote/invoice number' },
  { tag: '%link%', desc: 'Public link to the quote/invoice' },
  { tag: '%total%', desc: 'Total amount (formatted)' },
  { tag: '%valid_until%', desc: 'Quote valid-until date' },
  { tag: '%due_date%', desc: 'Invoice due date' },
  { tag: '%last_payment%', desc: 'Last payment amount' },
  { tag: '%total_paid%', desc: 'Amount paid' },
  { tag: '%total_owed%', desc: 'Amount still owed' },
  { tag: '%is_was%', desc: 'Resolves to "is" or "was" depending on due date' },
];

import { Resend } from 'resend';
import { prisma } from './prisma';
import { renderWildcards } from './wildcards';
import { renderEmailHtml } from '@/emails/base-email';
import {
  getEmailSettings,
  getBusinessSettings,
} from './settings';
import { formatCurrency, formatDate } from './currency';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

type TemplateKey =
  | 'quoteAvailable'
  | 'invoiceAvailable'
  | 'paymentReceived'
  | 'paymentReminder';

interface SendOptions {
  templateKey: TemplateKey;
  to: string;
  context: any;
}

export async function sendTemplatedEmail({ templateKey, to, context }: SendOptions) {
  if (!resend) {
    console.warn('Resend not configured — skipping email send for', templateKey, 'to', to);
    return { ok: false, error: 'Resend not configured' };
  }

  const [emailSettings, business] = await Promise.all([
    getEmailSettings(),
    getBusinessSettings(),
  ]);

  // Pick the right template fields
  let subject = '';
  let content = '';
  let buttonText: string | undefined;
  switch (templateKey) {
    case 'quoteAvailable':
      subject = emailSettings.quoteAvailableSubject;
      content = emailSettings.quoteAvailableContent;
      buttonText = emailSettings.quoteAvailableButton;
      break;
    case 'invoiceAvailable':
      subject = emailSettings.invoiceAvailableSubject;
      content = emailSettings.invoiceAvailableContent;
      buttonText = emailSettings.invoiceAvailableButton;
      break;
    case 'paymentReceived':
      subject = emailSettings.paymentReceivedSubject;
      content = emailSettings.paymentReceivedContent;
      break;
    case 'paymentReminder':
      subject = emailSettings.paymentReminderSubject;
      content = emailSettings.paymentReminderContent;
      buttonText = emailSettings.paymentReminderButton;
      break;
  }

  const renderedSubject = renderWildcards(subject, context);
  const renderedContent = renderWildcards(content, context);
  const renderedButtonText = buttonText ? renderWildcards(buttonText, context) : undefined;

  const greeting = `Hi ${context.client?.firstName ?? context.client?.businessName ?? 'there'},`;

  const html = renderEmailHtml({
    greeting,
    bodyText: renderedContent,
    buttonText: renderedButtonText,
    buttonUrl: context.link,
    footerText: emailSettings.footerText,
    businessName: business.name,
  });

  const from = `${emailSettings.emailName} <${emailSettings.emailAddress}>`;
  const bcc = emailSettings.bccOnClientEmails ? emailSettings.emailAddress : undefined;

  try {
    const response = await resend.emails.send({
      from,
      to,
      bcc,
      subject: renderedSubject,
      html,
    });

    await prisma.emailLog.create({
      data: {
        templateKey,
        to,
        bcc,
        subject: renderedSubject,
        status: 'SENT',
        resendId: response.data?.id,
      },
    });

    return { ok: true, id: response.data?.id };
  } catch (e: any) {
    await prisma.emailLog.create({
      data: {
        templateKey,
        to,
        bcc,
        subject: renderedSubject,
        status: 'FAILED',
        errorMsg: e.message ?? String(e),
      },
    });
    return { ok: false, error: e.message };
  }
}

// Helpers to build context from DB objects

export function buildQuoteContext(quote: any, publicLink: string) {
  return {
    client: {
      firstName: quote.client.firstName,
      lastName: quote.client.lastName,
      email: quote.client.email,
      businessName: quote.client.businessName,
    },
    number: quote.number,
    link: publicLink,
    total: formatCurrency(quote.total),
    validUntil: formatDate(quote.validUntil),
  };
}

export function buildInvoiceContext(invoice: any, publicLink: string, lastPaymentAmount?: number) {
  const now = new Date();
  return {
    client: {
      firstName: invoice.client.firstName,
      lastName: invoice.client.lastName,
      email: invoice.client.email,
      businessName: invoice.client.businessName,
    },
    number: invoice.number,
    link: publicLink,
    total: formatCurrency(invoice.total),
    dueDate: formatDate(invoice.dueDate),
    totalPaid: formatCurrency(invoice.paid),
    totalOwed: formatCurrency(invoice.totalDue),
    lastPayment: lastPaymentAmount ? formatCurrency(lastPaymentAmount) : '',
    isOverdue: invoice.dueDate < now,
  };
}

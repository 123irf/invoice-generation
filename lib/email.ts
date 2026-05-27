import nodemailer from 'nodemailer';
import { prisma } from './prisma';
import { renderWildcards } from './wildcards';
import { renderEmailHtml } from '@/emails/base-email';
import {
  getEmailSettings,
  getBusinessSettings,
} from './settings';
import { formatCurrency, formatDate } from './currency';

const transporter =
  process.env.SMTP_USER && process.env.SMTP_PASS
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
    : null;

type TemplateKey =
  | 'quoteAvailable'
  | 'invoiceAvailable'
  | 'paymentReceived'
  | 'paymentReminder';

interface Attachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

interface SendOptions {
  templateKey: TemplateKey;
  to: string;
  context: any;
  attachments?: Attachment[];
}

export async function sendTemplatedEmail({ templateKey, to, context, attachments }: SendOptions) {
  if (!transporter) {
    console.warn('SMTP not configured — skipping email send for', templateKey, 'to', to);
    return { ok: false, error: 'SMTP not configured (set SMTP_USER and SMTP_PASS)' };
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

  const from = `${emailSettings.emailName} <${process.env.SMTP_USER}>`;
  const bcc = emailSettings.bccOnClientEmails ? process.env.SMTP_USER : undefined;

  try {
    const info = await transporter.sendMail({
      from,
      to,
      bcc,
      subject: renderedSubject,
      html,
      attachments: attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType ?? 'application/pdf',
      })),
    });

    await prisma.emailLog.create({
      data: {
        templateKey,
        to,
        bcc,
        subject: renderedSubject,
        status: 'SENT',
        resendId: info.messageId,
      },
    });

    return { ok: true, id: info.messageId };
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

import type { PrismaClient } from '@/lib/generated/prisma/client';

type TransactionClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

export async function getNextQuoteNumber(tx: TransactionClient): Promise<string> {
  const settings = await tx.quoteSettings.findFirst();
  if (!settings) throw new Error('QuoteSettings not initialized');
  const currentStr = settings.nextNumber;
  const formatted = `${settings.prefix}${currentStr}${settings.suffix}`;

  const width = currentStr.length;
  const nextInt = parseInt(currentStr, 10) + 1;
  const nextStr = String(nextInt).padStart(width, '0');

  await tx.quoteSettings.update({
    where: { id: settings.id },
    data: { nextNumber: nextStr },
  });

  return formatted;
}

export async function getNextInvoiceNumber(tx: TransactionClient): Promise<string> {
  const settings = await tx.invoiceSettings.findFirst();
  if (!settings) throw new Error('InvoiceSettings not initialized');
  const currentStr = settings.nextNumber;
  const formatted = `${settings.prefix}${currentStr}${settings.suffix}`;
  const width = currentStr.length;
  const nextInt = parseInt(currentStr, 10) + 1;
  const nextStr = String(nextInt).padStart(width, '0');
  await tx.invoiceSettings.update({
    where: { id: settings.id },
    data: { nextNumber: nextStr },
  });
  return formatted;
}

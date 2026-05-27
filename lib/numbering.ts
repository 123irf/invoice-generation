import { prisma } from '@/lib/prisma';

export async function getNextQuoteNumber(): Promise<string> {
  const settings = await prisma.quoteSettings.findFirst();
  if (!settings) throw new Error('QuoteSettings not initialized');
  const currentStr = settings.nextNumber;
  const formatted = `${settings.prefix}${currentStr}${settings.suffix}`;

  const width = currentStr.length;
  const nextInt = parseInt(currentStr, 10) + 1;
  const nextStr = String(nextInt).padStart(width, '0');

  await prisma.quoteSettings.update({
    where: { id: settings.id },
    data: { nextNumber: nextStr },
  });

  return formatted;
}

export async function getNextInvoiceNumber(): Promise<string> {
  const settings = await prisma.invoiceSettings.findFirst();
  if (!settings) throw new Error('InvoiceSettings not initialized');
  const currentStr = settings.nextNumber;
  const formatted = `${settings.prefix}${currentStr}${settings.suffix}`;
  const width = currentStr.length;
  const nextInt = parseInt(currentStr, 10) + 1;
  const nextStr = String(nextInt).padStart(width, '0');
  await prisma.invoiceSettings.update({
    where: { id: settings.id },
    data: { nextNumber: nextStr },
  });
  return formatted;
}

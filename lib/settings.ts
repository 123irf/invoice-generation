import { prisma } from './prisma';

export async function getBusinessSettings() {
  let s = await prisma.businessSettings.findFirst();
  if (!s) s = await prisma.businessSettings.create({ data: {} });
  return s;
}

export async function getQuoteSettings() {
  let s = await prisma.quoteSettings.findFirst();
  if (!s) s = await prisma.quoteSettings.create({ data: {} });
  return s;
}

export async function getInvoiceSettings() {
  let s = await prisma.invoiceSettings.findFirst();
  if (!s) s = await prisma.invoiceSettings.create({ data: {} });
  return s;
}

export async function getPaymentSettings() {
  let s = await prisma.paymentSettings.findFirst();
  if (!s) s = await prisma.paymentSettings.create({ data: {} });
  return s;
}

export async function getTaxSettings() {
  let s = await prisma.taxSettings.findFirst();
  if (!s) s = await prisma.taxSettings.create({ data: {} });
  return s;
}

export async function getEmailSettings() {
  let s = await prisma.emailSettings.findFirst();
  if (!s) s = await prisma.emailSettings.create({ data: {} });
  return s;
}

export async function getTranslateSettings() {
  let s = await prisma.translateSettings.findFirst();
  if (!s) s = await prisma.translateSettings.create({ data: {} });
  return s;
}

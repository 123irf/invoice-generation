import { renderToBuffer } from '@react-pdf/renderer';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getBusinessSettings,
  getPaymentSettings,
  getTaxSettings,
  getTranslateSettings,
} from '@/lib/settings';
import { toPublicInvoiceDTO } from '@/lib/public-dto';
import { DocumentPdf } from '@/components/pdf/document-pdf';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ip = await getClientIp();
  if (!rateLimit(`pdf:${ip}`).ok) return new Response('Rate limited', { status: 429 });

  const invoice = await prisma.invoice.findUnique({
    where: { publicToken: token },
    include: {
      client: true,
      lineItems: true,
      payments: { where: { status: 'COMPLETED' } },
    },
  });
  if (!invoice) return new Response('Not found', { status: 404 });

  const [business, paymentSettings, taxSettings, labels] = await Promise.all([
    getBusinessSettings(),
    getPaymentSettings(),
    getTaxSettings(),
    getTranslateSettings(),
  ]);
  const dto = toPublicInvoiceDTO(invoice, business, paymentSettings, taxSettings, labels);

  const buffer = await renderToBuffer(<DocumentPdf kind="invoice" dto={dto} />);
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${invoice.number}.pdf"`,
    },
  });
}

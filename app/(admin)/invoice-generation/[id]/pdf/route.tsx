import { renderToBuffer } from '@react-pdf/renderer';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getBusinessSettings,
  getPaymentSettings,
  getTaxSettings,
  getTranslateSettings,
} from '@/lib/settings';
import { toPublicQuoteDTO } from '@/lib/public-dto';
import { DocumentPdf } from '@/components/pdf/document-pdf';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { client: true, lineItems: true },
  });
  if (!quote) return new Response('Not found', { status: 404 });

  const [business, paymentSettings, taxSettings, labels] = await Promise.all([
    getBusinessSettings(),
    getPaymentSettings(),
    getTaxSettings(),
    getTranslateSettings(),
  ]);
  const dto = toPublicQuoteDTO(quote, business, paymentSettings, taxSettings, labels);

  const buffer = await renderToBuffer(<DocumentPdf kind="quote" dto={dto} />);
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${quote.number}.pdf"`,
    },
  });
}

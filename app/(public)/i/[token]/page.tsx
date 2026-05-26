import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import {
  getBusinessSettings,
  getPaymentSettings,
  getTaxSettings,
  getTranslateSettings,
} from '@/lib/settings';
import { toPublicInvoiceDTO } from '@/lib/public-dto';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { PublicInvoiceView } from '@/components/public/public-invoice-view';

export const dynamic = 'force-dynamic';

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const ip = await getClientIp();
  const rl = rateLimit(`i:${ip}`);
  if (!rl.ok) {
    return (
      <div className="bg-white p-8 rounded-lg shadow text-red-600">
        Too many requests. Try again in a minute.
      </div>
    );
  }

  const invoice = await prisma.invoice.findUnique({
    where: { publicToken: token },
    include: {
      client: true,
      lineItems: true,
      payments: { where: { status: 'COMPLETED' }, orderBy: { date: 'desc' } },
    },
  });
  if (!invoice) notFound();

  const [business, paymentSettings, taxSettings, labels] = await Promise.all([
    getBusinessSettings(),
    getPaymentSettings(),
    getTaxSettings(),
    getTranslateSettings(),
  ]);

  const dto = toPublicInvoiceDTO(invoice, business, paymentSettings, taxSettings, labels);

  return <PublicInvoiceView token={token} dto={dto} />;
}

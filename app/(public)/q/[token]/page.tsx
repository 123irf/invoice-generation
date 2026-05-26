import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getBusinessSettings, getPaymentSettings, getTaxSettings, getQuoteSettings, getTranslateSettings } from '@/lib/settings';
import { toPublicQuoteDTO } from '@/lib/public-dto';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { PublicQuoteView } from '@/components/public/public-quote-view';

export const dynamic = 'force-dynamic';

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const ip = await getClientIp();
  const rl = rateLimit(`q:${ip}`);
  if (!rl.ok) {
    return <div className="bg-white p-8 rounded-lg shadow text-red-600">Too many requests. Try again in a minute.</div>;
  }

  const quote = await prisma.quote.findUnique({
    where: { publicToken: token },
    include: { client: true, lineItems: true },
  });
  if (!quote) notFound();

  const [business, paymentSettings, taxSettings, quoteSettings, labels] = await Promise.all([
    getBusinessSettings(),
    getPaymentSettings(),
    getTaxSettings(),
    getQuoteSettings(),
    getTranslateSettings(),
  ]);

  const dto = toPublicQuoteDTO(quote, business, paymentSettings, taxSettings, labels);

  return (
    <PublicQuoteView
      token={token}
      dto={dto}
      acceptText={quoteSettings.acceptQuoteText}
      declineReasonRequired={quoteSettings.declineReasonRequired}
      showAcceptButton={quoteSettings.showAcceptButton}
    />
  );
}

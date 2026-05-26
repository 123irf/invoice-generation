import { prisma } from '@/lib/prisma';
import { getQuoteSettings } from '@/lib/settings';
import { sanitizeHTML } from '@/lib/sanitize';

export default async function DeclinedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const settings = await getQuoteSettings();
  const message = settings.declinedQuoteMessage || 'You have declined the Quote.<br>We will be in touch shortly.';

  return (
    <div className="bg-white rounded-lg shadow-lg p-12 text-center">
      <h1 className="text-2xl font-bold mb-4">Quote Declined</h1>
      <div className="text-slate-700" dangerouslySetInnerHTML={{ __html: sanitizeHTML(message) }} />
    </div>
  );
}

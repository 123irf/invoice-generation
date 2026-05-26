import { prisma } from '@/lib/prisma';
import { getQuoteSettings } from '@/lib/settings';
import { sanitizeHTML } from '@/lib/sanitize';

export default async function AcceptedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const quote = await prisma.quote.findUnique({ where: { publicToken: token } });
  const settings = await getQuoteSettings();
  const message = settings.acceptedQuoteMessage || 'You have accepted the Quote.<br>We will be in touch shortly.';

  return (
    <div className="bg-white rounded-lg shadow-lg p-12 text-center">
      <div className="text-green-600 text-5xl mb-4">&#10003;</div>
      <h1 className="text-2xl font-bold mb-4">Quote Accepted</h1>
      <div className="text-slate-700" dangerouslySetInnerHTML={{ __html: sanitizeHTML(message) }} />
    </div>
  );
}

import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { formatCurrency } from '@/lib/currency';

export default async function PaidPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { publicToken: token },
  });
  if (!invoice) notFound();

  return (
    <div className="bg-white rounded-lg shadow-lg p-12 text-center">
      <div className="text-green-600 text-5xl mb-4">&#10003;</div>
      <h1 className="text-2xl font-bold mb-2">Payment Successful</h1>
      <p className="text-slate-700 mb-4">
        Your payment of {formatCurrency(invoice.total)} for invoice {invoice.number} has been
        received.
      </p>
      <p className="text-sm text-slate-500">
        A receipt has been emailed to you.
      </p>
    </div>
  );
}

import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { startOfMonth, endOfMonth } from 'date-fns';
import { Card } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatCurrency, formatDate } from '@/lib/currency';
import { FileText, Receipt, AlertCircle, TrendingUp, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [
    quotesPending,
    invoicesUnpaid,
    overdueInvoices,
    collectedThisMonthAgg,
    recentQuotes,
    recentInvoices,
  ] = await Promise.all([
    prisma.quote.count({ where: { status: 'SENT' } }),
    prisma.invoice.count({ where: { status: { in: ['SENT', 'PARTIAL'] } } }),
    prisma.invoice.count({
      where: { status: { in: ['SENT', 'PARTIAL'] }, dueDate: { lt: now } },
    }),
    prisma.payment.aggregate({
      where: {
        status: 'COMPLETED',
        date: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    }),
    prisma.quote.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { client: true },
    }),
    prisma.invoice.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { client: true },
    }),
  ]);

  const collectedThisMonth = collectedThisMonthAgg._sum.amount ?? 0;

  return (
    <div>
      {/* Header + quick actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <div className="flex gap-2">
          <Link href="/clients" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
            <Plus className="h-4 w-4 mr-1" /> Client
          </Link>
          <Link href="/quotes/new" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
            <Plus className="h-4 w-4 mr-1" /> Quote
          </Link>
          <Link href="/invoices/new" className={cn(buttonVariants({ size: 'sm' }))}>
            <Plus className="h-4 w-4 mr-1" /> Invoice
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<FileText className="h-5 w-5" />}
          label="Quotes Pending"
          value={quotesPending}
          href="/quotes?status=SENT"
          color="blue"
        />
        <StatCard
          icon={<Receipt className="h-5 w-5" />}
          label="Invoices Unpaid"
          value={invoicesUnpaid}
          href="/invoices?status=SENT"
          color="amber"
        />
        <StatCard
          icon={<AlertCircle className="h-5 w-5" />}
          label="Overdue"
          value={overdueInvoices}
          href="/invoices?status=OVERDUE"
          color="red"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Collected This Month"
          value={formatCurrency(collectedThisMonth)}
          color="green"
        />
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Recent Quotes</h2>
            <Link href="/quotes" className="text-sm text-slate-600 hover:text-slate-900">
              View all →
            </Link>
          </div>
          {recentQuotes.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">No quotes yet</p>
          ) : (
            <ul className="space-y-2">
              {recentQuotes.map((q) => (
                <li key={q.id} className="flex items-center justify-between text-sm border-t pt-2 first:border-t-0 first:pt-0">
                  <div className="min-w-0 flex-1">
                    <Link href={`/quotes/${q.id}`} className="font-medium hover:underline truncate block">
                      {q.number} — {q.client.businessName}
                    </Link>
                    <div className="text-xs text-slate-500">{formatDate(q.createdDate)}</div>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    <StatusBadge status={q.status} kind="quote" />
                    <span className="font-medium text-slate-900 tabular-nums">
                      {formatCurrency(q.total)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Recent Invoices</h2>
            <Link href="/invoices" className="text-sm text-slate-600 hover:text-slate-900">
              View all →
            </Link>
          </div>
          {recentInvoices.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">No invoices yet</p>
          ) : (
            <ul className="space-y-2">
              {recentInvoices.map((inv) => {
                const displayStatus =
                  inv.status === 'SENT' && inv.dueDate < now ? 'OVERDUE' : inv.status;
                return (
                  <li key={inv.id} className="flex items-center justify-between text-sm border-t pt-2 first:border-t-0 first:pt-0">
                    <div className="min-w-0 flex-1">
                      <Link href={`/invoices/${inv.id}`} className="font-medium hover:underline truncate block">
                        {inv.number} — {inv.client.businessName}
                      </Link>
                      <div className="text-xs text-slate-500">
                        Due {formatDate(inv.dueDate)} · Paid {formatCurrency(inv.paid)} of {formatCurrency(inv.total)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-3">
                      <StatusBadge status={displayStatus} kind="invoice" />
                      <span className="font-medium text-slate-900 tabular-nums">
                        {formatCurrency(inv.totalDue)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  href,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  href?: string;
  color: 'blue' | 'amber' | 'red' | 'green';
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    green: 'bg-green-50 text-green-700',
  };

  const inner = (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-md flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-slate-500">{label}</div>
          <div className="text-xl font-bold text-slate-900 truncate">{value}</div>
        </div>
      </div>
    </Card>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}

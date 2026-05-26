import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { formatCurrency, formatDate } from '@/lib/currency';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { computeDisplayStatus } from './actions';

const TABS = ['ALL', 'DRAFT', 'SENT', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED'] as const;

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const activeTab = params.tab ?? 'ALL';
  const search = params.search ?? '';
  const page = parseInt(params.page ?? '1', 10);
  const perPage = 20;

  // Build Prisma where clause for search
  const searchWhere = search
    ? {
        OR: [
          { number: { contains: search, mode: 'insensitive' as const } },
          { title: { contains: search, mode: 'insensitive' as const } },
          { client: { businessName: { contains: search, mode: 'insensitive' as const } } },
        ],
      }
    : {};

  // For DB-level status filtering (all except OVERDUE which is computed)
  const statusWhere =
    activeTab === 'ALL' || activeTab === 'OVERDUE'
      ? {}
      : { status: activeTab as never };

  const [invoices, totalCount] = await Promise.all([
    prisma.invoice.findMany({
      where: { ...searchWhere, ...statusWhere },
      include: { client: { select: { businessName: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage + 50, // fetch extra for OVERDUE filtering
    }),
    prisma.invoice.count({ where: { ...searchWhere, ...statusWhere } }),
  ]);

  // Compute display status for each invoice
  const invoicesWithStatus = invoices.map((inv) => ({
    ...inv,
    displayStatus: computeDisplayStatus(inv),
  }));

  // Apply OVERDUE filter client-side
  const filtered =
    activeTab === 'OVERDUE'
      ? invoicesWithStatus.filter((inv) => inv.displayStatus === 'OVERDUE')
      : invoicesWithStatus;

  const displayed = filtered.slice(0, perPage);
  const totalPages = Math.ceil(
    (activeTab === 'OVERDUE' ? filtered.length : totalCount) / perPage
  );

  // Compute tab counts
  const allInvoices = await prisma.invoice.findMany({
    select: { status: true, dueDate: true },
  });
  const allWithDisplay = allInvoices.map((inv) => ({
    ...inv,
    displayStatus: computeDisplayStatus(inv),
  }));
  const counts: Record<string, number> = { ALL: allInvoices.length };
  for (const tab of TABS) {
    if (tab === 'ALL') continue;
    counts[tab] = allWithDisplay.filter((inv) => inv.displayStatus === tab).length;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
        <Link href="/invoices/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
        </Link>
      </div>

      {/* Search */}
      <form className="mb-4">
        <input type="hidden" name="tab" value={activeTab} />
        <Input
          name="search"
          placeholder="Search invoices..."
          defaultValue={search}
          className="max-w-sm"
        />
      </form>

      {/* Status Tabs */}
      <div className="flex gap-1 mb-6 border-b">
        {TABS.map((tab) => (
          <Link
            key={tab}
            href={`/invoices?tab=${tab}${search ? `&search=${search}` : ''}`}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab} ({counts[tab] ?? 0})
          </Link>
        ))}
      </div>

      {/* Invoice List */}
      {displayed.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          No invoices found.{' '}
          <Link href="/invoices/new" className="text-blue-600 hover:underline">
            Create your first invoice
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Number</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Client</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Total</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Due</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((inv) => (
                <tr key={inv.id} className="border-b last:border-b-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/invoices/${inv.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                      {inv.number}
                    </Link>
                    {inv.title && <div className="text-xs text-slate-500">{inv.title}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{inv.client.businessName}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={inv.displayStatus} kind="invoice" />
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    <div>{formatDate(inv.createdDate)}</div>
                    <div className="text-xs text-slate-400">Due: {formatDate(inv.dueDate)}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(inv.total)}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(inv.totalDue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/invoices?tab=${activeTab}${search ? `&search=${search}` : ''}&page=${p}`}
              className={`px-3 py-1 text-sm rounded border ${
                p === page
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

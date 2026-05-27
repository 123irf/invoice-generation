import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { formatCurrency, formatDate } from '@/lib/currency';
import { StatusBadge } from '@/components/shared/status-badge';
import { getCurrentClientId, isAdmin } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Filter } from 'lucide-react';
import { QuoteRowActions } from './row-actions';
import { InvoiceRowActions } from '@/app/(admin)/invoices/row-actions';
import { computeDisplayStatus } from '@/app/(admin)/invoices/utils';

const QUOTE_TABS = ['ALL', 'DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED', 'CONVERTED'] as const;
const INVOICE_TABS = ['ALL', 'DRAFT', 'SENT', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED'] as const;

export default async function InvoiceGenerationPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; tab?: string; search?: string; page?: string; clientFilter?: string; dateFilter?: string }>;
}) {
  const params = await searchParams;
  const admin = await isAdmin();

  // Admins default to quotations; clients default to invoices
  const activeType = params.type === 'invoices' ? 'invoices'
    : params.type === 'quotations' ? 'quotations'
    : admin ? 'quotations' : 'invoices';

  const activeTab = params.tab ?? 'ALL';
  const search = params.search ?? '';
  const page = parseInt(params.page ?? '1', 10);
  const perPage = 5;
  const clientFilter = params.clientFilter ?? '';
  const dateFilter = params.dateFilter ?? '';

  const clientId = await getCurrentClientId();
  const clientWhere = clientId ? { clientId } : {};

  // Client filter (admin picks a specific client)
  const clientFilterWhere = clientFilter ? { clientId: clientFilter } : {};

  // Date filter
  const now = new Date();
  let dateFilterWhere: Record<string, unknown> = {};
  if (dateFilter === 'this_month') {
    dateFilterWhere = { createdDate: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } };
  } else if (dateFilter === 'last_month') {
    dateFilterWhere = {
      createdDate: {
        gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        lt: new Date(now.getFullYear(), now.getMonth(), 1),
      },
    };
  } else if (dateFilter === 'this_year') {
    dateFilterWhere = { createdDate: { gte: new Date(now.getFullYear(), 0, 1) } };
  } else if (dateFilter === 'last_year') {
    dateFilterWhere = {
      createdDate: {
        gte: new Date(now.getFullYear() - 1, 0, 1),
        lt: new Date(now.getFullYear(), 0, 1),
      },
    };
  }

  const searchWhere = search
    ? {
        OR: [
          { number: { contains: search, mode: 'insensitive' as const } },
          { title: { contains: search, mode: 'insensitive' as const } },
          { client: { businessName: { contains: search, mode: 'insensitive' as const } } },
        ],
      }
    : {};

  // Fetch clients for filter dropdown (only for admins)
  const clients = !clientId
    ? await prisma.client.findMany({
        select: { id: true, businessName: true },
        orderBy: { businessName: 'asc' },
      })
    : [];

  // Helper to build links that preserve query params
  const buildLink = (overrides: Record<string, string | number>) => {
    const p = new URLSearchParams();
    p.set('type', activeType);
    if (clientFilter) p.set('clientFilter', clientFilter);
    if (dateFilter) p.set('dateFilter', dateFilter);
    for (const [k, v] of Object.entries(overrides)) {
      p.set(k, String(v));
    }
    return `/invoice-generation?${p.toString()}`;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{activeType === 'quotations' ? 'Quotations' : 'Invoices'}</h1>
        {admin && (
          <Link href={activeType === 'quotations' ? '/invoice-generation/new' : '/invoices/new'}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {activeType === 'quotations' ? 'New Quotation' : 'New Invoice'}
            </Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <form className="flex flex-wrap items-center gap-3 mb-4">
        <input type="hidden" name="type" value={activeType} />
        <Input
          name="search"
          placeholder={activeType === 'quotations' ? 'Search quotations...' : 'Search invoices...'}
          defaultValue={search}
          className="w-56"
        />
        {clients.length > 0 && (
          <select
            name="clientFilter"
            defaultValue={clientFilter}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
          >
            <option value="">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.businessName}</option>
            ))}
          </select>
        )}
        <select
          name="dateFilter"
          defaultValue={dateFilter}
          className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
        >
          <option value="">All Dates</option>
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
          <option value="this_year">This Year</option>
          <option value="last_year">Last Year</option>
        </select>
        <Button type="submit" variant="outline" size="sm">
          <Filter className="h-3.5 w-3.5 mr-1.5" />
          Filter
        </Button>
        {(search || clientFilter || dateFilter) && (
          <Link
            href={`/invoice-generation?type=${activeType}`}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Clear filters
          </Link>
        )}
      </form>

      {/* Conditional rendering based on type */}
      {activeType === 'quotations'
        ? await renderQuotations({ clientWhere: { ...clientWhere, ...clientFilterWhere }, searchWhere, dateFilterWhere, activeTab, search, clientFilter, dateFilter, page, perPage, buildLink, admin })
        : await renderInvoices({ clientWhere: { ...clientWhere, ...clientFilterWhere }, searchWhere, dateFilterWhere, activeTab, search, clientFilter, dateFilter, page, perPage, buildLink, admin })}
    </div>
  );
}

// ============================================================
// Quotations sub-view
// ============================================================

async function renderQuotations({
  clientWhere,
  searchWhere,
  dateFilterWhere,
  activeTab,
  search,
  clientFilter,
  dateFilter,
  page,
  perPage,
  buildLink,
  admin,
}: {
  clientWhere: Record<string, unknown>;
  searchWhere: Record<string, unknown>;
  dateFilterWhere: Record<string, unknown>;
  activeTab: string;
  search: string;
  clientFilter: string;
  dateFilter: string;
  page: number;
  perPage: number;
  buildLink: (o: Record<string, string | number>) => string;
  admin: boolean;
}) {
  const statusWhere = activeTab === 'ALL' ? {} : { status: activeTab as never };
  const baseWhere = { ...clientWhere, ...searchWhere, ...dateFilterWhere };

  const [quotes, totalCount] = await Promise.all([
    prisma.quote.findMany({
      where: { ...baseWhere, ...statusWhere },
      include: { client: { select: { businessName: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.quote.count({ where: { ...baseWhere, ...statusWhere } }),
  ]);

  const totalPages = Math.ceil(totalCount / perPage);

  // Tab counts (respect filters)
  const allQuotes = await prisma.quote.findMany({ where: baseWhere, select: { status: true } });
  const counts: Record<string, number> = { ALL: allQuotes.length };
  for (const tab of QUOTE_TABS) {
    if (tab === 'ALL') continue;
    counts[tab] = allQuotes.filter((q) => q.status === tab).length;
  }

  return (
    <>
      {/* Status Tabs */}
      <div className="flex gap-1 mb-6 border-b overflow-x-auto">
        {QUOTE_TABS.map((tab) => (
          <Link
            key={tab}
            href={buildLink({ tab, ...(search ? { search } : {}), page: 1 })}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              activeTab === tab
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab} ({counts[tab] ?? 0})
          </Link>
        ))}
      </div>

      {/* Quote List */}
      {quotes.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          No quotations found.{' '}
          {admin && (
            <Link href="/invoice-generation/new" className="text-blue-600 hover:underline">
              Create your first quotation
            </Link>
          )}
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
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id} className="border-b last:border-b-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/invoice-generation/${q.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                      {q.number}
                    </Link>
                    {q.title && <div className="text-xs text-slate-500">{q.title}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{q.client.businessName}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={q.status} kind="quote" />
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    <div>{formatDate(q.createdDate)}</div>
                    <div className="text-xs text-slate-400">Valid: {formatDate(q.validUntil)}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(q.total)}</td>
                  <td className="px-4 py-3 text-right">
                    <QuoteRowActions quoteId={q.id} admin={admin} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination - bottom right */}
      {totalPages > 1 && (
        <div className="flex justify-end gap-2 mt-6">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={buildLink({ tab: activeTab, ...(search ? { search } : {}), page: p })}
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
    </>
  );
}

// ============================================================
// Invoices sub-view
// ============================================================

async function renderInvoices({
  clientWhere,
  searchWhere,
  dateFilterWhere,
  activeTab,
  search,
  clientFilter,
  dateFilter,
  page,
  perPage,
  buildLink,
  admin,
}: {
  clientWhere: Record<string, unknown>;
  searchWhere: Record<string, unknown>;
  dateFilterWhere: Record<string, unknown>;
  activeTab: string;
  search: string;
  clientFilter: string;
  dateFilter: string;
  page: number;
  perPage: number;
  buildLink: (o: Record<string, string | number>) => string;
  admin: boolean;
}) {
  const statusWhere =
    activeTab === 'ALL'
      ? {}
      : activeTab === 'OVERDUE'
        ? { status: 'SENT' as never, dueDate: { lt: new Date() } }
        : { status: activeTab as never };
  const baseWhere = { ...clientWhere, ...searchWhere, ...dateFilterWhere };
  const fullWhere = { ...baseWhere, ...statusWhere };

  const [invoices, totalCount] = await Promise.all([
    prisma.invoice.findMany({
      where: fullWhere,
      include: { client: { select: { businessName: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.invoice.count({ where: fullWhere }),
  ]);

  // Compute display status for each invoice
  const displayed = invoices.map((inv) => ({
    ...inv,
    displayStatus: computeDisplayStatus(inv),
  }));

  const totalPages = Math.ceil(totalCount / perPage);

  // Compute tab counts (respect filters)
  const allInvoices = await prisma.invoice.findMany({
    where: baseWhere,
    select: { status: true, dueDate: true },
  });
  const allWithDisplay = allInvoices.map((inv) => ({
    ...inv,
    displayStatus: computeDisplayStatus(inv),
  }));
  const counts: Record<string, number> = { ALL: allInvoices.length };
  for (const tab of INVOICE_TABS) {
    if (tab === 'ALL') continue;
    counts[tab] = allWithDisplay.filter((inv) => inv.displayStatus === tab).length;
  }

  return (
    <>
      {/* Status Tabs */}
      <div className="flex gap-1 mb-6 border-b overflow-x-auto">
        {INVOICE_TABS.map((tab) => (
          <Link
            key={tab}
            href={buildLink({ tab, ...(search ? { search } : {}), page: 1 })}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
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
          {admin && (
            <Link href="/invoices/new" className="text-blue-600 hover:underline">
              Create your first invoice
            </Link>
          )}
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
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
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
                  <td className="px-4 py-3 text-right">
                    <InvoiceRowActions invoiceId={inv.id} admin={admin} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination - bottom right */}
      {totalPages > 1 && (
        <div className="flex justify-end gap-2 mt-6">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={buildLink({ tab: activeTab, ...(search ? { search } : {}), page: p })}
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
    </>
  );
}

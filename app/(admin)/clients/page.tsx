import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/currency';
import { Input } from '@/components/ui/input';
import { Mail, Phone, KeyRound } from 'lucide-react';
import { ClientsToolbar } from './clients-toolbar';

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const search = params.search ?? '';
  const page = parseInt(params.page ?? '1', 10);
  const perPage = 20;

  const searchWhere = search
    ? {
        OR: [
          { businessName: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { firstName: { contains: search, mode: 'insensitive' as const } },
          { lastName: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const [clients, totalCount] = await Promise.all([
    prisma.client.findMany({
      where: searchWhere,
      include: {
        _count: { select: { quotes: true, invoices: true } },
        user: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.client.count({ where: searchWhere }),
  ]);

  const totalPages = Math.ceil(totalCount / perPage);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
        <ClientsToolbar />
      </div>

      {/* Search */}
      <form className="mb-6">
        <Input
          name="search"
          placeholder="Search clients..."
          defaultValue={search}
          className="max-w-sm"
        />
      </form>

      {/* Client List */}
      {clients.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          No clients found. Use the &quot;New Client&quot; button above to add one.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Business Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Quotes</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Invoices</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Added</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="border-b last:border-b-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Link href={`/clients/${client.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                        {client.businessName}
                      </Link>
                      {client.user && (
                        <span title="Has login account"><KeyRound className="h-3 w-3 text-green-500" /></span>
                      )}
                    </div>
                    {(client.firstName || client.lastName) && (
                      <div className="text-xs text-slate-500">
                        {[client.firstName, client.lastName].filter(Boolean).join(' ')}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-sm text-slate-600">
                      <Mail className="h-3 w-3" />
                      {client.email}
                    </div>
                    {client.phone && (
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Phone className="h-3 w-3" />
                        {client.phone}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{client._count.quotes}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{client._count.invoices}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{formatDate(client.createdAt)}</td>
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
              href={`/clients?${search ? `search=${search}&` : ''}page=${p}`}
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

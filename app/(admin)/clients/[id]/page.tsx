import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { formatCurrency, formatDate } from '@/lib/currency';
import { StatusBadge } from '@/components/shared/status-badge';
import { Card } from '@/components/ui/card';
import { ClientActions } from '../client-actions';
import { Mail, Phone, Globe, MapPin, KeyRound } from 'lucide-react';

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, name: true, role: true } },
      quotes: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      invoices: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!client) notFound();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-sm text-slate-500 mb-1">
            <Link href="/clients" className="hover:underline">Clients</Link> / {client.businessName}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{client.businessName}</h1>
          {(client.firstName || client.lastName) && (
            <p className="text-slate-600">
              {[client.firstName, client.lastName].filter(Boolean).join(' ')}
            </p>
          )}
        </div>
        <ClientActions client={client} />
      </div>

      {/* Contact info */}
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-slate-400" />
            <a href={`mailto:${client.email}`} className="text-blue-600 hover:underline">{client.email}</a>
          </div>
          {client.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-slate-400" />
              <span>{client.phone}</span>
            </div>
          )}
          {client.website && (
            <div className="flex items-center gap-2 text-sm">
              <Globe className="h-4 w-4 text-slate-400" />
              <a href={client.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{client.website}</a>
            </div>
          )}
          {client.address && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
              <span className="whitespace-pre-line">{client.address}</span>
            </div>
          )}
        </div>
        {client.user && (
          <div className="flex items-center gap-2 text-sm">
            <KeyRound className="h-4 w-4 text-green-500" />
            <span className="text-green-700 font-medium">Login enabled</span>
            <span className="text-slate-500">({client.user.email})</span>
          </div>
        )}
        {!client.user && (
          <div className="flex items-center gap-2 text-sm">
            <KeyRound className="h-4 w-4 text-slate-300" />
            <span className="text-slate-400">No login account</span>
          </div>
        )}
        {client.extraInfo && (
          <div className="mt-3 pt-3 border-t text-sm text-slate-600">{client.extraInfo}</div>
        )}
      </Card>

      {/* Quotes & Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Quotations ({client.quotes.length})</h2>
            <Link href={`/invoice-generation/new?clientId=${client.id}`} className="text-sm text-blue-600 hover:underline">
              New Quotation
            </Link>
          </div>
          {client.quotes.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">No quotations yet</p>
          ) : (
            <ul className="space-y-2">
              {client.quotes.map((q) => (
                <li key={q.id} className="flex items-center justify-between text-sm border-t pt-2 first:border-t-0 first:pt-0">
                  <div className="min-w-0 flex-1">
                    <Link href={`/invoice-generation/${q.id}`} className="font-medium hover:underline">
                      {q.number}
                    </Link>
                    <div className="text-xs text-slate-500">{formatDate(q.createdDate)}</div>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    <StatusBadge status={q.status} kind="quote" />
                    <span className="font-medium tabular-nums">{formatCurrency(q.total)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Invoices ({client.invoices.length})</h2>
            <Link href={`/invoices/new?clientId=${client.id}`} className="text-sm text-blue-600 hover:underline">
              New Invoice
            </Link>
          </div>
          {client.invoices.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">No invoices yet</p>
          ) : (
            <ul className="space-y-2">
              {client.invoices.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between text-sm border-t pt-2 first:border-t-0 first:pt-0">
                  <div className="min-w-0 flex-1">
                    <Link href={`/invoices/${inv.id}`} className="font-medium hover:underline">
                      {inv.number}
                    </Link>
                    <div className="text-xs text-slate-500">Due {formatDate(inv.dueDate)}</div>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    <StatusBadge status={inv.status} kind="invoice" />
                    <span className="font-medium tabular-nums">{formatCurrency(inv.total)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

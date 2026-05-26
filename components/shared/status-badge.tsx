import { cn } from '@/lib/utils';

const QUOTE_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SENT: 'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  DECLINED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-slate-200 text-slate-600',
  CANCELLED: 'bg-slate-200 text-slate-600',
  CONVERTED: 'bg-purple-100 text-purple-700',
};

const INVOICE_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SENT: 'bg-blue-100 text-blue-700',
  PAID: 'bg-green-100 text-green-700',
  PARTIAL: 'bg-yellow-100 text-yellow-700',
  OVERDUE: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-200 text-slate-600',
};

export function StatusBadge({
  status,
  kind,
}: {
  status: string;
  kind: 'quote' | 'invoice';
}) {
  const colors = kind === 'quote' ? QUOTE_COLORS : INVOICE_COLORS;
  const className = colors[status] ?? 'bg-slate-100 text-slate-700';
  return (
    <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-medium', className)}>
      {status}
    </span>
  );
}

'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  Receipt,
  Settings,
} from 'lucide-react';
import type { AppRole } from '@/lib/roles';

const allNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'admin'] as AppRole[] },
  { href: '/invoice-generation?type=quotations', label: 'Quotation', icon: FileText, roles: ['super_admin', 'admin', 'client'] as AppRole[] },
  { href: '/invoice-generation?type=invoices', label: 'Invoice', icon: Receipt, roles: ['super_admin', 'admin', 'client'] as AppRole[] },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['super_admin', 'admin'] as AppRole[] },
];

export function AdminSidebar({ role = 'client' }: { role?: AppRole }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentType = searchParams.get('type');
  const navItems = allNavItems.filter((item) => item.roles.includes(role));

  return (
    <aside className="w-60 bg-white border-r border-slate-200 min-h-[calc(100vh-3.5rem)]">
      <nav className="p-4 space-y-1">
        {navItems.map((item) => {
          let isActive = false;
          if (item.href.includes('type=quotations')) {
            // Sub-routes like /invoice-generation/[id] (quote detail, edit, pdf)
            // should highlight Quotation for ALL roles
            const isQuoteSubRoute =
              /^\/invoice-generation\/[^?]/.test(pathname) && !currentType;
            isActive =
              (pathname.startsWith('/invoice-generation') && currentType === 'quotations') ||
              isQuoteSubRoute ||
              (pathname === '/invoice-generation' && !currentType && role !== 'client');
          } else if (item.href.includes('type=invoices')) {
            isActive =
              (pathname.startsWith('/invoice-generation') && currentType === 'invoices') ||
              (pathname === '/invoice-generation' && !currentType && role === 'client') ||
              pathname.startsWith('/invoices');
          } else {
            isActive = pathname.startsWith(item.href);
          }
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

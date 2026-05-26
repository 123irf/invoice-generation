'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/settings/general', label: 'General' },
  { href: '/settings/business', label: 'Business' },
  { href: '/settings/quotes', label: 'Quotes' },
  { href: '/settings/invoices', label: 'Invoices' },
  { href: '/settings/payments', label: 'Payments' },
  { href: '/settings/tax', label: 'Tax' },
  { href: '/settings/emails', label: 'Emails' },
  { href: '/settings/translate', label: 'Translate' },
];

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <nav className="border-b border-slate-200 mb-6">
      <div className="flex gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                active
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

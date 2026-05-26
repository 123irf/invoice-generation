import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';

export function AdminTopbar() {
  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      <Link href="/dashboard" className="font-semibold text-slate-900">
        Ultrakey Invoice
      </Link>
      <UserButton />
    </header>
  );
}

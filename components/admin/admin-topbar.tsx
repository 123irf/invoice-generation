'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AdminTopbar({ userName }: { userName: string }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/sign-in');
    router.refresh();
  }

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      <Link href="/dashboard" className="font-semibold text-slate-900">
        Ultrakey Invoice
      </Link>
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-600">{userName}</span>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-1" />
          Logout
        </Button>
      </div>
    </header>
  );
}

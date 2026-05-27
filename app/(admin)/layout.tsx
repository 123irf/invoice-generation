import { redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminTopbar } from '@/components/admin/admin-topbar';
import { getCurrentUser, getUserRole } from '@/lib/auth';
import { getAllowedRoutes, getDefaultRoute } from '@/lib/roles';
import { headers } from 'next/headers';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');

  const role = await getUserRole();
  const allowedRoutes = getAllowedRoutes(role);

  // Check if the current path is allowed for this role
  const hdrs = await headers();
  const url = hdrs.get('x-nextjs-current-url') || hdrs.get('x-forwarded-url') || '';
  const pathname = url ? new URL(url, 'http://localhost').pathname : '';

  if (pathname && !allowedRoutes.some((route) => pathname.startsWith(route))) {
    redirect(getDefaultRoute(role));
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminTopbar userName={user.name || user.email} />
      <div className="flex">
        <AdminSidebar role={role} />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}

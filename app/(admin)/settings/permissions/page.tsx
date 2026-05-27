import { isSuperAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getRolePermissionMap } from '@/lib/permissions';
import { PermissionsManager } from './permissions-form';

export default async function PermissionsSettingsPage() {
  const superAdmin = await isSuperAdmin();
  if (!superAdmin) {
    redirect('/settings/general');
  }

  const [adminPerms, clientPerms, users] = await Promise.all([
    getRolePermissionMap('ADMIN'),
    getRolePermissionMap('CLIENT'),
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  // Group users by role
  const roleUsers: Record<string, { id: string; name: string | null; email: string }[]> = {
    SUPER_ADMIN: [],
    ADMIN: [],
    CLIENT: [],
  };
  for (const u of users) {
    if (roleUsers[u.role]) roleUsers[u.role].push(u);
  }

  return (
    <PermissionsManager
      adminPermissions={adminPerms}
      clientPermissions={clientPerms}
      roleUsers={roleUsers}
    />
  );
}

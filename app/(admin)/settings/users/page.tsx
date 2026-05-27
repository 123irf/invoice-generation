import { isSuperAdmin } from '@/lib/auth';
import { getRolePermissionMap, getUserPermissionMap } from '@/lib/permissions';
import { getUsers } from './actions';
import { UsersManager } from './users-manager';

export default async function UsersSettingsPage() {
  const [users, superAdmin, adminDefaults, clientDefaults] = await Promise.all([
    getUsers(),
    isSuperAdmin(),
    getRolePermissionMap('ADMIN'),
    getRolePermissionMap('CLIENT'),
  ]);

  // Fetch per-user permission data for all non-super-admin users
  const userPermData: Record<string, { permissions: Record<string, boolean>; isCustom: boolean }> = {};
  await Promise.all(
    users.filter((u) => u.role !== 'SUPER_ADMIN').map(async (u) => {
      userPermData[u.id] = await getUserPermissionMap(u.id, u.role);
    })
  );

  // Group users by role for the Role Defaults dialog
  const roleUsers: Record<string, { id: string; name: string | null; email: string }[]> = {
    SUPER_ADMIN: [],
    ADMIN: [],
    CLIENT: [],
  };
  for (const u of users) {
    if (roleUsers[u.role]) roleUsers[u.role].push({ id: u.id, name: u.name, email: u.email });
  }

  return (
    <UsersManager
      users={users}
      isSuperAdmin={superAdmin}
      defaultPermissions={{ ADMIN: adminDefaults, CLIENT: clientDefaults }}
      userPermissions={userPermData}
      roleUsers={roleUsers}
    />
  );
}

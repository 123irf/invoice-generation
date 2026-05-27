'use server';

import { revalidatePath } from 'next/cache';
import { isSuperAdmin, getAdminEmail } from '@/lib/auth';
import {
  getRolePermissionMap,
  saveRolePermissions,
  getUserPermissionMap,
  saveUserPermissions,
  clearUserPermissions,
} from '@/lib/permissions';
import { writeAudit } from '@/lib/audit';
import type { UserRole } from '@/lib/generated/prisma/client';

async function requireSuperAdmin() {
  const sa = await isSuperAdmin();
  if (!sa) throw new Error('Forbidden: Super Admin access required');
}

export async function getPermissionsForRoleAction(role: UserRole) {
  await requireSuperAdmin();
  return getRolePermissionMap(role);
}

export async function savePermissionsAction(
  role: UserRole,
  permissions: Record<string, boolean>
) {
  await requireSuperAdmin();

  if (role === 'SUPER_ADMIN') {
    return { ok: false, error: 'Cannot modify Super Admin permissions' };
  }

  await saveRolePermissions(role, permissions);

  await writeAudit({
    actor: await getAdminEmail(),
    action: 'PERMISSIONS_UPDATED',
    targetType: 'SETTINGS',
    targetId: role,
    metadata: { role, permissions },
  });

  revalidatePath('/settings/permissions');
  revalidatePath('/settings/users');
  return { ok: true };
}

export async function getUserPermissionsAction(userId: string, role: UserRole) {
  await requireSuperAdmin();
  return getUserPermissionMap(userId, role);
}

export async function saveUserPermissionsAction(
  userId: string,
  permissions: Record<string, boolean>
) {
  await requireSuperAdmin();

  await saveUserPermissions(userId, permissions);

  await writeAudit({
    actor: await getAdminEmail(),
    action: 'USER_PERMISSIONS_UPDATED',
    targetType: 'USER',
    targetId: userId,
    metadata: { userId, permissions },
  });

  revalidatePath('/settings/permissions');
  return { ok: true };
}

export async function clearUserPermissionsAction(userId: string) {
  await requireSuperAdmin();

  await clearUserPermissions(userId);

  await writeAudit({
    actor: await getAdminEmail(),
    action: 'USER_PERMISSIONS_CLEARED',
    targetType: 'USER',
    targetId: userId,
    metadata: { userId },
  });

  revalidatePath('/settings/permissions');
  return { ok: true };
}

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import type { UserRole } from '@/lib/generated/prisma/client';
import {
  ALL_PERMISSIONS,
  DEFAULT_PERMISSIONS,
  type Permission,
} from '@/lib/permission-constants';

// Re-export constants so existing server-side imports still work
export { ALL_PERMISSIONS, PERMISSION_GROUPS, type Permission } from '@/lib/permission-constants';

// ============================================================
// Fetch permissions for a role from DB (with defaults fallback)
// ============================================================

/** Cache: key -> Set<permission> (per request only, not global) */
const permissionCache = new Map<string, Set<string>>();

export async function getPermissionsForRole(role: UserRole): Promise<Set<string>> {
  // SUPER_ADMIN always has all permissions
  if (role === 'SUPER_ADMIN') {
    return new Set(Object.keys(ALL_PERMISSIONS));
  }

  if (permissionCache.has(role)) {
    return permissionCache.get(role)!;
  }

  const dbPerms = await prisma.rolePermission.findMany({
    where: { role },
  });

  let perms: Set<string>;

  if (dbPerms.length === 0) {
    // No custom config in DB yet — use defaults
    perms = new Set(DEFAULT_PERMISSIONS[role] ?? []);
  } else {
    perms = new Set(
      dbPerms.filter((p) => p.granted).map((p) => p.permission)
    );
  }

  permissionCache.set(role, perms);
  return perms;
}

// ============================================================
// Fetch permissions for a specific user (user overrides > role)
// ============================================================

export async function getPermissionsForUser(userId: string, role: UserRole): Promise<Set<string>> {
  if (role === 'SUPER_ADMIN') {
    return new Set(Object.keys(ALL_PERMISSIONS));
  }

  const cacheKey = `user:${userId}`;
  if (permissionCache.has(cacheKey)) {
    return permissionCache.get(cacheKey)!;
  }

  // Check for user-level overrides first
  const userPerms = await prisma.userPermission.findMany({
    where: { userId },
  });

  let perms: Set<string>;

  if (userPerms.length > 0) {
    // User has custom overrides — use those
    perms = new Set(
      userPerms.filter((p) => p.granted).map((p) => p.permission)
    );
  } else {
    // Fall back to role-level permissions
    perms = await getPermissionsForRole(role);
  }

  permissionCache.set(cacheKey, perms);
  return perms;
}

// ============================================================
// Check if the current user has a permission
// ============================================================

export async function hasPermission(permission: Permission): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const perms = await getPermissionsForUser(user.id, user.role);
  return perms.has(permission);
}

export async function requirePermission(permission: Permission): Promise<void> {
  const allowed = await hasPermission(permission);
  if (!allowed) {
    throw new Error(`Forbidden: missing permission "${permission}"`);
  }
}

// ============================================================
// Get all permissions for a role (for the management UI)
// ============================================================

export async function getRolePermissionMap(role: UserRole): Promise<Record<string, boolean>> {
  const dbPerms = await prisma.rolePermission.findMany({
    where: { role },
  });

  const result: Record<string, boolean> = {};

  if (dbPerms.length === 0) {
    // Return defaults
    const defaults = DEFAULT_PERMISSIONS[role] ?? [];
    for (const key of Object.keys(ALL_PERMISSIONS)) {
      result[key] = defaults.includes(key as Permission);
    }
  } else {
    const grantedSet = new Set(dbPerms.filter((p) => p.granted).map((p) => p.permission));
    for (const key of Object.keys(ALL_PERMISSIONS)) {
      result[key] = grantedSet.has(key);
    }
  }

  return result;
}

// ============================================================
// Get permissions for a specific user (for the management UI)
// ============================================================

export async function getUserPermissionMap(userId: string, role: UserRole): Promise<{
  permissions: Record<string, boolean>;
  isCustom: boolean;
}> {
  const userPerms = await prisma.userPermission.findMany({
    where: { userId },
  });

  if (userPerms.length === 0) {
    // No overrides — return role defaults
    return { permissions: await getRolePermissionMap(role), isCustom: false };
  }

  const grantedSet = new Set(userPerms.filter((p) => p.granted).map((p) => p.permission));
  const permissions: Record<string, boolean> = {};
  for (const key of Object.keys(ALL_PERMISSIONS)) {
    permissions[key] = grantedSet.has(key);
  }

  return { permissions, isCustom: true };
}

// ============================================================
// Save permissions for a role (SUPER_ADMIN only)
// ============================================================

export async function saveRolePermissions(
  role: UserRole,
  permissions: Record<string, boolean>
): Promise<void> {
  // Delete + recreate in two fast queries instead of 20+ upserts
  // (avoids exceeding Neon's 5s interactive transaction timeout)
  await prisma.rolePermission.deleteMany({ where: { role } });
  await prisma.rolePermission.createMany({
    data: Object.entries(permissions).map(([permission, granted]) => ({
      role,
      permission,
      granted,
    })),
  });

  // Clear cache
  permissionCache.delete(role);
}

// ============================================================
// Save/clear per-user permission overrides
// ============================================================

export async function saveUserPermissions(
  userId: string,
  permissions: Record<string, boolean>
): Promise<void> {
  await prisma.userPermission.deleteMany({ where: { userId } });
  await prisma.userPermission.createMany({
    data: Object.entries(permissions).map(([permission, granted]) => ({
      userId,
      permission,
      granted,
    })),
  });

  permissionCache.delete(`user:${userId}`);
}

export async function clearUserPermissions(userId: string): Promise<void> {
  await prisma.userPermission.deleteMany({ where: { userId } });
  permissionCache.delete(`user:${userId}`);
}

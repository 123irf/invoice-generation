'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { writeAudit } from '@/lib/audit';
import { getAdminEmail, hashPassword, isAdmin, isSuperAdmin } from '@/lib/auth';
import { saveUserPermissions } from '@/lib/permissions';
import type { UserRole } from '@/lib/generated/prisma/client';

async function requireAdminAccess() {
  const admin = await isAdmin();
  if (!admin) throw new Error('Forbidden');
}

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'CLIENT']),
});

const updateSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'CLIENT']),
});

const resetPasswordSchema = z.object({
  id: z.string().min(1),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function getUsers() {
  await requireAdminAccess();
  return prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function createUser(formData: FormData, permissions?: Record<string, boolean>) {
  await requireAdminAccess();

  const data = createSchema.parse({
    email: formData.get('email'),
    password: formData.get('password'),
    name: formData.get('name'),
    role: formData.get('role'),
  });

  // Only SUPER_ADMIN can create another SUPER_ADMIN
  if (data.role === 'SUPER_ADMIN' && !(await isSuperAdmin())) {
    return { ok: false, error: 'Only Super Admin can assign the Super Admin role' };
  }

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return { ok: false, error: 'A user with this email already exists' };
  }

  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      name: data.name,
      role: data.role as UserRole,
    },
  });

  // Save per-user permissions if provided (skip for SUPER_ADMIN — they always have all)
  if (permissions && data.role !== 'SUPER_ADMIN') {
    await saveUserPermissions(user.id, permissions);
  }

  await writeAudit({
    actor: await getAdminEmail(),
    action: 'USER_CREATED',
    targetType: 'USER',
    targetId: user.id,
    metadata: { email: data.email, role: data.role, customPermissions: !!permissions },
  });

  revalidatePath('/settings/users');
  revalidatePath('/settings/permissions');
  return { ok: true };
}

export async function updateUser(formData: FormData, permissions?: Record<string, boolean>) {
  await requireAdminAccess();

  const data = updateSchema.parse({
    id: formData.get('id'),
    email: formData.get('email'),
    name: formData.get('name'),
    role: formData.get('role'),
  });

  // Only SUPER_ADMIN can assign the SUPER_ADMIN role
  if (data.role === 'SUPER_ADMIN' && !(await isSuperAdmin())) {
    return { ok: false, error: 'Only Super Admin can assign the Super Admin role' };
  }

  const emailConflict = await prisma.user.findFirst({
    where: { email: data.email, NOT: { id: data.id } },
  });
  if (emailConflict) {
    return { ok: false, error: 'Another user with this email already exists' };
  }

  await prisma.user.update({
    where: { id: data.id },
    data: {
      email: data.email,
      name: data.name,
      role: data.role as UserRole,
    },
  });

  // Save per-user permissions if provided (skip for SUPER_ADMIN)
  if (permissions && data.role !== 'SUPER_ADMIN') {
    await saveUserPermissions(data.id, permissions);
  }

  await writeAudit({
    actor: await getAdminEmail(),
    action: 'USER_UPDATED',
    targetType: 'USER',
    targetId: data.id,
    metadata: { email: data.email, role: data.role, customPermissions: !!permissions },
  });

  revalidatePath('/settings/users');
  revalidatePath('/settings/permissions');
  return { ok: true };
}

export async function resetUserPassword(formData: FormData) {
  await requireAdminAccess();

  const data = resetPasswordSchema.parse({
    id: formData.get('id'),
    password: formData.get('password'),
  });

  const passwordHash = await hashPassword(data.password);
  await prisma.user.update({
    where: { id: data.id },
    data: { passwordHash },
  });

  await writeAudit({
    actor: await getAdminEmail(),
    action: 'USER_PASSWORD_RESET',
    targetType: 'USER',
    targetId: data.id,
  });

  revalidatePath('/settings/users');
  return { ok: true };
}

export async function deleteUser(id: string) {
  await requireAdminAccess();

  const actor = await getAdminEmail();
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return { ok: false, error: 'User not found' };

  // Prevent self-deletion
  if (target.email === actor) {
    return { ok: false, error: 'You cannot delete your own account' };
  }

  await prisma.user.delete({ where: { id } });

  await writeAudit({
    actor,
    action: 'USER_DELETED',
    targetType: 'USER',
    targetId: id,
    metadata: { email: target.email },
  });

  revalidatePath('/settings/users');
  return { ok: true };
}

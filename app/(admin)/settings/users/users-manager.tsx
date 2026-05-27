'use client';

import { useState, useTransition, useMemo } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, KeyRound, ShieldCheck, Shield, User, ChevronRight, ChevronLeft, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { ALL_PERMISSIONS, PERMISSION_GROUPS } from '@/lib/permission-constants';
import type { Permission } from '@/lib/permission-constants';
import { cn } from '@/lib/utils';
import { createUser, updateUser, deleteUser, resetUserPassword } from './actions';
import { savePermissionsAction } from '@/app/(admin)/settings/permissions/actions';
import type { UserRole } from '@/lib/generated/prisma/client';

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: Date;
};

interface UserPermData {
  permissions: Record<string, boolean>;
  isCustom: boolean;
}

function getRoleIcon(role: string) {
  if (role === 'SUPER_ADMIN') return <ShieldCheck className="h-4 w-4 text-purple-600" />;
  if (role === 'ADMIN') return <Shield className="h-4 w-4 text-amber-600" />;
  return <User className="h-4 w-4 text-slate-400" />;
}

function getRoleBadge(role: string) {
  if (role === 'SUPER_ADMIN')
    return 'inline-flex items-center whitespace-nowrap rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 ring-1 ring-purple-600/20';
  if (role === 'ADMIN')
    return 'inline-flex items-center whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-600/20';
  return 'inline-flex items-center whitespace-nowrap rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-600/20';
}

function getRoleLabel(role: string) {
  if (role === 'SUPER_ADMIN') return 'Super Admin';
  if (role === 'ADMIN') return 'Admin';
  return 'Client';
}

/* ------------------------------------------------------------------ */
/* Permission group lookup                                             */
/* ------------------------------------------------------------------ */

const PERM_TO_GROUP: Record<string, string> = {};
for (const group of PERMISSION_GROUPS) {
  for (const perm of group.permissions) {
    PERM_TO_GROUP[perm] = group.label;
  }
}

/* ------------------------------------------------------------------ */
/* Dual-Pane Permission Widget (Django-style)                          */
/* ------------------------------------------------------------------ */

function PermissionItem({
  permKey,
  isSelected,
  onClick,
  onDoubleClick,
}: {
  permKey: string;
  isSelected: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
}) {
  const group = PERM_TO_GROUP[permKey] || '';
  const label = ALL_PERMISSIONS[permKey as Permission] || permKey;

  return (
    <div
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        'px-2.5 py-1.5 text-xs cursor-pointer select-none',
        'border-b border-slate-50 last:border-b-0',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 focus-visible:ring-inset',
        isSelected
          ? 'bg-blue-600 text-white'
          : 'hover:bg-slate-50 text-slate-700'
      )}
    >
      <span className={isSelected ? 'text-blue-200' : 'text-slate-400'}>{group}</span>
      <span className={cn('mx-1', isSelected ? 'text-blue-300' : 'text-slate-300')}>|</span>
      <span>{label}</span>
    </div>
  );
}

export function DualPanePermissions({
  permissions,
  onPermissionsChange,
}: {
  permissions: Record<string, boolean>;
  onPermissionsChange: (perms: Record<string, boolean>) => void;
}) {
  const [leftFilter, setLeftFilter] = useState('');
  const [rightFilter, setRightFilter] = useState('');
  const [selectedLeft, setSelectedLeft] = useState<Set<string>>(new Set());
  const [selectedRight, setSelectedRight] = useState<Set<string>>(new Set());

  const allPermKeys = Object.keys(ALL_PERMISSIONS);

  const available = useMemo(
    () => allPermKeys.filter((k) => !permissions[k]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [permissions]
  );

  const chosen = useMemo(
    () => allPermKeys.filter((k) => permissions[k]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [permissions]
  );

  function filterItems(items: string[], query: string) {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((k) => {
      const group = PERM_TO_GROUP[k] || '';
      const label = ALL_PERMISSIONS[k as Permission] || k;
      return `${group} ${label}`.toLowerCase().includes(q);
    });
  }

  const filteredAvailable = filterItems(available, leftFilter);
  const filteredChosen = filterItems(chosen, rightFilter);

  function moveToChosen(keys?: string[]) {
    const toMove = keys || Array.from(selectedLeft).filter((k) => filteredAvailable.includes(k));
    if (toMove.length === 0) return;
    const next = { ...permissions };
    for (const k of toMove) next[k] = true;
    onPermissionsChange(next);
    setSelectedLeft(new Set());
  }

  function moveToAvailable(keys?: string[]) {
    const toMove = keys || Array.from(selectedRight).filter((k) => filteredChosen.includes(k));
    if (toMove.length === 0) return;
    const next = { ...permissions };
    for (const k of toMove) next[k] = false;
    onPermissionsChange(next);
    setSelectedRight(new Set());
  }

  function toggleSelection(set: Set<string>, setFn: (s: Set<string>) => void, key: string) {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setFn(next);
  }

  return (
    <div className="flex flex-col md:flex-row gap-2">
      {/* Left pane — Available */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-semibold text-slate-600">Available permissions</span>
          <Badge variant="secondary">{filteredAvailable.length}</Badge>
        </div>
        <Input
          placeholder="Filter..."
          value={leftFilter}
          onChange={(e) => setLeftFilter(e.target.value)}
          className="mb-1.5 h-7 text-xs"
        />
        <div className="border border-slate-200 rounded-md overflow-auto h-52 bg-white">
          {filteredAvailable.map((permKey) => (
            <PermissionItem
              key={permKey}
              permKey={permKey}
              isSelected={selectedLeft.has(permKey)}
              onClick={() => toggleSelection(selectedLeft, setSelectedLeft, permKey)}
              onDoubleClick={() => moveToChosen([permKey])}
            />
          ))}
          {filteredAvailable.length === 0 && (
            <div className="px-3 py-4 text-xs text-slate-400 text-center">
              {leftFilter ? 'No matching permissions' : 'All permissions assigned'}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => moveToChosen(filteredAvailable)}
          className="text-[11px] text-blue-600 hover:underline mt-1"
        >
          Choose all
        </button>
      </div>

      {/* Center arrows */}
      <div className="flex md:flex-col items-center justify-center gap-1.5 py-2 md:py-0 md:pt-14">
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          onClick={() => moveToChosen()}
          disabled={selectedLeft.size === 0}
          title="Add selected"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          onClick={() => moveToAvailable()}
          disabled={selectedRight.size === 0}
          title="Remove selected"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Right pane — Chosen */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-semibold text-slate-600">Chosen permissions</span>
          <Badge variant="secondary">{filteredChosen.length}</Badge>
        </div>
        <Input
          placeholder="Filter..."
          value={rightFilter}
          onChange={(e) => setRightFilter(e.target.value)}
          className="mb-1.5 h-7 text-xs"
        />
        <div className="border border-slate-200 rounded-md overflow-auto h-52 bg-white">
          {filteredChosen.map((permKey) => (
            <PermissionItem
              key={permKey}
              permKey={permKey}
              isSelected={selectedRight.has(permKey)}
              onClick={() => toggleSelection(selectedRight, setSelectedRight, permKey)}
              onDoubleClick={() => moveToAvailable([permKey])}
            />
          ))}
          {filteredChosen.length === 0 && (
            <div className="px-3 py-4 text-xs text-slate-400 text-center">
              {rightFilter ? 'No matching permissions' : 'No permissions assigned'}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => moveToAvailable(filteredChosen)}
          className="text-[11px] text-blue-600 hover:underline mt-1"
        >
          Remove all
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Users Manager                                                  */
/* ------------------------------------------------------------------ */

export function UsersManager({
  users,
  isSuperAdmin,
  defaultPermissions,
  userPermissions,
  roleUsers,
}: {
  users: UserRow[];
  isSuperAdmin: boolean;
  defaultPermissions: { ADMIN: Record<string, boolean>; CLIENT: Record<string, boolean> };
  userPermissions: Record<string, UserPermData>;
  roleUsers: Record<string, { id: string; name: string | null; email: string }[]>;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [roleDefaultsOpen, setRoleDefaultsOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Users</h2>
          <p className="text-sm text-slate-500">
            Manage who can access the application and their permissions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <Button size="sm" variant="outline" onClick={() => setRoleDefaultsOpen(true)}>
              <Settings2 className="h-4 w-4 mr-1" />
              Role Defaults
            </Button>
          )}
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add User
          </Button>
        </div>
      </div>

      {/* User table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">User</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Role</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Permissions</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Created</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u) => {
              const permData = userPermissions[u.id];
              return (
                <tr key={u.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getRoleIcon(u.role)}
                      <span className="font-medium text-slate-900">{u.name || '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={getRoleBadge(u.role)}>
                      {getRoleLabel(u.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.role === 'SUPER_ADMIN' ? (
                      <span className="text-xs text-purple-600 font-medium">Full access</span>
                    ) : permData?.isCustom ? (
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-600/20">
                        Custom
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Role defaults</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(u.createdAt).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditUser(u)}
                        title="Edit user"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setResetTarget(u)}
                        title="Reset password"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(u)}
                        title="Delete user"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No users yet. Add one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Dialogs */}
      <AddUserDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        isSuperAdmin={isSuperAdmin}
        defaultPermissions={defaultPermissions}
      />
      <EditUserDialog
        user={editUser}
        onOpenChange={(open) => !open && setEditUser(null)}
        isSuperAdmin={isSuperAdmin}
        defaultPermissions={defaultPermissions}
        userPermissions={userPermissions}
      />
      <ResetPasswordDialog
        user={resetTarget}
        onOpenChange={(open) => !open && setResetTarget(null)}
      />
      <DeleteUserDialog
        user={deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      />
      {isSuperAdmin && (
        <RoleDefaultsDialog
          open={roleDefaultsOpen}
          onOpenChange={setRoleDefaultsOpen}
          defaultPermissions={defaultPermissions}
          roleUsers={roleUsers}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Role Defaults Dialog                                                */
/* ------------------------------------------------------------------ */

function RoleDefaultsDialog({
  open,
  onOpenChange,
  defaultPermissions,
  roleUsers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPermissions: { ADMIN: Record<string, boolean>; CLIENT: Record<string, boolean> };
  roleUsers: Record<string, { id: string; name: string | null; email: string }[]>;
}) {
  const [pending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<'ADMIN' | 'CLIENT'>('ADMIN');
  const [adminPerms, setAdminPerms] = useState(defaultPermissions.ADMIN);
  const [clientPerms, setClientPerms] = useState(defaultPermissions.CLIENT);

  const perms = activeTab === 'ADMIN' ? adminPerms : clientPerms;
  const setPerms = activeTab === 'ADMIN' ? setAdminPerms : setClientPerms;

  function handleSave() {
    startTransition(async () => {
      const r = await savePermissionsAction(activeTab as UserRole, perms);
      if (r.ok) {
        toast.success(`${activeTab === 'ADMIN' ? 'Admin' : 'Client'} default permissions saved`);
      } else {
        toast.error(r.error || 'Failed to save permissions');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Role Default Permissions</DialogTitle>
          <DialogDescription>
            Configure the default permissions for each role. New users will inherit these unless overridden.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('ADMIN')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'ADMIN'
                ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-300'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Admin Role
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CLIENT')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'CLIENT'
                ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-300'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Client Role
          </button>
        </div>

        {/* Users with this role */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-slate-500 mb-2">Users with this role</p>
          {(() => {
            const usersForRole = roleUsers[activeTab] || [];
            return usersForRole.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {usersForRole.map((u) => (
                  <span
                    key={u.id}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${
                      activeTab === 'ADMIN'
                        ? 'bg-amber-50 text-amber-700 ring-amber-600/20'
                        : 'bg-blue-50 text-blue-700 ring-blue-600/20'
                    }`}
                  >
                    {activeTab === 'ADMIN' ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
                    {u.name || u.email}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No users with {activeTab === 'ADMIN' ? 'Admin' : 'Client'} role yet.</p>
            );
          })()}
        </div>

        {/* Dual-Pane Widget */}
        <DualPanePermissions permissions={perms} onPermissionsChange={setPerms} />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleSave} disabled={pending}>
            {pending ? 'Saving...' : `Save ${activeTab === 'ADMIN' ? 'Admin' : 'Client'} Defaults`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Add User Dialog                                                     */
/* ------------------------------------------------------------------ */

function AddUserDialog({
  open,
  onOpenChange,
  isSuperAdmin,
  defaultPermissions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSuperAdmin: boolean;
  defaultPermissions: { ADMIN: Record<string, boolean>; CLIENT: Record<string, boolean> };
}) {
  const [pending, startTransition] = useTransition();
  const [role, setRole] = useState('CLIENT');
  const [perms, setPerms] = useState<Record<string, boolean>>({ ...defaultPermissions.CLIENT });

  function handleRoleChange(newRole: string | null) {
    if (!newRole) return;
    setRole(newRole);
    if (newRole === 'ADMIN') {
      setPerms({ ...defaultPermissions.ADMIN });
    } else if (newRole === 'CLIENT') {
      setPerms({ ...defaultPermissions.CLIENT });
    }
  }

  function handleSubmit(formData: FormData) {
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    formData.set('role', role);
    startTransition(async () => {
      const r = await createUser(formData, role !== 'SUPER_ADMIN' ? perms : undefined);
      if (r.ok) {
        toast.success('User created');
        onOpenChange(false);
        setRole('CLIENT');
        setPerms({ ...defaultPermissions.CLIENT });
      } else {
        toast.error(r.error || 'Failed to create user');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
          <DialogDescription>Create a new user account and configure their permissions.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">Name</Label>
              <Input id="add-name" name="name" placeholder="Full name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-email">Email</Label>
              <Input id="add-email" name="email" type="email" placeholder="user@example.com" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="add-password">Password</Label>
              <Input
                id="add-password"
                name="password"
                type="password"
                placeholder="Min 6 characters"
                minLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-confirm-password">Password (confirm)</Label>
              <Input
                id="add-confirm-password"
                name="confirmPassword"
                type="password"
                placeholder="Re-enter password"
                minLength={6}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={handleRoleChange}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {isSuperAdmin && <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>}
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="CLIENT">Client</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Permissions — hidden for SUPER_ADMIN */}
          {role !== 'SUPER_ADMIN' && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">User Permissions</Label>
                <span className="text-xs text-slate-400">
                  Pre-filled with {role === 'ADMIN' ? 'Admin' : 'Client'} defaults
                </span>
              </div>
              <DualPanePermissions permissions={perms} onPermissionsChange={setPerms} />
            </div>
          )}
          {role === 'SUPER_ADMIN' && (
            <p className="text-xs text-purple-600 bg-purple-50 rounded-md px-3 py-2">
              Super Admin always has full access to all features. No permissions to configure.
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Edit User Dialog                                                    */
/* ------------------------------------------------------------------ */

function EditUserDialog({
  user,
  onOpenChange,
  isSuperAdmin,
  defaultPermissions,
  userPermissions,
}: {
  user: UserRow | null;
  onOpenChange: (open: boolean) => void;
  isSuperAdmin: boolean;
  defaultPermissions: { ADMIN: Record<string, boolean>; CLIENT: Record<string, boolean> };
  userPermissions: Record<string, UserPermData>;
}) {
  const [pending, startTransition] = useTransition();
  const [role, setRole] = useState(user?.role || 'CLIENT');
  const [perms, setPerms] = useState<Record<string, boolean>>({});

  // Sync state when user changes
  const [prevUser, setPrevUser] = useState(user);
  if (user !== prevUser) {
    setPrevUser(user);
    if (user) {
      setRole(user.role);
      const permData = userPermissions[user.id];
      if (permData) {
        setPerms({ ...permData.permissions });
      } else if (user.role === 'ADMIN') {
        setPerms({ ...defaultPermissions.ADMIN });
      } else {
        setPerms({ ...defaultPermissions.CLIENT });
      }
    }
  }

  function handleRoleChange(newRole: string | null) {
    if (!newRole) return;
    setRole(newRole);
    if (newRole === 'ADMIN') {
      setPerms({ ...defaultPermissions.ADMIN });
    } else if (newRole === 'CLIENT') {
      setPerms({ ...defaultPermissions.CLIENT });
    }
  }

  function handleSubmit(formData: FormData) {
    if (!user) return;
    formData.set('id', user.id);
    formData.set('role', role);
    startTransition(async () => {
      const r = await updateUser(formData, role !== 'SUPER_ADMIN' ? perms : undefined);
      if (r.ok) {
        toast.success('User updated');
        onOpenChange(false);
      } else {
        toast.error(r.error || 'Failed to update user');
      }
    });
  }

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>Update user details and permissions.</DialogDescription>
        </DialogHeader>
        {user && (
          <form action={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input id="edit-name" name="name" defaultValue={user.name || ''} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input id="edit-email" name="email" type="email" defaultValue={user.email} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={handleRoleChange}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isSuperAdmin && <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>}
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="CLIENT">Client</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Permissions */}
            {role !== 'SUPER_ADMIN' && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">User Permissions</Label>
                  {userPermissions[user.id]?.isCustom && (
                    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700 ring-1 ring-green-600/20">
                      Custom overrides active
                    </span>
                  )}
                </div>
                <DualPanePermissions permissions={perms} onPermissionsChange={setPerms} />
              </div>
            )}
            {role === 'SUPER_ADMIN' && (
              <p className="text-xs text-purple-600 bg-purple-50 rounded-md px-3 py-2">
                Super Admin always has full access to all features.
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Reset Password Dialog                                               */
/* ------------------------------------------------------------------ */

function ResetPasswordDialog({
  user,
  onOpenChange,
}: {
  user: UserRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    if (!user) return;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    formData.set('id', user.id);
    startTransition(async () => {
      const r = await resetUserPassword(formData);
      if (r.ok) {
        toast.success(`Password reset for ${user.email}`);
        onOpenChange(false);
      } else {
        toast.error('Failed to reset password');
      }
    });
  }

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>
            Set a new password for <strong>{user?.email}</strong>.
          </DialogDescription>
        </DialogHeader>
        {user && (
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-password">New Password</Label>
              <Input
                id="reset-password"
                name="password"
                type="password"
                placeholder="Min 6 characters"
                minLength={6}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-confirm-password">Confirm Password</Label>
              <Input
                id="reset-confirm-password"
                name="confirmPassword"
                type="password"
                placeholder="Re-enter password"
                minLength={6}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? 'Resetting...' : 'Reset Password'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Delete User Confirmation Dialog                                     */
/* ------------------------------------------------------------------ */

function DeleteUserDialog({
  user,
  onOpenChange,
}: {
  user: UserRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!user) return;
    startTransition(async () => {
      const r = await deleteUser(user.id);
      if (r.ok) {
        toast.success('User deleted');
        onOpenChange(false);
      } else {
        toast.error(r.error || 'Failed to delete user');
      }
    });
  }

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete User</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{user?.email}</strong>? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={pending}>
            {pending ? 'Deleting...' : 'Delete User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { savePermissionsAction } from './actions';
import type { UserRole } from '@/lib/generated/prisma/client';
import { ShieldCheck, Shield, User } from 'lucide-react';
import { DualPanePermissions } from '@/app/(admin)/settings/users/users-manager';

interface RoleUser {
  id: string;
  name: string | null;
  email: string;
}

interface Props {
  adminPermissions: Record<string, boolean>;
  clientPermissions: Record<string, boolean>;
  roleUsers: Record<string, RoleUser[]>;
}

type TabMode = 'ADMIN' | 'CLIENT';

export function PermissionsManager({
  adminPermissions,
  clientPermissions,
  roleUsers,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabMode>('ADMIN');
  const [adminPerms, setAdminPerms] = useState(adminPermissions);
  const [clientPerms, setClientPerms] = useState(clientPermissions);
  const [pending, startTransition] = useTransition();

  function getActivePerms(): Record<string, boolean> {
    return activeTab === 'ADMIN' ? adminPerms : clientPerms;
  }

  function handlePermissionsChange(newPerms: Record<string, boolean>) {
    if (activeTab === 'ADMIN') {
      setAdminPerms(newPerms);
    } else {
      setClientPerms(newPerms);
    }
  }

  function handleSave() {
    startTransition(async () => {
      const r = await savePermissionsAction(activeTab as UserRole, activeTab === 'ADMIN' ? adminPerms : clientPerms);
      if (r.ok) {
        toast.success(`${activeTab === 'ADMIN' ? 'Admin' : 'Client'} permissions saved`);
      } else {
        toast.error(r.error || 'Failed to save permissions');
      }
    });
  }

  const perms = getActivePerms();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Role Permissions</h2>
        <p className="text-sm text-slate-500">
          Configure default permissions for each role. Per-user overrides can be set when creating or editing a user in the Users tab.
        </p>
      </div>

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

      {/* Role info */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Users with this role</h3>
        {activeTab === 'ADMIN' && (roleUsers.SUPER_ADMIN || []).length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-slate-400 uppercase font-medium mb-1.5">Super Admin (full access)</p>
            <div className="flex flex-wrap gap-2">
              {(roleUsers.SUPER_ADMIN || []).map((u) => (
                <span key={u.id} className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 ring-1 ring-purple-600/20">
                  <ShieldCheck className="h-3 w-3" />
                  {u.name || u.email}
                </span>
              ))}
            </div>
          </div>
        )}
        {(() => {
          const usersForRole = roleUsers[activeTab] || [];
          return usersForRole.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {usersForRole.map((u) => (
                <span
                  key={u.id}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
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
            <p className="text-sm text-slate-400">No users with {activeTab === 'ADMIN' ? 'Admin' : 'Client'} role yet.</p>
          );
        })()}
      </div>

      {/* Dual-Pane Permission Widget */}
      <DualPanePermissions
        permissions={perms}
        onPermissionsChange={handlePermissionsChange}
      />

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={pending}>
          {pending ? 'Saving...' : `Save ${activeTab === 'ADMIN' ? 'Admin' : 'Client'} Permissions`}
        </Button>
      </div>
    </div>
  );
}

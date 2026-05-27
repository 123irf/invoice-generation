'use client';

import { useState, useEffect, useTransition } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createClient, updateClient, getUnlinkedClientUsers } from './actions';

type UnlinkedUser = { id: string; email: string; name: string | null };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: {
    id: string;
    businessName: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    phone: string | null;
    address: string | null;
    extraInfo: string | null;
    website: string | null;
  };
}

export function ClientFormDialog({ open, onOpenChange, client }: Props) {
  const isEdit = !!client;
  const [pending, startTransition] = useTransition();

  // User account section (only for new clients)
  const [userMode, setUserMode] = useState<'none' | 'new' | 'existing'>('none');
  const [userPassword, setUserPassword] = useState('');
  const [existingUserId, setExistingUserId] = useState('');
  const [unlinkedUsers, setUnlinkedUsers] = useState<UnlinkedUser[]>([]);

  // Load unlinked users when dialog opens in create mode
  useEffect(() => {
    if (open && !isEdit) {
      getUnlinkedClientUsers().then(setUnlinkedUsers);
      setUserMode('none');
      setUserPassword('');
      setExistingUserId('');
    }
  }, [open, isEdit]);

  function onSubmit(formData: FormData) {
    // Inject user account fields
    if (!isEdit) {
      if (userMode === 'new') {
        formData.set('createUserAccount', 'true');
        formData.set('userPassword', userPassword);
      } else if (userMode === 'existing' && existingUserId) {
        formData.set('existingUserId', existingUserId);
      }
    }

    startTransition(async () => {
      const result = isEdit
        ? await updateClient(client.id, formData)
        : await createClient(formData);
      if (result.ok) {
        toast.success(isEdit ? 'Client updated' : 'Client created');
        onOpenChange(false);
      } else {
        toast.error('Failed: ' + ((result as { error?: string }).error || 'Validation error'));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Client' : 'Add Client'}</DialogTitle>
          {!isEdit && (
            <DialogDescription>
              Create a new client. Optionally give them a login account.
            </DialogDescription>
          )}
        </DialogHeader>
        <form action={onSubmit} className="space-y-5">
          {/* Row 1: Business Name (full width) */}
          <div className="space-y-2">
            <Label htmlFor="businessName">Business / Client Name *</Label>
            <Input id="businessName" name="businessName" defaultValue={client?.businessName} required />
          </div>

          {/* Row 2: First Name + Last Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" name="firstName" defaultValue={client?.firstName ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" name="lastName" defaultValue={client?.lastName ?? ''} />
            </div>
          </div>

          {/* Row 3: Email + Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" name="email" type="email" defaultValue={client?.email} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={client?.phone ?? ''} />
            </div>
          </div>

          {/* Row 4: Website (full width) */}
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input id="website" name="website" defaultValue={client?.website ?? ''} />
          </div>

          {/* Row 5: Address + Extra Info side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" name="address" rows={3} defaultValue={client?.address ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="extraInfo">Extra Info</Label>
              <Textarea
                id="extraInfo"
                name="extraInfo"
                rows={3}
                defaultValue={client?.extraInfo ?? ''}
                placeholder="GST number, VAT, additional contact info..."
              />
            </div>
          </div>

          {/* User Account Section — only when creating */}
          {!isEdit && (
            <div className="border-t pt-4 space-y-3">
              <Label className="text-sm font-semibold">User Account (Login Access)</Label>
              <p className="text-xs text-slate-500">
                Link a user account so this client can log in to view their quotes and invoices.
              </p>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Account type</Label>
                  <Select
                    value={userMode}
                    onValueChange={(v) => {
                      if (v) setUserMode(v as 'none' | 'new' | 'existing');
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false} side="bottom">
                      <SelectItem value="none">No login account</SelectItem>
                      <SelectItem value="new">Create new user account</SelectItem>
                      {unlinkedUsers.length > 0 && (
                        <SelectItem value="existing">Link existing user</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {userMode === 'new' && (
                  <div className="space-y-2">
                    <Label htmlFor="userPassword">Password for client login</Label>
                    <Input
                      id="userPassword"
                      type="password"
                      placeholder="Min 6 characters"
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                      minLength={6}
                      required
                    />
                    <p className="text-xs text-slate-500">
                      Client logs in with the email above and this password.
                    </p>
                  </div>
                )}

                {userMode === 'existing' && (
                  <div className="space-y-2">
                    <Label>Select user</Label>
                    <Select
                      value={existingUserId}
                      onValueChange={(v) => { if (v) setExistingUserId(v); }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a user..." />
                      </SelectTrigger>
                      <SelectContent>
                        {unlinkedUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name ? `${u.name} (${u.email})` : u.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">
                      Only client-role users not linked to another client are shown.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Client'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

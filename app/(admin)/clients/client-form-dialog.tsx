'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createClient, updateClient } from './actions';

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

  function onSubmit(formData: FormData) {
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Client' : 'Add Client'}</DialogTitle>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="businessName">Business / Client Name *</Label>
            <Input id="businessName" name="businessName" defaultValue={client?.businessName} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" name="firstName" defaultValue={client?.firstName ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" name="lastName" defaultValue={client?.lastName ?? ''} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" name="email" type="email" defaultValue={client?.email} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" defaultValue={client?.phone ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" name="address" rows={3} defaultValue={client?.address ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="extraInfo">Extra Info</Label>
            <Textarea
              id="extraInfo"
              name="extraInfo"
              rows={2}
              defaultValue={client?.extraInfo ?? ''}
              placeholder="GST number, VAT, additional contact info..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input id="website" name="website" defaultValue={client?.website ?? ''} />
          </div>
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

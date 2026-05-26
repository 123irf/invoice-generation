'use client';

import { useState, useTransition } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ClientFormDialog } from './client-form-dialog';
import { deleteClient } from './actions';

export function ClientActions({ client }: { client: any }) {
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onDelete() {
    if (!confirm(`Delete ${client.businessName}? This cannot be undone.`)) return;
    startTransition(async () => {
      const r = await deleteClient(client.id);
      if (r.ok) toast.success('Client deleted');
      else toast.error(r.error || 'Failed to delete');
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon" />}
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>Edit</DropdownMenuItem>
          <DropdownMenuItem
            className="text-red-600"
            onClick={onDelete}
            disabled={pending}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ClientFormDialog open={editOpen} onOpenChange={setEditOpen} client={client} />
    </>
  );
}

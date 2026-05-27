'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ClientFormDialog } from './client-form-dialog';

export function ClientsToolbar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        New Client
      </Button>
      <ClientFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

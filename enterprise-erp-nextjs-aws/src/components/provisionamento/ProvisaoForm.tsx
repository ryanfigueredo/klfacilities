'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ProvFormDialog } from '@/components/provisionamento/ProvFormDialog';

export function ProvisaoForm() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Nova Provisão
      </Button>
      <ProvFormDialog
        open={open}
        onOpenChange={setOpen}
        mode="create"
        onSaved={() => {
          if (typeof window !== 'undefined') window.location.reload();
        }}
      />
    </div>
  );
}

'use client';

import { LogIn } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

import { LoginDialog } from './LoginDialog';

export function LoginButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <LoginDialog
      open={isOpen}
      onOpenChange={setIsOpen}
      trigger={
        <Button size="lg" className="gap-2">
          <LogIn className="h-4 w-4" />
          Entrar
        </Button>
      }
    />
  );
}

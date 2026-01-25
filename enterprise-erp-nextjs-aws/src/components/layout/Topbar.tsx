'use client';

import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import UserMenu from '@/components/user-menu';
import { NotificationsBell } from '@/components/layout/NotificationsBell';

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 bg-card border-b border-border">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Left side - Mobile menu */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuClick}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Right side - User menu */}
        <div className="flex items-center gap-4">
          {/* Theme toggle */}
          <ThemeToggle />
          <NotificationsBell />

          <UserMenu />
        </div>
      </div>
    </header>
  );
}

'use client';

import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Settings, User } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function UserMenu() {
  const { data } = useSWR('/api/me', fetcher);
  const router = useRouter();

  const name = data?.name ?? 'Usuário';
  const email = data?.email ?? '';
  const cargo = data?.roleLabel ?? data?.role ?? '';
  const photoUrl = data?.photoUrl;
  const initials = name
    .split(' ')
    .map((s: string) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const goPerfil = () => router.push('/perfil');
  const doLogout = async () => {
    try {
      // Usar NextAuth signOut com redirecionamento imediato
      const { signOut } = await import('next-auth/react');
      await signOut({
        callbackUrl: '/login',
        redirect: true,
      });
    } catch (error) {
      // Fallback para logout manual
      await fetch('/api/auth/logout', { method: 'POST' });
      router.replace('/login');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full border w-9 h-9 grid place-items-center">
          <Avatar className="w-8 h-8">
            <AvatarImage src={photoUrl} alt={name} />
            <AvatarFallback>{initials || 'UK'}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="space-y-0.5">
          <div className="font-medium">{name}</div>
          <div className="text-xs text-muted-foreground">{email}</div>
          {cargo && <div className="text-xs">{cargo}</div>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={goPerfil}>
          <User className="w-4 h-4 mr-2" /> Perfil
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={doLogout} className="text-red-600">
          <LogOut className="w-4 h-4 mr-2" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

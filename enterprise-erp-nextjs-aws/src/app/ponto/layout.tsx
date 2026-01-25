'use client';

import { usePathname } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function PontoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // Rotas públicas que NÃO devem usar AppShell (não requerem autenticação)
  const publicRoutes = [
    '/ponto/scan',
    '/ponto/validar',
    '/ponto/termo-ciencia',
  ];
  
  // Verificar se é uma rota pública (começa com /ponto/u/ também é pública)
  const isPublicRoute = 
    publicRoutes.some(route => pathname?.startsWith(route)) ||
    pathname?.startsWith('/ponto/u/');
  
  // Se for rota pública, retornar apenas children sem AppShell
  if (isPublicRoute) {
    return <>{children}</>;
  }
  
  // Para rotas administrativas, usar AppShell (requer autenticação)
  const AppShell = require('@/components/layout/AppShell')
    .AppShell as React.FC<{
    children: React.ReactNode;
  }>;
  return <AppShell>{children}</AppShell>;
}

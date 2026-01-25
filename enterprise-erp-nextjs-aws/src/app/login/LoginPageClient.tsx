'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LoginDialog } from '@/components/auth/LoginDialog';
import { removeLeadsterScript } from '@/components/landing/LeadsterIntegration';
import { Logo } from '@/components/ui/logo';

export function LoginPageClient() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Remover Leadster da tela de login
  useEffect(() => {
    removeLeadsterScript();
  }, []);

  useEffect(() => {
    if (status === 'loading') return; // Ainda carregando

    if (session) {
      // Redirecionar baseado no role
      // Apenas MASTER e ADMIN vão para /dashboard
      const role = session.user?.role;
      let redirectPath = '/ponto/admin'; // Página padrão segura
      
      if (role === 'MASTER' || role === 'ADMIN') {
        redirectPath = '/dashboard';
      } else if (role === 'RH' || role === 'OPERACIONAL') {
        redirectPath = '/ponto/admin';
      } else if (role === 'JURIDICO') {
        redirectPath = '/rh/processos';
      } else if (role === 'SUPERVISOR' || role === 'LAVAGEM') {
        redirectPath = '/operacional/checklists'; // Supervisores vão direto para checklists
      }
      
      if (typeof window !== 'undefined') {
        window.location.replace(redirectPath);
      } else {
        router.replace(redirectPath);
      }
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-3">
              <Logo size="lg" variant="login" />
            </div>
            <p className="text-muted-foreground mt-2">
              Sistema de Gestão Empresarial
            </p>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <Logo size="lg" variant="login" />
          </div>
          <p className="text-muted-foreground mt-2">
            Sistema de Gestão Empresarial
          </p>
        </div>

        <LoginDialog open={true} onOpenChange={() => {}} />

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Ao usar este sistema, você concorda com nossa{' '}
            <Link
              href="/compliance/privacidade"
              className="text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Política de Privacidade
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

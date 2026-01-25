'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function LoginDialog({ open, onOpenChange, trigger }: LoginDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error('Credenciais inválidas');
        setIsLoading(false);
      } else {
        toast.success('Login realizado com sucesso!');
        onOpenChange(false);
        reset();

        // Aguardar um pouco para a sessão ser atualizada
        setTimeout(async () => {
          // Buscar sessão atualizada
          const sessionRes = await fetch('/api/auth/session');
          const sessionData = await sessionRes.json();
          const userRole = sessionData?.user?.role;

          // Redirecionar baseado no role
          // Apenas MASTER e ADMIN vão para /dashboard
          let redirectPath = '/ponto/admin'; // Página padrão segura

          if (userRole === 'MASTER' || userRole === 'ADMIN') {
            redirectPath = '/dashboard';
          } else if (userRole === 'RH' || userRole === 'OPERACIONAL') {
            redirectPath = '/ponto/admin';
          } else if (userRole === 'JURIDICO') {
            redirectPath = '/rh/processos';
          } else if (userRole === 'SUPERVISOR' || userRole === 'LAVAGEM') {
            redirectPath = '/operacional/checklists'; // Supervisores vão direto para checklists
          }

          router.push(redirectPath);
        }, 200);
      }
    } catch {
      toast.error('Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault();
      handleSubmit(onSubmit)();
    }
  };

  return (
    <>
      {trigger && <div onClick={() => onOpenChange(true)}>{trigger}</div>}

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="sm:max-w-md"
          onKeyDown={handleKeyDown}
          a11yTitle="Entrar no Sistema"
        >
          <DialogHeader>
            <DialogTitle>Entrar no Sistema</DialogTitle>
            <DialogDescription>
              Digite suas credenciais para acessar o sistema
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Digite seu email"
                {...register('email')}
                aria-describedby={errors.email ? 'email-error' : undefined}
                disabled={isLoading}
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Digite sua senha"
                {...register('password')}
                aria-describedby={
                  errors.password ? 'password-error' : undefined
                }
                disabled={isLoading}
              />
              {errors.password && (
                <p id="password-error" className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>

            <div className="text-center">
              <Link
                href="/forgot-password"
                className="text-sm text-blue-600 hover:underline"
                onClick={() => onOpenChange(false)}
              >
                Esqueci minha senha
              </Link>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

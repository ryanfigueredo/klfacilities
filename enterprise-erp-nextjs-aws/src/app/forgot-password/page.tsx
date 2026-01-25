'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao solicitar reset de senha');
      }

      setIsSuccess(true);
      toast.success('Email enviado com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao solicitar reset de senha');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md space-y-6 p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-green-600">Email Enviado!</h1>
            <p className="text-muted-foreground mt-2">
              Se o email estiver cadastrado, você receberá um link para redefinir sua senha.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Verifique sua caixa de entrada e também a pasta de spam.
            </p>
          </div>
          
          <div className="space-y-4">
            <Link href="/login" className="block">
              <Button className="w-full">Voltar ao Login</Button>
            </Link>
            
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsSuccess(false)}
            >
              Solicitar Novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Esqueci minha senha</h1>
          <p className="text-muted-foreground mt-2">
            Digite seu email para receber um link de redefinição de senha
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              {...register('email')}
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Enviando...' : 'Enviar Link de Redefinição'}
          </Button>
        </form>

        <div className="text-center">
          <Link href="/login" className="text-sm text-blue-600 hover:underline">
            Voltar ao Login
          </Link>
        </div>
      </div>
    </div>
  );
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import crypto from 'crypto';

const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = forgotPasswordSchema.parse(body);

    // Verificar se o usuário existe
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    });

    // Sempre retornar sucesso para evitar vazamento de informações
    if (!user) {
      return NextResponse.json({
        message:
          'Se o email estiver cadastrado, você receberá um link para redefinir sua senha.',
      });
    }

    // Gerar token único
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Invalidar tokens anteriores do usuário
    await prisma.passwordResetToken.updateMany({
      where: { email, used: false },
      data: { used: true },
    });

    // Criar novo token
    await prisma.passwordResetToken.create({
      data: {
        email,
        token,
        expiresAt,
      },
    });

    // Construir URL de reset
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    // Enviar email
    try {
      const { sendPasswordResetEmail } = await import('@/lib/email');
      await sendPasswordResetEmail({
        email: user.email,
        name: user.name,
        resetUrl,
      });
    } catch (emailError: any) {
      console.error('Erro ao enviar email:', emailError);
      // Log detalhado do erro para debug
      if (
        emailError.message?.includes('Not authorized') ||
        emailError.message?.includes('403')
      ) {
        console.error(' ATENÇÃO: Domínio de email não autorizado no Resend.');
        console.error(
          '   Configure RESEND_FROM_EMAIL no .env com um domínio verificado.'
        );
        console.error(
          '   Ou verifique o domínio klfacilities.com.br no painel do Resend.'
        );
      }
      // Continuar mesmo se o email falhar para não vazar informações
    }

    return NextResponse.json({
      message:
        'Se o email estiver cadastrado, você receberá um link para redefinir sua senha.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Erro ao solicitar reset de senha:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

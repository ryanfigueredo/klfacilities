import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { assertRole } from '@/lib/rbac';
import { logAudit } from '@/lib/audit/log';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const resetPasswordSchema = z.object({
  novaSenha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // RBAC: MASTER, ADMIN e RH podem resetar senhas
    assertRole(session.user.role as 'MASTER' | 'ADMIN' | 'RH' | 'SUPERVISOR' | undefined, ['MASTER', 'ADMIN', 'RH']);

    const body = await request.json();
    const validatedData = resetPasswordSchema.parse(body);

    // Verificar se o usuário existe
    const usuario = await prisma.user.findUnique({
      where: { id },
    });

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(validatedData.novaSenha, 12);

    // Atualizar senha
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    // Log audit
    await logAudit({
      action: 'usuario.resetPassword',
      resource: 'User',
      resourceId: id,
      success: true,
      ip: '127.0.0.1',
      userAgent: 'api',
      method: 'POST',
      url: `/api/usuarios/${id}/reset-password`,
    });

    return NextResponse.json({ message: 'Senha redefinida com sucesso' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Erro ao redefinir senha:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

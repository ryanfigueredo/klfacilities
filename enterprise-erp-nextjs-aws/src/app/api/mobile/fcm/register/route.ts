import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const registerTokenSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório'),
  deviceId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const me = await getCurrentUser(req);
    if (!me?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const validated = registerTokenSchema.parse(body);

    // Verificar se o token já existe para este usuário
    const existingToken = await prisma.fcmToken.findUnique({
      where: { token: validated.token },
    });

    if (existingToken) {
      // Atualizar se for de outro usuário ou atualizar lastUsedAt
      if (existingToken.userId !== me.id) {
        await prisma.fcmToken.update({
          where: { id: existingToken.id },
          data: {
            userId: me.id,
            deviceId: validated.deviceId,
            lastUsedAt: new Date(),
          },
        });
      } else {
        await prisma.fcmToken.update({
          where: { id: existingToken.id },
          data: {
            lastUsedAt: new Date(),
            deviceId: validated.deviceId,
          },
        });
      }
    } else {
      // Criar novo token
      await prisma.fcmToken.create({
        data: {
          userId: me.id,
          token: validated.token,
          deviceId: validated.deviceId,
          lastUsedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Token FCM registrado com sucesso',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Erro ao registrar token FCM:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

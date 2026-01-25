import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const me = await getCurrentUser();

    if (!me?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!can(me.role, 'logs', 'list')) {
      return NextResponse.json(forbiddenPayload('logs', 'list'), {
        status: 403,
      });
    }

    const { searchParams } = new URL(request.url);
    const to = searchParams.get('to') || '';
    const provider = searchParams.get('provider') || '';
    const success = searchParams.get('success');
    const start = searchParams.get('start') || '';
    const end = searchParams.get('end') || '';
    const take = Number(searchParams.get('take') || 50);
    const cursor = searchParams.get('cursor') || undefined;

    const where: any = {};

    if (to) {
      where.to = { contains: to, mode: 'insensitive' as const };
    }

    if (provider) {
      where.provider = provider;
    }

    if (success !== null && success !== undefined && success !== '') {
      where.success = success === 'true';
    }

    if (start || end) {
      where.sentAt = {
        gte: start ? new Date(start) : undefined,
        lte: end ? new Date(end + 'T23:59:59.999Z') : undefined,
      };
    }

    const messages = await prisma.whatsAppMessageLog.findMany({
      where,
      take: take + 1,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { sentAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const hasMore = messages.length > take;
    const data = hasMore ? messages.slice(0, take) : messages;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    return NextResponse.json({
      messages: data,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error('Erro ao buscar mensagens WhatsApp:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}


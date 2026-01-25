import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const escopo = await prisma.checklistEscopo.findUnique({
      where: { id },
      select: {
        template: {
          select: {
            titulo: true,
          },
        },
        unidade: {
          select: {
            nome: true,
          },
        },
      },
    });

    if (!escopo) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const breadcrumbTitle = `${escopo.template.titulo} - ${escopo.unidade?.nome || 'Unidade'}`;

    return NextResponse.json({ title: breadcrumbTitle });
  } catch (error) {
    console.error('Erro ao buscar título do breadcrumb:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

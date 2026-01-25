import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import { prisma } from '@/lib/prisma';
import { uploadBufferToS3 } from '@/lib/s3';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ respostaId: string }> }
) {
  try {
    const me = await getCurrentUser();

    if (!me) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    // Verificar se o usuário tem permissão (gerente/operacional/admin)
    if (!can(me.role, 'checklists', 'update')) {
      return NextResponse.json(forbiddenPayload('checklists', 'update'), {
        status: 403,
      });
    }

    const { respostaId } = await params;
    const body = await request.json();
    const { assinaturaDataUrl } = body;

    if (!assinaturaDataUrl) {
      return NextResponse.json(
        { error: 'validation_error', message: 'Assinatura é obrigatória' },
        { status: 422 }
      );
    }

    // Buscar a resposta do checklist
    const resposta = await prisma.checklistResposta.findUnique({
      where: { id: respostaId },
      include: {
        supervisor: true,
      },
    });

    if (!resposta) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // Converter data URL para Buffer
    const base64Data = assinaturaDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Upload para S3
    const s3Url = await uploadBufferToS3({
      buffer,
      originalName: `assinatura-gerente-${respostaId}-${Date.now()}.png`,
      contentType: 'image/png',
      prefix: 'checklists/assinaturas-gerente',
    });

    // Atualizar resposta com assinatura do gerente
    const respostaAtualizada = await prisma.checklistResposta.update({
      where: { id: respostaId },
      data: {
        gerenteAssinaturaFotoUrl: s3Url,
        gerenteAssinadoEm: new Date(),
        gerenteAssinadoPorId: me.id,
      },
      include: {
        gerenteAssinadoPor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      resposta: respostaAtualizada,
    });
  } catch (error) {
    console.error('Erro ao salvar assinatura do gerente:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Não foi possível salvar a assinatura' },
      { status: 500 }
    );
  }
}


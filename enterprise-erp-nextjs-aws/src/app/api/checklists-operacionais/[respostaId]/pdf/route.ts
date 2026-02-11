import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateChecklistPDF } from '@/lib/checklists-operacionais/pdf-generator';

// Função auxiliar para sanitizar nomes de arquivo removendo acentos e caracteres especiais
function sanitizeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove caracteres especiais exceto espaços e hífens
    .replace(/\s+/g, '-') // Substitui espaços por hífens
    .toLowerCase();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ respostaId: string }> }
) {
  try {
    const me = await getCurrentUser();
    if (!me) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    // Verificar se o usuário pode ver checklists (OPERACIONAL, MASTER, ADMIN)
    if (!['OPERACIONAL', 'MASTER', 'ADMIN'].includes(me.role)) {
      return NextResponse.json(
        { error: 'Apenas operacional, master ou admin podem baixar PDFs' },
        { status: 403 }
      );
    }

    const { respostaId } = await params;

    // Buscar resposta completa (inclui assinaturaFotoUrl e gerenteAssinaturaFotoUrl para o PDF)
    const resposta = await prisma.checklistResposta.findUnique({
      where: { id: respostaId },
      include: {
        template: {
          include: {
            grupos: {
              orderBy: { ordem: 'asc' },
              include: {
                perguntas: {
                  orderBy: { ordem: 'asc' },
                },
              },
            },
          },
        },
        unidade: {
          select: {
            id: true,
            nome: true,
          },
        },
        grupo: {
          select: {
            id: true,
            nome: true,
          },
        },
        supervisor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        gerenteAssinadoPor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        respostas: {
          include: {
            pergunta: true,
          },
        },
      },
    });

    // Garantir que os campos de assinatura e gerente existam no objeto para o PDF
    const respostaParaPdf = resposta
      ? {
          ...resposta,
          assinaturaFotoUrl: resposta.assinaturaFotoUrl ?? null,
          gerenteAssinaturaFotoUrl: resposta.gerenteAssinaturaFotoUrl ?? null,
          gerenteAssinadoEm: resposta.gerenteAssinadoEm ?? null,
          gerenteAssinadoPor: resposta.gerenteAssinadoPor ?? null,
        }
      : null;

    if (!resposta) {
      return NextResponse.json(
        { error: 'Resposta não encontrada' },
        { status: 404 }
      );
    }

    // Gerar PDF (com URLs de assinatura do supervisor e do gerente)
    const pdfBuffer = await generateChecklistPDF(respostaParaPdf as any);

    const dataStr = new Date(resposta.submittedAt || resposta.createdAt).toISOString().split('T')[0];
    const nomeArquivo = `checklist-${sanitizeFileName(resposta.unidade.nome)}-${dataStr}.pdf`;

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    return NextResponse.json(
      {
        error: 'Erro ao gerar PDF',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}


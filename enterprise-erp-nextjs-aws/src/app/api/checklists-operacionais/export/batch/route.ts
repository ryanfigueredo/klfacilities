import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateChecklistPDF } from '@/lib/checklists-operacionais/pdf-generator';
import { ChecklistRespostaStatus } from '@prisma/client';
import JSZip from 'jszip';

export async function GET(request: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    // Verificar se o usuário pode ver checklists (OPERACIONAL, MASTER, ADMIN)
    if (!['OPERACIONAL', 'MASTER', 'ADMIN'].includes(me.role)) {
      return NextResponse.json(
        { error: 'Apenas operacional, master ou admin podem exportar PDFs' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const grupoId = searchParams.get('grupoId');
    const mes = searchParams.get('mes'); // formato: YYYY-MM (ex: 2025-11)

    if (!grupoId || !mes) {
      return NextResponse.json(
        { error: 'grupoId e mes são obrigatórios (formato: YYYY-MM)' },
        { status: 400 }
      );
    }

    // Validar formato do mês
    const mesMatch = mes.match(/^(\d{4})-(\d{2})$/);
    if (!mesMatch) {
      return NextResponse.json(
        { error: 'Formato de mês inválido. Use YYYY-MM (ex: 2025-11)' },
        { status: 400 }
      );
    }

    const [, ano, mesNum] = mesMatch;
    const dataInicio = new Date(Number(ano), Number(mesNum) - 1, 1);
    const dataFim = new Date(Number(ano), Number(mesNum), 0, 23, 59, 59, 999);

    // Buscar grupo para validar e obter nome
    const grupo = await prisma.grupo.findUnique({
      where: { id: grupoId },
      select: { id: true, nome: true },
    });

    if (!grupo) {
      return NextResponse.json(
        { error: 'Grupo não encontrado' },
        { status: 404 }
      );
    }

    // Buscar todas as respostas do grupo no período
    const respostas = await prisma.checklistResposta.findMany({
      where: {
        status: ChecklistRespostaStatus.CONCLUIDO,
        grupoId: grupoId,
        submittedAt: {
          gte: dataInicio,
          lte: dataFim,
        },
      },
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
      orderBy: {
        submittedAt: 'desc',
      },
    });

    if (respostas.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum checklist encontrado para o grupo e período especificados' },
        { status: 404 }
      );
    }

    // Criar ZIP
    const zip = new JSZip();

    // Gerar PDFs e adicionar ao ZIP
    for (const resposta of respostas) {
      try {
        const pdfBuffer = await generateChecklistPDF(resposta as any);
        
        // Nome do arquivo: checklist-{unidade}-{data}.pdf
        const dataStr = resposta.submittedAt
          ? new Date(resposta.submittedAt).toISOString().split('T')[0]
          : new Date(resposta.createdAt).toISOString().split('T')[0];
        
        // Sanitizar nome do arquivo removendo acentos e caracteres especiais
        const sanitizeFileName = (name: string): string => {
          return name
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
            .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove caracteres especiais exceto espaços e hífens
            .replace(/\s+/g, '-') // Substitui espaços por hífens
            .toLowerCase();
        };
        
        const nomeArquivo = `checklist-${sanitizeFileName(resposta.unidade.nome)}-${dataStr}.pdf`;
        
        zip.file(nomeArquivo, pdfBuffer);
      } catch (error) {
        console.error(`Erro ao gerar PDF para resposta ${resposta.id}:`, error);
        // Continuar com os outros PDFs mesmo se um falhar
      }
    }

    // Gerar buffer do ZIP
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    // Nome do arquivo ZIP (sanitizar também)
    const sanitizeFileName = (name: string): string => {
      return name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove caracteres especiais exceto espaços e hífens
        .replace(/\s+/g, '-') // Substitui espaços por hífens
        .toLowerCase();
    };
    const nomeZip = `checklists-${sanitizeFileName(grupo.nome)}-${mes}.zip`;

    return new NextResponse(zipBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${nomeZip}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Erro ao exportar PDFs em lote:', error);
    return NextResponse.json(
      {
        error: 'Erro ao exportar PDFs em lote',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}


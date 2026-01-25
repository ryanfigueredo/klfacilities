import { NextRequest, NextResponse } from 'next/server';
import { ChecklistRespostaStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import { getSupervisorScope } from '@/lib/supervisor-scope';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ExcelJS from 'exceljs';

export async function GET(request: NextRequest) {
  const me = await getCurrentUser();

  if (!me) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!can(me.role, 'checklists', 'list')) {
    return NextResponse.json(forbiddenPayload('checklists', 'list'), {
      status: 403,
    });
  }

  const { searchParams } = new URL(request.url);
  const templateId = searchParams.get('templateId');
  const mes = searchParams.get('mes');
  const grupoId = searchParams.get('grupoId');
  const unidadeId = searchParams.get('unidadeId');

  if (!templateId || !mes) {
    return NextResponse.json(
      { error: 'validation_error', message: 'templateId e mes são obrigatórios' },
      { status: 422 }
    );
  }

  try {
    // Calcular período
    const [year, month] = mes.split('-').map(Number);
    const dataInicio = new Date(year, month - 1, 1);
    const dataFim = new Date(year, month, 0, 23, 59, 59, 999);

    // Buscar template
    const template = await prisma.checklistTemplate.findUnique({
      where: { id: templateId },
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
    });

    if (!template) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // Buscar respostas
    let unidadeIds: string[] = [];
    if (me.role === 'SUPERVISOR' || me.role === 'LAVAGEM') {
      const scope = await getSupervisorScope(me.id);
      unidadeIds = scope.unidadeIds;
    }

    const where: any = {
      templateId,
      status: ChecklistRespostaStatus.CONCLUIDO,
      submittedAt: {
        gte: dataInicio,
        lte: dataFim,
      },
    };

    if (unidadeId) {
      where.unidadeId = unidadeId;
    } else if (unidadeIds.length > 0) {
      where.unidadeId = { in: unidadeIds };
    }

    if (grupoId) {
      where.grupoId = grupoId;
    }

    const respostas = await prisma.checklistResposta.findMany({
      where,
      include: {
        unidade: { select: { id: true, nome: true } },
        grupo: { select: { id: true, nome: true } },
        supervisor: { select: { id: true, name: true, email: true } },
        respostas: {
          include: { pergunta: true },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    // Buscar informações da unidade se filtrada
    let unidadeNome = 'Todas as Unidades';
    if (unidadeId) {
      const unidade = await prisma.unidade.findUnique({
        where: { id: unidadeId },
        select: { nome: true },
      });
      if (unidade) {
        unidadeNome = unidade.nome;
      }
    }

    // Criar workbook Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'KL Facilities';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Estilos
    const headerStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, size: 11, color: { argb: 'FFFFFFFF' } },
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0066CC' },
      },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
      border: {
        top: { style: 'thin' as const },
        left: { style: 'thin' as const },
        bottom: { style: 'thin' as const },
        right: { style: 'thin' as const },
      },
    };

    const subHeaderStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, size: 10 },
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
      border: {
        top: { style: 'thin' as const },
        left: { style: 'thin' as const },
        bottom: { style: 'thin' as const },
        right: { style: 'thin' as const },
      },
    };

    const borderStyle: Partial<ExcelJS.Style> = {
      border: {
        top: { style: 'thin' as const },
        left: { style: 'thin' as const },
        bottom: { style: 'thin' as const },
        right: { style: 'thin' as const },
      },
    };

    // Planilha 1: Métricas
    const metricsSheet = workbook.addWorksheet('Métricas');
    
    // Título
    metricsSheet.mergeCells('A1:G1');
    metricsSheet.getCell('A1').value = template.titulo.toUpperCase();
    metricsSheet.getCell('A1').font = { bold: true, size: 14 };
    metricsSheet.getCell('A1').alignment = { horizontal: 'center' };

    metricsSheet.mergeCells('A2:G2');
    metricsSheet.getCell('A2').value = `RELATÓRIO MENSAL - ${format(dataInicio, "MMMM 'de' yyyy", { locale: ptBR }).toUpperCase()}`;
    metricsSheet.getCell('A2').font = { size: 12 };
    metricsSheet.getCell('A2').alignment = { horizontal: 'center' };

    metricsSheet.mergeCells('A3:G3');
    metricsSheet.getCell('A3').value = `Unidade: ${unidadeNome}`;
    metricsSheet.getCell('A3').font = { size: 10 };
    metricsSheet.getCell('A3').alignment = { horizontal: 'center' };

    // Cabeçalho da tabela de métricas
    const metricsHeaderRow = 5;
    metricsSheet.getRow(metricsHeaderRow).values = ['GRUPO', 'AP', 'PP', 'PR', 'NA', 'NC', 'NR'];
    metricsSheet.getRow(metricsHeaderRow).eachCell((cell, colNumber) => {
      cell.style = headerStyle;
    });

    // Calcular métricas por grupo
    const metricasPorGrupo: Array<{
      titulo: string;
      AP: number;
      PP: number;
      PR: number;
      NA: number;
      NC: number;
      NR: number;
    }> = [];

    for (const grupo of template.grupos) {
      let pontosPossiveis = 0;
      let pontosRealizados = 0;
      let naoAplicaveis = 0;
      let naoConformidades = 0;
      let naoRespondidas = 0;

      for (const pergunta of grupo.perguntas) {
        if (pergunta.peso) {
          pontosPossiveis += pergunta.peso;
        }

        let temResposta = false;
        for (const resposta of respostas) {
          const respostaPergunta = resposta.respostas.find(rp => rp.perguntaId === pergunta.id);
          if (respostaPergunta) {
            temResposta = true;
            if (respostaPergunta.nota !== null && respostaPergunta.nota !== undefined) {
              if (pergunta.peso) {
                pontosRealizados += respostaPergunta.nota * pergunta.peso;
              }
              if (respostaPergunta.nota < 3) {
                naoConformidades++;
              }
            } else {
              naoRespondidas++;
            }
          }
        }

        if (!temResposta) {
          naoRespondidas++;
        }
      }

      const aproveitamento = pontosPossiveis > 0 ? (pontosRealizados / pontosPossiveis) * 100 : 0;

      metricasPorGrupo.push({
        titulo: grupo.titulo,
        AP: aproveitamento,
        PP: pontosPossiveis,
        PR: pontosRealizados,
        NA: naoAplicaveis,
        NC: naoConformidades,
        NR: naoRespondidas,
      });
    }

    // Adicionar linhas de métricas
    let currentRow = metricsHeaderRow + 1;
    for (const metricas of metricasPorGrupo) {
      metricsSheet.getRow(currentRow).values = [
        metricas.titulo,
        metricas.PP > 0 ? `${metricas.AP.toFixed(2)}%` : '-',
        metricas.PP > 0 ? metricas.PP.toFixed(2) : '-',
        metricas.PP > 0 ? metricas.PR.toFixed(2) : '-',
        metricas.NA,
        metricas.NC,
        metricas.NR,
      ];
      metricsSheet.getRow(currentRow).eachCell((cell) => {
        cell.style = borderStyle;
      });
      currentRow++;
    }

    // Linha GERAL
    const geralPP = metricasPorGrupo.reduce((sum, m) => sum + m.PP, 0);
    const geralPR = metricasPorGrupo.reduce((sum, m) => sum + m.PR, 0);
    const geralNA = metricasPorGrupo.reduce((sum, m) => sum + m.NA, 0);
    const geralNC = metricasPorGrupo.reduce((sum, m) => sum + m.NC, 0);
    const geralNR = metricasPorGrupo.reduce((sum, m) => sum + m.NR, 0);
    const geralAP = geralPP > 0 ? (geralPR / geralPP) * 100 : 0;

    metricsSheet.getRow(currentRow).values = [
      'GERAL',
      geralPP > 0 ? `${geralAP.toFixed(2)}%` : '-',
      geralPP > 0 ? geralPP.toFixed(2) : '-',
      geralPP > 0 ? geralPR.toFixed(2) : '-',
      geralNA,
      geralNC,
      geralNR,
    ];
    metricsSheet.getRow(currentRow).eachCell((cell) => {
      cell.style = { ...borderStyle, font: { bold: true } };
    });

    // Ajustar larguras das colunas
    metricsSheet.getColumn(1).width = 40;
    metricsSheet.getColumn(2).width = 12;
    metricsSheet.getColumn(3).width = 12;
    metricsSheet.getColumn(4).width = 12;
    metricsSheet.getColumn(5).width = 10;
    metricsSheet.getColumn(6).width = 10;
    metricsSheet.getColumn(7).width = 10;

    // Legenda
    currentRow += 2;
    metricsSheet.mergeCells(`A${currentRow}:G${currentRow}`);
    metricsSheet.getCell(`A${currentRow}`).value = 'AP: Aproveitamento | PP: Pontos Possíveis | PR: Pontos Realizados | NA: Não Aplicáveis | NC: Não Conformidades | NR: Não Respondidas';
    metricsSheet.getCell(`A${currentRow}`).font = { size: 9, italic: true };
    metricsSheet.getCell(`A${currentRow}`).alignment = { horizontal: 'left' };

    // Planilha 2: Detalhamento por Pergunta
    const detailsSheet = workbook.addWorksheet('Detalhamento');

    // Título
    detailsSheet.mergeCells('A1:F1');
    detailsSheet.getCell('A1').value = template.titulo.toUpperCase();
    detailsSheet.getCell('A1').font = { bold: true, size: 14 };
    detailsSheet.getCell('A1').alignment = { horizontal: 'center' };

    detailsSheet.mergeCells('A2:F2');
    detailsSheet.getCell('A2').value = `RELATÓRIO MENSAL - ${format(dataInicio, "MMMM 'de' yyyy", { locale: ptBR }).toUpperCase()}`;
    detailsSheet.getCell('A2').font = { size: 12 };
    detailsSheet.getCell('A2').alignment = { horizontal: 'center' };

    // Cabeçalho
    const detailsHeaderRow = 4;
    detailsSheet.getRow(detailsHeaderRow).values = ['Grupo', 'Pergunta', 'Peso', 'Nota Média', 'Total Respostas', 'Distribuição (1-5)'];
    detailsSheet.getRow(detailsHeaderRow).eachCell((cell) => {
      cell.style = headerStyle;
    });

    // Adicionar perguntas
    let detailsRow = detailsHeaderRow + 1;
    for (const grupo of template.grupos) {
      for (const pergunta of grupo.perguntas) {
        // Calcular estatísticas da pergunta
        let somaNotas = 0;
        let contadorNotas = 0;
        const distribuicao: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

        for (const resposta of respostas) {
          const respostaPergunta = resposta.respostas.find(rp => rp.perguntaId === pergunta.id);
          if (respostaPergunta && respostaPergunta.nota !== null && respostaPergunta.nota !== undefined) {
            const nota = respostaPergunta.nota;
            somaNotas += nota;
            contadorNotas++;
            if (nota >= 1 && nota <= 5) {
              distribuicao[nota]++;
            }
          }
        }

        const notaMedia = contadorNotas > 0 ? somaNotas / contadorNotas : 0;
        const distribuicaoTexto = `${distribuicao[1]}/${distribuicao[2]}/${distribuicao[3]}/${distribuicao[4]}/${distribuicao[5]}`;

        detailsSheet.getRow(detailsRow).values = [
          grupo.titulo,
          pergunta.titulo,
          pergunta.peso || '-',
          contadorNotas > 0 ? notaMedia.toFixed(2) : '-',
          contadorNotas,
          distribuicaoTexto,
        ];
        detailsSheet.getRow(detailsRow).eachCell((cell) => {
          cell.style = borderStyle;
        });
        detailsRow++;
      }
    }

    // Ajustar larguras das colunas
    detailsSheet.getColumn(1).width = 25;
    detailsSheet.getColumn(2).width = 50;
    detailsSheet.getColumn(3).width = 10;
    detailsSheet.getColumn(4).width = 15;
    detailsSheet.getColumn(5).width = 15;
    detailsSheet.getColumn(6).width = 25;

    // Gerar buffer Excel
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="relatorio-mensal-${mes}-${unidadeNome.replace(/\s+/g, '-').toLowerCase()}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Erro ao gerar Excel:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Não foi possível gerar o Excel' },
      { status: 500 }
    );
  }
}


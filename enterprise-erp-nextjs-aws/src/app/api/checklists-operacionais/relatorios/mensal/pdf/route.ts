import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb, PDFPage } from 'pdf-lib';
import { ChecklistRespostaStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import { getSupervisorScope } from '@/lib/supervisor-scope';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import fs from 'fs';
import path from 'path';

// Função auxiliar para baixar e embedar imagem
async function embedImageFromUrl(pdfDoc: PDFDocument, imageUrl: string): Promise<any> {
  try {
    // Se for URL s3://, converter para URL assinada (não implementado por enquanto)
    if (imageUrl.startsWith('s3://')) {
      console.warn('URLs s3:// não suportadas diretamente, precisa converter para URL assinada');
      return null;
    }

    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });
    
    if (!response.ok) {
      console.warn(`Erro ao buscar imagem: ${response.status} ${response.statusText}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Tentar PNG primeiro
    try {
      return await pdfDoc.embedPng(buffer);
    } catch {
      // Tentar JPG
      try {
        return await pdfDoc.embedJpg(buffer);
      } catch {
        // Tentar JPEG como último recurso
        try {
          return await pdfDoc.embedJpg(buffer);
        } catch {
          console.warn('Formato de imagem não suportado:', imageUrl);
          return null;
        }
      }
    }
  } catch (error) {
    console.warn('Erro ao carregar imagem:', error);
    return null;
  }
}

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
  const orientacao = searchParams.get('orientacao') || 'vertical'; // vertical ou horizontal

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

    // Buscar respostas (mesma lógica da API de relatório)
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
        gerenteAssinadoPor: { select: { id: true, name: true, email: true } },
        respostas: {
          include: { pergunta: true },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    // Calcular estatísticas completas por seção
    let pontuacaoTotal = 0;
    let pesoTotal = 0;
    const porSecao: Record<string, {
      titulo: string;
      pontuacao: number;
      peso: number;
      totalPerguntas: number;
      perguntasComNota: number;
      distribuicaoNotas: { 1: number; 2: number; 3: number; 4: number; 5: number };
      somaNotas: number;
      contadorNotas: number;
    }> = {};

    for (const resposta of respostas) {
      for (const respostaPergunta of resposta.respostas) {
        const pergunta = respostaPergunta.pergunta;
        const grupoPergunta = template.grupos.find(g =>
          g.perguntas.some(p => p.id === pergunta.id)
        );
        
        if (!grupoPergunta) continue;

        if (!porSecao[grupoPergunta.id]) {
          porSecao[grupoPergunta.id] = {
            titulo: grupoPergunta.titulo,
            pontuacao: 0,
            peso: 0,
            totalPerguntas: grupoPergunta.perguntas.length,
            perguntasComNota: 0,
            distribuicaoNotas: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            somaNotas: 0,
            contadorNotas: 0,
          };
        }

        if (respostaPergunta.nota !== null && respostaPergunta.nota !== undefined) {
          const nota = respostaPergunta.nota;
          porSecao[grupoPergunta.id].perguntasComNota++;
          porSecao[grupoPergunta.id].somaNotas += nota;
          porSecao[grupoPergunta.id].contadorNotas++;

          // Distribuição de notas
          if (nota >= 1 && nota <= 5) {
            porSecao[grupoPergunta.id].distribuicaoNotas[nota as keyof typeof porSecao[string]['distribuicaoNotas']]++;
          }

          // Pontuação ponderada
          if (pergunta.peso) {
            const pontuacao = nota * pergunta.peso;
            pontuacaoTotal += pontuacao;
            pesoTotal += pergunta.peso;
            porSecao[grupoPergunta.id].pontuacao += pontuacao;
            porSecao[grupoPergunta.id].peso += pergunta.peso;
          }
        }
      }
    }

    const pontuacaoMedia = pesoTotal > 0 ? pontuacaoTotal / pesoTotal : 0;
    
    // Calcular feitos (respostas com nota >= 4)
    let feitos = 0;
    let totalAvaliacoes = 0;
    for (const resposta of respostas) {
      for (const respostaPergunta of resposta.respostas) {
        if (respostaPergunta.nota !== null && respostaPergunta.nota !== undefined) {
          totalAvaliacoes++;
          if (respostaPergunta.nota >= 4) {
            feitos++;
          }
        }
      }
    }
    const taxaFeitos = totalAvaliacoes > 0 ? (feitos / totalAvaliacoes) * 100 : 0;

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

    // Gerar PDF com pdf-lib
    const pdfDoc = await PDFDocument.create();
    // A4: vertical (595x842) ou horizontal (842x595)
    const pageSize: [number, number] = orientacao === 'horizontal' ? [842, 595] : [595, 842];
    const page = pdfDoc.addPage(pageSize);
    const { width, height } = page.getSize();
    const margin = 50;
    const maxWidth = width - 2 * margin;
    
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Carregar logo da KL
    let logoImage;
    try {
      const logoPath = path.join(process.cwd(), 'public', 'icon-192.png');
      if (fs.existsSync(logoPath)) {
        const logoBytes = fs.readFileSync(logoPath);
        // Tentar PNG primeiro, depois JPG se falhar
        try {
          logoImage = await pdfDoc.embedPng(logoBytes);
        } catch {
          try {
            logoImage = await pdfDoc.embedJpg(logoBytes);
          } catch {
            console.warn('Formato de imagem não suportado');
          }
        }
      }
    } catch (error) {
      console.warn('Não foi possível carregar o logo, usando texto:', error);
    }
    
    // Contar fotos (incluindo múltiplas fotos quando fotoUrl é JSON array)
    let totalFotos = 0;
    const fotosPorSecao: Record<string, string[]> = {};
    for (const resposta of respostas) {
      for (const respostaPergunta of resposta.respostas) {
        if (respostaPergunta.fotoUrl) {
          let fotos: string[] = [];
          
          // Verificar se fotoUrl é um JSON array (múltiplas fotos)
          try {
            const parsed = JSON.parse(respostaPergunta.fotoUrl);
            if (Array.isArray(parsed)) {
              fotos = parsed;
            } else {
              fotos = [respostaPergunta.fotoUrl];
            }
          } catch {
            // Se não for JSON, é uma única foto
            fotos = [respostaPergunta.fotoUrl];
          }
          
          totalFotos += fotos.length;
          const pergunta = respostaPergunta.pergunta;
          const grupoPergunta = template.grupos.find(g =>
            g.perguntas.some(p => p.id === pergunta.id)
          );
          if (grupoPergunta) {
            if (!fotosPorSecao[grupoPergunta.id]) {
              fotosPorSecao[grupoPergunta.id] = [];
            }
            fotosPorSecao[grupoPergunta.id].push(...fotos);
          }
        }
      }
    }

    let yPos = height - margin;
    let currentPage = page;
    
    // Cabeçalho sem fundo colorido
    const headerColor = rgb(0, 0.62, 0.89); // Azul KL
    
    // Logo da KL no cabeçalho
    if (logoImage) {
      const logoSize = 50;
      const logoWidth = (logoImage.width / logoImage.height) * logoSize;
      currentPage.drawImage(logoImage, {
        x: margin,
        y: yPos - logoSize,
        width: logoWidth,
        height: logoSize,
      });
    }
    
    // Título no cabeçalho
    const tituloX = logoImage ? margin + 70 : margin;
    currentPage.drawText(template.titulo.toUpperCase(), {
      x: tituloX,
      y: yPos - 20,
      size: 24,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0), // Preto
    });
    
    currentPage.drawText('RELATÓRIO MENSAL', {
      x: tituloX,
      y: yPos - 45,
      size: 12,
      font: helveticaFont,
      color: rgb(0.5, 0.5, 0.5), // Cinza
    });
    
    // Data no canto direito do cabeçalho
    const dataTexto = format(dataInicio, "dd/MM/yyyy", { locale: ptBR });
    const dataWidth = helveticaFont.widthOfTextAtSize(dataTexto, 12);
    currentPage.drawText(dataTexto, {
      x: width - margin - dataWidth,
      y: yPos - 20,
      size: 12,
      font: helveticaFont,
      color: rgb(0.5, 0.5, 0.5),
    });
    
    yPos -= 70;
    
    // Informações da unidade em cards
    const cardHeight = 60;
    const cardY = yPos - cardHeight;
    
    // Card Unidade
    currentPage.drawRectangle({
      x: margin,
      y: cardY,
      width: (width - 2 * margin - 20) / 2,
      height: cardHeight,
      borderColor: rgb(0.9, 0.9, 0.9),
      borderWidth: 1,
    });
    
    currentPage.drawText('Unidade', {
      x: margin + 10,
      y: cardY + cardHeight - 20,
      size: 9,
      font: helveticaFont,
      color: rgb(0.5, 0.5, 0.5),
    });
    
    currentPage.drawText(unidadeNome, {
      x: margin + 10,
      y: cardY + 10,
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });
    
    // Card Total de Respostas
    const card2X = margin + (width - 2 * margin - 20) / 2 + 20;
    currentPage.drawRectangle({
      x: card2X,
      y: cardY,
      width: (width - 2 * margin - 20) / 2,
      height: cardHeight,
      borderColor: rgb(0.9, 0.9, 0.9),
      borderWidth: 1,
    });
    
    currentPage.drawText('Total de Respostas', {
      x: card2X + 10,
      y: cardY + cardHeight - 20,
      size: 9,
      font: helveticaFont,
      color: rgb(0.5, 0.5, 0.5),
    });
    
    currentPage.drawText(String(respostas.length), {
      x: card2X + 10,
      y: cardY + 10,
      size: 20,
      font: helveticaBoldFont,
      color: headerColor,
    });
    
    yPos = cardY - 30;
    
    // Cards de métricas principais em grid
    const metricCardWidth = (width - 2 * margin - 20) / 3;
    const metricCardHeight = 80;
    const metricCardY = yPos - metricCardHeight;
    const metricCards = [
      { label: 'Pontuação Média', value: pontuacaoMedia.toFixed(2), color: headerColor },
      { label: 'Feitos', value: `${taxaFeitos.toFixed(1)}%`, color: taxaFeitos >= 80 ? rgb(0.13, 0.59, 0.13) : taxaFeitos >= 60 ? rgb(1, 0.84, 0) : rgb(0.96, 0.26, 0.21) },
      { label: 'Fotos', value: String(totalFotos), color: rgb(0.58, 0.29, 0.78) },
    ];

    metricCards.forEach((card, index) => {
      const cardX = margin + index * (metricCardWidth + 10);
      currentPage.drawRectangle({
        x: cardX,
        y: metricCardY,
        width: metricCardWidth,
        height: metricCardHeight,
        borderColor: rgb(0.9, 0.9, 0.9),
        borderWidth: 1,
        color: rgb(0.98, 0.98, 0.98),
      });

      currentPage.drawText(card.label, {
        x: cardX + 10,
        y: metricCardY + metricCardHeight - 20,
        size: 9,
        font: helveticaFont,
        color: rgb(0.5, 0.5, 0.5),
      });

      currentPage.drawText(card.value, {
        x: cardX + 10,
        y: metricCardY + 25,
        size: 20,
        font: helveticaBoldFont,
        color: card.color,
      });
    });

    yPos = metricCardY - 30;
    
    // Função para obter cor da nota
    const getNotaColor = (nota: number) => {
      if (nota >= 4.5) return rgb(0.27, 0.76, 0.31); // Verde claro (5)
      if (nota >= 3.5) return rgb(0.13, 0.59, 0.13); // Verde (4)
      if (nota >= 2.5) return rgb(1, 0.84, 0); // Amarelo (3)
      if (nota >= 1.5) return rgb(1, 0.65, 0); // Laranja (2)
      return rgb(0.96, 0.26, 0.21); // Vermelho (1)
    };

    const getNotaLabel = (nota: number) => {
      if (nota >= 4.5) return 'Ótimo';
      if (nota >= 3.5) return 'Bom';
      if (nota >= 2.5) return 'Regular';
      if (nota >= 1.5) return 'Ruim';
      return 'Péssimo';
    };
    
    // Calcular métricas por grupo (AP, PP, PR, NA, NC, NR) estilo Moki
    const metricasPorGrupo: Record<string, {
      titulo: string;
      AP: number; // Aproveitamento (%)
      PP: number; // Pontos Possíveis
      PR: number; // Pontos Realizados
      NA: number; // Não Aplicáveis
      NC: number; // Não Conformidades (nota < 3)
      NR: number; // Não Respondidas
    }> = {};

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

        // Contar respostas para esta pergunta
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

      metricasPorGrupo[grupo.id] = {
        titulo: grupo.titulo,
        AP: aproveitamento,
        PP: pontosPossiveis,
        PR: pontosRealizados,
        NA: naoAplicaveis,
        NC: naoConformidades,
        NR: naoRespondidas,
      };
    }

    // Calcular métricas gerais
    let geralAP = 0;
    let geralPP = 0;
    let geralPR = 0;
    let geralNA = 0;
    let geralNC = 0;
    let geralNR = 0;

    for (const metricas of Object.values(metricasPorGrupo)) {
      geralPP += metricas.PP;
      geralPR += metricas.PR;
      geralNA += metricas.NA;
      geralNC += metricas.NC;
      geralNR += metricas.NR;
    }
    geralAP = geralPP > 0 ? (geralPR / geralPP) * 100 : 0;

    // Tabela de Métricas por Grupo (estilo Moki)
    currentPage.drawText('Métricas', {
      x: margin,
      y: yPos,
      size: 14,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });
    
    yPos -= 25;

    const metricTableCols = {
      grupo: margin,
      AP: margin + 120,
      PP: margin + 180,
      PR: margin + 230,
      NA: margin + 280,
      NC: margin + 330,
      NR: margin + 380,
    };
    const metricRowHeight = 22;

    // Cabeçalho da tabela de métricas
    const metricHeaderY = yPos;
    currentPage.drawRectangle({
      x: margin,
      y: metricHeaderY - metricRowHeight,
      width: width - 2 * margin,
      height: metricRowHeight,
      color: rgb(0.9, 0.9, 0.9),
    });

    // Linhas do cabeçalho
    currentPage.drawLine({
      start: { x: margin, y: metricHeaderY },
      end: { x: width - margin, y: metricHeaderY },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    currentPage.drawLine({
      start: { x: margin, y: metricHeaderY - metricRowHeight },
      end: { x: width - margin, y: metricHeaderY - metricRowHeight },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // Textos do cabeçalho
    const metricHeaders = [
      { text: 'GRUPO', x: metricTableCols.grupo + 5 },
      { text: 'AP', x: metricTableCols.AP + 5 },
      { text: 'PP', x: metricTableCols.PP + 5 },
      { text: 'PR', x: metricTableCols.PR + 5 },
      { text: 'NA', x: metricTableCols.NA + 5 },
      { text: 'NC', x: metricTableCols.NC + 5 },
      { text: 'NR', x: metricTableCols.NR + 5 },
    ];

    metricHeaders.forEach(header => {
      currentPage.drawText(header.text, {
        x: header.x,
        y: metricHeaderY - 16,
        size: 9,
        font: helveticaBoldFont,
        color: rgb(0, 0, 0),
      });
    });

    // Linhas verticais do cabeçalho
    const metricVerticalLines = Object.values(metricTableCols).slice(1);
    for (const lineX of metricVerticalLines) {
      currentPage.drawLine({
        start: { x: lineX, y: metricHeaderY },
        end: { x: lineX, y: metricHeaderY - metricRowHeight },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7),
      });
    }

    yPos = metricHeaderY - metricRowHeight - 5;

    // Linhas dos grupos
    for (const [grupoId, metricas] of Object.entries(metricasPorGrupo)) {
      // Verificar se precisa criar nova página
      if (yPos < margin + 60) {
        currentPage = pdfDoc.addPage(pageSize);
        yPos = height - margin - metricRowHeight - 5;
        
        // Redesenhar cabeçalho na nova página
        currentPage.drawRectangle({
          x: margin,
          y: yPos + metricRowHeight,
          width: width - 2 * margin,
          height: metricRowHeight,
          color: rgb(0.9, 0.9, 0.9),
        });
        currentPage.drawLine({
          start: { x: margin, y: yPos + metricRowHeight * 2 },
          end: { x: width - margin, y: yPos + metricRowHeight * 2 },
          thickness: 1,
          color: rgb(0, 0, 0),
        });
        currentPage.drawLine({
          start: { x: margin, y: yPos + metricRowHeight },
          end: { x: width - margin, y: yPos + metricRowHeight },
          thickness: 1,
          color: rgb(0, 0, 0),
        });
        
        metricHeaders.forEach(header => {
          currentPage.drawText(header.text, {
            x: header.x,
            y: yPos + metricRowHeight + 6,
            size: 9,
            font: helveticaBoldFont,
            color: rgb(0, 0, 0),
          });
        });
        
        for (const lineX of metricVerticalLines) {
          currentPage.drawLine({
            start: { x: lineX, y: yPos + metricRowHeight * 2 },
            end: { x: lineX, y: yPos + metricRowHeight },
            thickness: 0.5,
            color: rgb(0.7, 0.7, 0.7),
          });
        }
        
        yPos -= 5;
      }

      // Linha horizontal separadora
      currentPage.drawLine({
        start: { x: margin, y: yPos },
        end: { x: width - margin, y: yPos },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8),
      });

      yPos -= metricRowHeight;

      // Nome do grupo (truncar se muito longo)
      const grupoNome = metricas.titulo.length > 20 ? metricas.titulo.substring(0, 17) + '...' : metricas.titulo;
      currentPage.drawText(grupoNome, {
        x: metricTableCols.grupo + 5,
        y: yPos + 5,
        size: 8,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });

      // Valores das métricas
      currentPage.drawText(metricas.PP > 0 ? `${metricas.AP.toFixed(2)}%` : '-', {
        x: metricTableCols.AP + 5,
        y: yPos + 5,
        size: 8,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });

      currentPage.drawText(metricas.PP > 0 ? metricas.PP.toFixed(2) : '-', {
        x: metricTableCols.PP + 5,
        y: yPos + 5,
        size: 8,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });

      currentPage.drawText(metricas.PP > 0 ? metricas.PR.toFixed(2) : '-', {
        x: metricTableCols.PR + 5,
        y: yPos + 5,
        size: 8,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });

      currentPage.drawText(String(metricas.NA), {
        x: metricTableCols.NA + 5,
        y: yPos + 5,
        size: 8,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });

      currentPage.drawText(String(metricas.NC), {
        x: metricTableCols.NC + 5,
        y: yPos + 5,
        size: 8,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });

      currentPage.drawText(String(metricas.NR), {
        x: metricTableCols.NR + 5,
        y: yPos + 5,
        size: 8,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });

      // Linhas verticais
      for (const lineX of metricVerticalLines) {
        currentPage.drawLine({
          start: { x: lineX, y: yPos + metricRowHeight },
          end: { x: lineX, y: yPos },
          thickness: 0.5,
          color: rgb(0.7, 0.7, 0.7),
        });
      }
    }

    // Linha GERAL
    yPos -= 5;
    currentPage.drawLine({
      start: { x: margin, y: yPos },
      end: { x: width - margin, y: yPos },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    yPos -= metricRowHeight;

    currentPage.drawText('GERAL', {
      x: metricTableCols.grupo + 5,
      y: yPos + 5,
      size: 9,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });

    currentPage.drawText(geralPP > 0 ? `${geralAP.toFixed(2)}%` : '-', {
      x: metricTableCols.AP + 5,
      y: yPos + 5,
      size: 9,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });

    currentPage.drawText(geralPP > 0 ? geralPP.toFixed(2) : '-', {
      x: metricTableCols.PP + 5,
      y: yPos + 5,
      size: 9,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });

    currentPage.drawText(geralPP > 0 ? geralPR.toFixed(2) : '-', {
      x: metricTableCols.PR + 5,
      y: yPos + 5,
      size: 9,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });

    currentPage.drawText(String(geralNA), {
      x: metricTableCols.NA + 5,
      y: yPos + 5,
      size: 9,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });

    currentPage.drawText(String(geralNC), {
      x: metricTableCols.NC + 5,
      y: yPos + 5,
      size: 9,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });

    currentPage.drawText(String(geralNR), {
      x: metricTableCols.NR + 5,
      y: yPos + 5,
      size: 9,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });

    // Linha final da tabela de métricas
    currentPage.drawLine({
      start: { x: margin, y: yPos },
      end: { x: width - margin, y: yPos },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    yPos -= 20;

    // Legenda
    currentPage.drawText('AP: Aproveitamento | PP: Pontos Possíveis | PR: Pontos Realizados | NA: Não Aplicáveis | NC: Não Conformidades | NR: Não Respondidas', {
      x: margin,
      y: yPos,
      size: 7,
      font: helveticaFont,
      color: rgb(0.5, 0.5, 0.5),
    });

    yPos -= 25;
    
    // Por Seção - Tabela estilo Excel
    currentPage.drawText('Pontuação por Seção', {
      x: margin,
      y: yPos,
      size: 14,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });
    
    yPos -= 25;

    // Definir larguras das colunas
    const colSecao = margin;
    const colMedia = margin + 200;
    const colAvaliadas = margin + 280;
    const colDist1 = margin + 360;
    const colDist2 = margin + 400;
    const colDist3 = margin + 440;
    const colDist4 = margin + 480;
    const colDist5 = margin + 520;
    const rowHeight = 25;
    const headerY = yPos;

    // Cabeçalho da tabela com fundo cinza
    currentPage.drawRectangle({
      x: margin,
      y: headerY - rowHeight,
      width: width - 2 * margin,
      height: rowHeight,
      color: rgb(0.9, 0.9, 0.9),
    });

    // Linhas do cabeçalho
    currentPage.drawLine({
      start: { x: margin, y: headerY },
      end: { x: width - margin, y: headerY },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    currentPage.drawLine({
      start: { x: margin, y: headerY - rowHeight },
      end: { x: width - margin, y: headerY - rowHeight },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // Textos do cabeçalho
    currentPage.drawText('Seção', {
      x: colSecao + 5,
      y: headerY - 18,
      size: 10,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });

    currentPage.drawText('Média', {
      x: colMedia + 5,
      y: headerY - 18,
      size: 10,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });

    currentPage.drawText('Aval.', {
      x: colAvaliadas + 5,
      y: headerY - 18,
      size: 10,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });

    currentPage.drawText('1', {
      x: colDist1 + 5,
      y: headerY - 18,
      size: 9,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });

    currentPage.drawText('2', {
      x: colDist2 + 5,
      y: headerY - 18,
      size: 9,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });

    currentPage.drawText('3', {
      x: colDist3 + 5,
      y: headerY - 18,
      size: 9,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });

    currentPage.drawText('4', {
      x: colDist4 + 5,
      y: headerY - 18,
      size: 9,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });

    currentPage.drawText('5', {
      x: colDist5 + 5,
      y: headerY - 18,
      size: 9,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });

    yPos = headerY - rowHeight - 5;

    // Linhas verticais do cabeçalho
    const verticalLines = [colMedia, colAvaliadas, colDist1, colDist2, colDist3, colDist4, colDist5];
    for (const lineX of verticalLines) {
      currentPage.drawLine({
        start: { x: lineX, y: headerY },
        end: { x: lineX, y: headerY - rowHeight },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7),
      });
    }

    // Linhas das seções
    for (const [secaoId, dados] of Object.entries(porSecao)) {
      // Verificar se precisa criar nova página
      if (yPos < margin + 60) {
        currentPage = pdfDoc.addPage(pageSize);
        yPos = height - margin - rowHeight - 5;
        
        // Redesenhar cabeçalho na nova página
        currentPage.drawRectangle({
          x: margin,
          y: yPos + rowHeight,
          width: width - 2 * margin,
          height: rowHeight,
          color: rgb(0.9, 0.9, 0.9),
        });
        currentPage.drawLine({
          start: { x: margin, y: yPos + rowHeight * 2 },
          end: { x: width - margin, y: yPos + rowHeight * 2 },
          thickness: 1,
          color: rgb(0, 0, 0),
        });
        currentPage.drawLine({
          start: { x: margin, y: yPos + rowHeight },
          end: { x: width - margin, y: yPos + rowHeight },
          thickness: 1,
          color: rgb(0, 0, 0),
        });
        
        // Textos do cabeçalho
        currentPage.drawText('Seção', { x: colSecao + 5, y: yPos + rowHeight + 12, size: 10, font: helveticaBoldFont, color: rgb(0, 0, 0) });
        currentPage.drawText('Média', { x: colMedia + 5, y: yPos + rowHeight + 12, size: 10, font: helveticaBoldFont, color: rgb(0, 0, 0) });
        currentPage.drawText('Aval.', { x: colAvaliadas + 5, y: yPos + rowHeight + 12, size: 10, font: helveticaBoldFont, color: rgb(0, 0, 0) });
        currentPage.drawText('1', { x: colDist1 + 5, y: yPos + rowHeight + 12, size: 9, font: helveticaBoldFont, color: rgb(0, 0, 0) });
        currentPage.drawText('2', { x: colDist2 + 5, y: yPos + rowHeight + 12, size: 9, font: helveticaBoldFont, color: rgb(0, 0, 0) });
        currentPage.drawText('3', { x: colDist3 + 5, y: yPos + rowHeight + 12, size: 9, font: helveticaBoldFont, color: rgb(0, 0, 0) });
        currentPage.drawText('4', { x: colDist4 + 5, y: yPos + rowHeight + 12, size: 9, font: helveticaBoldFont, color: rgb(0, 0, 0) });
        currentPage.drawText('5', { x: colDist5 + 5, y: yPos + rowHeight + 12, size: 9, font: helveticaBoldFont, color: rgb(0, 0, 0) });
        
        // Linhas verticais
        for (const lineX of verticalLines) {
          currentPage.drawLine({
            start: { x: lineX, y: yPos + rowHeight * 2 },
            end: { x: lineX, y: yPos + rowHeight },
            thickness: 0.5,
            color: rgb(0.7, 0.7, 0.7),
          });
        }
        
        yPos -= 5;
      }

      const media = dados.peso > 0 ? dados.pontuacao / dados.peso : 0;
      const mediaNota = dados.contadorNotas > 0 ? dados.somaNotas / dados.contadorNotas : 0;
      const totalDistribuicao = dados.distribuicaoNotas[1] + dados.distribuicaoNotas[2] + 
                                 dados.distribuicaoNotas[3] + dados.distribuicaoNotas[4] + 
                                 dados.distribuicaoNotas[5];

      // Linha horizontal separadora
      currentPage.drawLine({
        start: { x: margin, y: yPos },
        end: { x: width - margin, y: yPos },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8),
      });

      yPos -= rowHeight;

      // Nome da seção (truncar se muito longo)
      const secaoNome = dados.titulo.length > 25 ? dados.titulo.substring(0, 22) + '...' : dados.titulo;
      currentPage.drawText(secaoNome, {
        x: colSecao + 5,
        y: yPos + 5,
        size: 9,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });

      // Média com círculo colorido
      const notaColor = getNotaColor(mediaNota);
      const mediaTexto = mediaNota > 0 ? `${mediaNota.toFixed(2)}` : '-';
      
      if (mediaNota > 0) {
        // Desenhar círculo usando ellipse (raio igual em x e y)
        currentPage.drawEllipse({
          x: colMedia + 12,
          y: yPos + 8,
          xScale: 4,
          yScale: 4,
          color: notaColor,
        });
      }
      
      currentPage.drawText(mediaTexto, {
        x: colMedia + 20,
        y: yPos + 5,
        size: 9,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });

      // Perguntas avaliadas
      currentPage.drawText(`${dados.perguntasComNota}/${dados.totalPerguntas}`, {
        x: colAvaliadas + 5,
        y: yPos + 5,
        size: 9,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });

      // Distribuição de notas
      const notaColors = [
        rgb(0.96, 0.26, 0.21), // Vermelho (1)
        rgb(1, 0.65, 0), // Laranja (2)
        rgb(1, 0.84, 0), // Amarelo (3)
        rgb(0.13, 0.59, 0.13), // Verde (4)
        rgb(0.27, 0.76, 0.31), // Verde claro (5)
      ];

      const distCols = [colDist1, colDist2, colDist3, colDist4, colDist5];
      for (let i = 0; i < 5; i++) {
        const nota = i + 1;
        const quantidade = dados.distribuicaoNotas[nota as keyof typeof dados.distribuicaoNotas];

        // Só desenhar círculo e valor se houver quantidade > 0
        if (quantidade > 0) {
          // Círculo colorido usando ellipse
          currentPage.drawEllipse({
            x: distCols[i] + 8,
            y: yPos + 8,
            xScale: 3,
            yScale: 3,
            color: notaColors[i],
          });

          // Quantidade
          currentPage.drawText(String(quantidade), {
            x: distCols[i] + 15,
            y: yPos + 5,
            size: 8,
            font: helveticaFont,
            color: rgb(0, 0, 0),
          });
        } else {
          // Mostrar apenas "-" quando não há quantidade
          currentPage.drawText('-', {
            x: distCols[i] + 15,
            y: yPos + 5,
            size: 8,
            font: helveticaFont,
            color: rgb(0.5, 0.5, 0.5),
          });
        }
      }

      // Linhas verticais
      for (const lineX of verticalLines) {
        currentPage.drawLine({
          start: { x: lineX, y: yPos + rowHeight },
          end: { x: lineX, y: yPos },
          thickness: 0.5,
          color: rgb(0.7, 0.7, 0.7),
        });
      }

      // Adicionar fotos da seção se houver (após a linha da tabela)
      if (fotosPorSecao[secaoId] && fotosPorSecao[secaoId].length > 0) {
        yPos -= 20;
        yPos -= 15;
        currentPage.drawText('Fotos:', {
          x: margin + 30,
          y: yPos,
          size: 9,
          font: helveticaBoldFont,
          color: rgb(0.5, 0.5, 0.5),
        });
        yPos -= 15;

        // Mostrar todas as fotos da seção
        const fotosSecao = fotosPorSecao[secaoId];
        const fotoSize = 70; // Tamanho adequado para visualização
        const fotosPerRow = orientacao === 'horizontal' ? 4 : 2;
        let fotoX = margin + 30;
        let fotoY = yPos - fotoSize;

        for (let i = 0; i < fotosSecao.length; i++) {
          if (i > 0 && i % fotosPerRow === 0) {
            fotoX = margin + 30;
            fotoY -= fotoSize + 10;
            // Verificar se precisa criar nova página para fotos
            if (fotoY < margin + 80) {
              currentPage = pdfDoc.addPage(pageSize);
              fotoY = height - margin - fotoSize;
              fotoX = margin + 30;
            }
          }

          try {
            const fotoImage = await embedImageFromUrl(pdfDoc, fotosSecao[i]);
            if (fotoImage) {
              const fotoWidth = (fotoImage.width / fotoImage.height) * fotoSize;
              currentPage.drawImage(fotoImage, {
                x: fotoX,
                y: fotoY,
                width: fotoWidth,
                height: fotoSize,
              });
              fotoX += fotoWidth + 10;
            }
          } catch (error) {
            console.warn('Erro ao carregar foto:', error);
          }
        }

        yPos = fotoY - 20;
      }
    }

    // Linha final da tabela
    currentPage.drawLine({
      start: { x: margin, y: yPos },
      end: { x: width - margin, y: yPos },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    yPos -= 15;

    // Adicionar nova página para assinatura se necessário
    if (yPos < margin + 150) {
      currentPage = pdfDoc.addPage(pageSize);
      yPos = height - margin;
    }

    yPos -= 30;

    // Linha separadora antes da assinatura
    currentPage.drawLine({
      start: { x: margin, y: yPos },
      end: { x: width - margin, y: yPos },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });

    yPos -= 40;

    // Seção de Assinatura
    currentPage.drawText('ASSINATURAS', {
      x: margin,
      y: yPos,
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });

    yPos -= 30;

    // Pegar primeira resposta para obter assinaturas
    const primeiraResposta = respostas.length > 0 ? respostas[0] : null;
    const assinaturaSupervisorUrl = primeiraResposta?.assinaturaFotoUrl;
    const supervisor = primeiraResposta?.supervisor;
    const assinaturaGerenteUrl = primeiraResposta?.gerenteAssinaturaFotoUrl;
    const gerente = primeiraResposta?.gerenteAssinadoPor;

    // Linha para assinatura
    const signatureLineWidth = width - 2 * margin;
    const signatureHeight = 60; // Altura para foto de assinatura
    
    // Assinatura do Supervisor
    currentPage.drawText('Supervisor', {
      x: margin,
      y: yPos,
      size: 10,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });

    yPos -= 15;

    // Foto de assinatura do supervisor
    if (assinaturaSupervisorUrl) {
      try {
        const supervisorImage = await embedImageFromUrl(pdfDoc, assinaturaSupervisorUrl);
        if (supervisorImage) {
          const imgWidth = Math.min(signatureLineWidth - 10, (supervisorImage.width / supervisorImage.height) * signatureHeight);
          const imgHeight = (supervisorImage.height / supervisorImage.width) * imgWidth;
          currentPage.drawImage(supervisorImage, {
            x: margin,
            y: yPos - imgHeight,
            width: imgWidth,
            height: imgHeight,
          });
        }
      } catch (error) {
        console.warn('Erro ao carregar foto de assinatura do supervisor:', error);
      }
    }

    // Linha para assinatura do supervisor
    currentPage.drawLine({
      start: { x: margin, y: yPos - signatureHeight - 5 },
      end: { x: margin + signatureLineWidth, y: yPos - signatureHeight - 5 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // Nome do supervisor
    if (supervisor) {
      currentPage.drawText(supervisor.name, {
        x: margin,
        y: yPos - signatureHeight - 20,
        size: 9,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
    }

    yPos -= signatureHeight + 40;

    // Assinatura do Gerente
    currentPage.drawText('Gerente', {
      x: margin,
      y: yPos,
      size: 10,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });

    yPos -= 15;

    // Foto de assinatura do gerente
    if (assinaturaGerenteUrl) {
      try {
        const gerenteImage = await embedImageFromUrl(pdfDoc, assinaturaGerenteUrl);
        if (gerenteImage) {
          const imgWidth = Math.min(signatureLineWidth - 10, (gerenteImage.width / gerenteImage.height) * signatureHeight);
          const imgHeight = (gerenteImage.height / gerenteImage.width) * imgWidth;
          currentPage.drawImage(gerenteImage, {
            x: margin,
            y: yPos - imgHeight,
            width: imgWidth,
            height: imgHeight,
          });
        }
      } catch (error) {
        console.warn('Erro ao carregar foto de assinatura do gerente:', error);
      }
    }

    // Linha para assinatura do gerente
    currentPage.drawLine({
      start: { x: margin, y: yPos - signatureHeight - 5 },
      end: { x: margin + signatureLineWidth, y: yPos - signatureHeight - 5 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // Nome do gerente
    if (gerente) {
      currentPage.drawText(gerente.name, {
        x: margin,
        y: yPos - signatureHeight - 20,
        size: 9,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
    }

    yPos -= signatureHeight + 50;

    // Rodapé com informações
    const footerY = margin;
    currentPage.drawRectangle({
      x: 0,
      y: 0,
      width: width,
      height: 40,
      color: rgb(0.95, 0.95, 0.95),
    });

    const dataGeracao = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    currentPage.drawText(`Gerado em: ${dataGeracao}`, {
      x: margin,
      y: footerY + 15,
      size: 8,
      font: helveticaFont,
      color: rgb(0.5, 0.5, 0.5),
    });

    currentPage.drawText('KL Facilities - Sistema de Gestão', {
      x: width - margin - 150,
      y: footerY + 15,
      size: 8,
      font: helveticaFont,
      color: rgb(0.5, 0.5, 0.5),
    });
    
    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="relatorio-mensal-${mes}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Não foi possível gerar o PDF' },
      { status: 500 }
    );
  }
}

